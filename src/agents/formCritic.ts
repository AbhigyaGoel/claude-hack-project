import { callClaudeSimple, callClaudeVision } from "@/lib/claude/client";
import { FORM_CRITIC_SYSTEM } from "@/lib/claude/prompts";

export interface Fault {
  type: string;
  joint: string;
  description: string;
  severity: number;
  phase: "concentric" | "peak" | "eccentric";
}

export interface Compensation {
  primary_joint: string;
  compensating_joint: string;
  description: string;
}

export interface RepAnalysis {
  faults: Fault[];
  quality: number;
  compensations: Compensation[];
  tempo_deviation: number;
}

export interface RepAnalysisExercise {
  name: string;
  id: string;
  target_angles?: Record<string, number>;
  tolerances?: Record<string, number>;
  compensation_patterns?: unknown;
}

export interface RepAnalysisInput {
  exercise: RepAnalysisExercise;
  rep_data: Record<string, unknown>;
  keypoints_timeseries?: unknown[];
  frame_base64?: string;
  systemParts?: string[];
}

export const DEFAULT_REP_ANALYSIS: RepAnalysis = {
  faults: [],
  quality: 0.5,
  compensations: [],
  tempo_deviation: 0,
};

function parseAnalysis(raw: string): RepAnalysis {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as RepAnalysis;
    return {
      faults: Array.isArray(parsed.faults) ? parsed.faults : [],
      quality:
        typeof parsed.quality === "number" ? Math.max(0, Math.min(1, parsed.quality)) : 0.5,
      compensations: Array.isArray(parsed.compensations) ? parsed.compensations : [],
      tempo_deviation:
        typeof parsed.tempo_deviation === "number" ? parsed.tempo_deviation : 0,
    };
  } catch {
    return DEFAULT_REP_ANALYSIS;
  }
}

export async function analyzeRep(input: RepAnalysisInput): Promise<RepAnalysis> {
  const prompt = JSON.stringify({
    exercise_name: input.exercise.name,
    exercise_id: input.exercise.id,
    target_angles: input.exercise.target_angles ?? {},
    tolerances: input.exercise.tolerances ?? {},
    compensation_patterns: input.exercise.compensation_patterns ?? [],
    rep_data: input.rep_data,
    keypoints_timeseries: input.keypoints_timeseries ?? [],
  });

  let rawResponse: string;

  if (input.frame_base64) {
    rawResponse = await callClaudeVision({
      model: "claude-sonnet-4-6",
      system: input.systemParts ? input.systemParts.join("") : FORM_CRITIC_SYSTEM,
      imageBase64: input.frame_base64,
      prompt: `Analyze this rep. Keypoint timeseries and exercise context:\n${prompt}\n\nCross-reference the visual frame with the keypoint data. Output RepAnalysis JSON.`,
      maxTokens: 2048,
    });
  } else {
    rawResponse = await callClaudeSimple({
      model: "claude-sonnet-4-6",
      system: FORM_CRITIC_SYSTEM,
      systemParts: input.systemParts,
      prompt: `Analyze this rep from keypoint timeseries data:\n${prompt}\n\nOutput RepAnalysis JSON.`,
      maxTokens: 2048,
    });
  }

  return parseAnalysis(rawResponse);
}
