import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers/image";
import type { FlatDesign, Vehicle } from "@/lib/design/model";

export const runtime = "nodejs";
export const maxDuration = 60; // image gen can be slow; see README re: worker queue

export async function POST(req: NextRequest) {
  try {
    const { design, vehicle, scene } = (await req.json()) as {
      design: FlatDesign; vehicle: Vehicle; scene?: string;
    };
    if (!design || !vehicle) {
      return NextResponse.json({ error: "design and vehicle are required" }, { status: 400 });
    }
    const result = await getImageProvider().generate({ design, vehicle, scene });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/generate]", e);
    return NextResponse.json(
      { error: "Generation failed — please try again." }, { status: 500 },
    );
  }
}
