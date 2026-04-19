import { callClaudeSimple, callClaudeVision } from "@/lib/claude/client";
import { SAFETY_MONITOR_SYSTEM } from "@/lib/claude/prompts";

export interface SafetyResult {
  halt: boolean;
  red_flag_type: string | null;
  severity: number;
  reasoning: string;
  recommendation: string;
}

export interface SafetyInput {
  session_id?: string;
  transcript?: string | null;
  keypoints?: unknown;
  frame_base64?: string;
}

const UNPARSEABLE: SafetyResult = {
  halt: false,
  red_flag_type: null,
  severity: 1,
  reasoning: "Unable to parse safety analysis",
  recommendation: "",
};

const SAFE_DEFAULT: SafetyResult = {
  halt: false,
  red_flag_type: null,
  severity: 1,
  reasoning: "",
  recommendation: "",
};

function parseSafetyResult(raw: string): SafetyResult {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as SafetyResult;
    return {
      halt: Boolean(parsed.halt),
      red_flag_type: parsed.red_flag_type ?? null,
      severity:
        typeof parsed.severity === "number" ? Math.max(1, Math.min(5, parsed.severity)) : 1,
      reasoning: parsed.reasoning ?? "",
      recommendation: parsed.recommendation ?? "",
    };
  } catch {
    return UNPARSEABLE;
  }
}

export async function checkSafety(input: SafetyInput): Promise<SafetyResult> {
  const contextPayload = JSON.stringify({
    session_id: input.session_id,
    transcript: input.transcript ?? null,
    keypoints: input.keypoints ?? null,
    timestamp: new Date().toISOString(),
  });

  try {
    let rawResponse: string;

    if (input.frame_base64) {
      rawResponse = await callClaudeVision({
        model: "claude-haiku-4-5-20251001",
        system: SAFETY_MONITOR_SYSTEM,
        imageBase64: input.frame_base64,
        prompt: `Safety check. Monitor data:\n${contextPayload}\n\nAnalyze the frame for signs of distress, grimacing, or guarding. Output safety JSON.`,
        maxTokens: 512,
      });
    } else {
      rawResponse = await callClaudeSimple({
        model: "claude-haiku-4-5-20251001",
        system: SAFETY_MONITOR_SYSTEM,
        prompt: `Safety check. Monitor data:\n${contextPayload}\n\nOutput safety JSON.`,
        maxTokens: 512,
      });
    }

    return parseSafetyResult(rawResponse);
  } catch {
    return SAFE_DEFAULT;
  }
}
