import { NextRequest, NextResponse } from "next/server";
import { captureLead } from "@/lib/leads/ghl";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, jobSummary } = body || {};
    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email and phone are required." }, { status: 400 });
    }
    const result = await captureLead({ name, email, phone, jobSummary: jobSummary || {} });
    return NextResponse.json({ ok: true, channel: result.channel });
  } catch (e) {
    console.error("[api/leads]", e);
    // Lead capture must never dead-end the user.
    return NextResponse.json({ ok: true, channel: "error-logged" });
  }
}
