import { NextRequest, NextResponse } from "next/server";
import { analyzeFrame } from "@/agents/visionAnalyst";

export type { VisionFault, VisionResult } from "@/agents/visionAnalyst";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { frame_base64, keypoints_json, exercise_context } = body;

  if (!frame_base64) {
    return NextResponse.json({ error: "frame_base64 is required" }, { status: 400 });
  }

  const result = await analyzeFrame({ frame_base64, keypoints_json, exercise_context });
  return NextResponse.json(result);
}
