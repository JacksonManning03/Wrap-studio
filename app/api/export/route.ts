import { NextRequest, NextResponse } from "next/server";
import { buildIllustratorSVG } from "@/lib/export/illustrator";
import { deliverJob, type JobFile } from "@/lib/files/dropbox";
import { uid, type FlatDesign, type Vehicle } from "@/lib/design/model";

export const runtime = "nodejs";
export const maxDuration = 60;

function dataUrlToBuffer(u: string): { buf: Buffer; ext: string } | null {
  const m = u.match(/^data:image\/(png|jpeg|svg\+xml);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1] === "svg+xml" ? "svg" : m[1] === "jpeg" ? "jpg" : "png";
  return { buf: Buffer.from(m[2], "base64"), ext };
}

export async function POST(req: NextRequest) {
  try {
    const { design, vehicle, price, coverageLabel, contact, mockups } = (await req.json()) as {
      design: FlatDesign; vehicle: Vehicle; price: number; coverageLabel: string;
      contact?: { name: string; email: string; phone: string };
      mockups?: string[];
    };
    if (!design || !vehicle) {
      return NextResponse.json({ error: "design and vehicle are required" }, { status: 400 });
    }
    const jobId = uid("job");
    const vectorSvg = buildIllustratorSVG(design, vehicle);
    const job = {
      jobId,
      createdAt: new Date().toISOString(),
      contact: contact || null,
      vehicle,
      design: { ...design, branding: { ...design.branding, logoDataUrl: design.branding.logoDataUrl ? "(embedded in vector file)" : undefined } },
      price, coverageLabel,
      material: design.material, finish: design.finish,
    };
    const files: JobFile[] = [
      { name: `wrap-${jobId}-EDITABLE.svg`, content: vectorSvg },
      { name: "job.json", content: JSON.stringify(job, null, 2) },
    ];
    (mockups || []).slice(0, 4).forEach((m, i) => {
      const d = dataUrlToBuffer(m);
      if (d) files.push({ name: `mockup-${i + 1}.${d.ext}`, content: d.buf });
    });
    const lastName = contact?.name?.trim().split(/\s+/).slice(-1)[0] || "lead";
    const delivered = await deliverJob(jobId, lastName, files);
    const vectorDataUrl = `data:image/svg+xml;base64,${Buffer.from(vectorSvg, "utf8").toString("base64")}`;
    return NextResponse.json({ ok: true, jobId, ...delivered, vectorDataUrl });
  } catch (e) {
    console.error("[api/export]", e);
    return NextResponse.json({ error: "Export failed — please try again." }, { status: 500 });
  }
}
