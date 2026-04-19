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

export interface VisionInput {
  frame_base64: string;
  keypoints_json?: string;
  exercise_context?: string;
}

const UNAVAILABLE: VisionResult = {
  faults: [],
  overall_severity: 1,
  recommendation: "Vision analysis unavailable",
};

const UNPARSEABLE: VisionResult = {
  faults: [],
  overall_severity: 1,
  recommendation: "Unable to parse vision analysis",
};

export async function analyzeFrame(input: VisionInput): Promise<VisionResult> {
  const prompt = [
    "Analyze this exercise frame for form faults not visible from keypoints alone.",
    input.keypoints_json ? `\nMediaPipe keypoints: ${input.keypoints_json}` : "",
    input.exercise_context ? `\nExercise: ${input.exercise_context}` : "",
    "\nRespond with JSON only: { faults, overall_severity, recommendation }",
  ].join("");

  try {
    const response = await callClaudeVision({
      model: "claude-sonnet-4-6",
      system: VISION_SYSTEM,
      imageBase64: input.frame_base64,
      prompt,
      maxTokens: 1024,
    });

    try {
      const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(cleaned) as VisionResult;
    } catch {
      return UNPARSEABLE;
    }
  } catch {
    return UNAVAILABLE;
  }
}
