import { config } from "@/lib/config";
import { promises as fs } from "fs";
import path from "path";

export interface LeadPayload {
  name: string;
  email: string;
  phone: string;
  jobSummary: Record<string, unknown>;
}

const LOCAL_LEADS = path.join(process.cwd(), "data", "leads.local.json");

async function appendLocal(lead: LeadPayload) {
  let arr: unknown[] = [];
  try { arr = JSON.parse(await fs.readFile(LOCAL_LEADS, "utf8")); } catch {}
  arr.push({ ...lead, capturedAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(LOCAL_LEADS), { recursive: true });
  await fs.writeFile(LOCAL_LEADS, JSON.stringify(arr, null, 2));
}

/**
 * Create a GHL lead. Primary: inbound webhook. Secondary: API v2 create-contact.
 * Fallback: data/leads.local.json. NEVER throws to the user flow.
 */
export async function captureLead(lead: LeadPayload): Promise<{ channel: string }> {
  const [first, ...rest] = lead.name.trim().split(/\s+/);
  const body = {
    firstName: first || lead.name,
    lastName: rest.join(" "),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: "Wrap Studio",
    ...lead.jobSummary,
  };

  if (config.ghlWebhookUrl) {
    try {
      const res = await fetch(config.ghlWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return { channel: "ghl-webhook" };
      console.warn("[leads] GHL webhook returned", res.status);
    } catch (e) { console.warn("[leads] GHL webhook failed:", e); }
  }

  if (config.ghlApiKey && config.ghlLocationId) {
    try {
      const res = await fetch("https://services.leadconnectorhq.com/contacts/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ghlApiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: body.firstName, lastName: body.lastName,
          email: lead.email, phone: lead.phone,
          locationId: config.ghlLocationId,
          source: "Wrap Studio",
          customFields: [{ key: "wrap_job_summary", value: JSON.stringify(lead.jobSummary) }],
        }),
      });
      if (res.ok) return { channel: "ghl-api" };
      console.warn("[leads] GHL API returned", res.status);
    } catch (e) { console.warn("[leads] GHL API failed:", e); }
  }

  console.warn("[leads] No GHL config — appending to data/leads.local.json");
  await appendLocal(lead);
  return { channel: "local-file" };
}
