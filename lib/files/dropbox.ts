import { config } from "@/lib/config";
import { promises as fs } from "fs";
import path from "path";

export interface JobFile { name: string; content: Buffer | string; }

/**
 * Upload the per-job package to /WrapJobs/{date}-{lastname}-{jobid}/.
 * Fallback: output/jobs/{jobId}/ locally. Never throws to the user flow.
 */
export async function deliverJob(
  jobId: string, lastName: string, files: JobFile[],
): Promise<{ location: "dropbox" | "local"; path: string }> {
  const date = new Date().toISOString().slice(0, 10);
  const safe = (lastName || "lead").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "lead";
  const folder = `/WrapJobs/${date}-${safe}-${jobId}`;

  if (config.dropboxToken) {
    try {
      for (const f of files) {
        const buf = typeof f.content === "string" ? Buffer.from(f.content, "utf8") : f.content;
        const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.dropboxToken}`,
            "Dropbox-API-Arg": JSON.stringify({
              path: `${folder}/${f.name}`, mode: "add", autorename: true, mute: true,
            }),
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(buf),
        });
        if (!res.ok) throw new Error(`Dropbox ${res.status}: ${await res.text()}`);
      }
      return { location: "dropbox", path: folder };
    } catch (e) {
      console.warn("[files] Dropbox failed, falling back to local:", e);
    }
  }

  const local = path.join(process.cwd(), "output", "jobs", `${date}-${safe}-${jobId}`);
  await fs.mkdir(local, { recursive: true });
  for (const f of files) {
    const buf = typeof f.content === "string" ? Buffer.from(f.content, "utf8") : f.content;
    await fs.writeFile(path.join(local, f.name), buf);
  }
  return { location: "local", path: local };
}
