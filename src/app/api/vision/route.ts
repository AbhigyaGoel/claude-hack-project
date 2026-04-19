import { NextRequest, NextResponse } from "next/server";
import { callClaudeVision } from "@/lib/claude/client";
import { VISION_SYSTEM } from "@/lib/claude/prompts";

export interface VisionFault {
  type: string;
  description: string;
  severity: number;
  confidence: number;
}

export interface VisionResult {
  faults: VisionFault[];
  overall_severity: number;
  recommendation: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { frame_base64, keypoints_json, exercise_context } = body;

  if (!frame_base64) {
    return NextResponse.json({ error: "frame_base64 is required" }, { status: 400 });
  }

  const prompt = [
    "Analyze this exercise frame for form faults not visible from keypoints alone.",
    keypoints_json ? `\nMediaPipe keypoints: ${keypoints_json}` : "",
    exercise_context ? `\nExercise: ${exercise_context}` : "",
    "\nRespond with JSON only: { faults, overall_severity, recommendation }",
  ].join("");

  try {
    const response = await callClaudeVision({
      model: "claude-sonnet-4-6-20250514",
      system: VISION_SYSTEM,
      imageBase64: frame_base64,
      prompt,
      maxTokens: 1024,
    });

    // Parse response
    let result: VisionResult;
    try {
      const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      result = {
        faults: [],
        overall_severity: 1,
        recommendation: "Unable to parse vision analysis",
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        faults: [],
        overall_severity: 1,
        recommendation: "Vision analysis unavailable",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 200 }, // Don't fail the session
    );
  }
}
