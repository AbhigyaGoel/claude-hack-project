import { NextRequest } from "next/server";
import { callClaudeSimple, callClaudeVision } from "@/lib/claude/client";
import { SAFETY_MONITOR_SYSTEM } from "@/lib/claude/prompts";
import { getDb } from "@/db";
import { redFlags } from "@/db/schema";

interface SafetyResult {
  halt: boolean;
  red_flag_type: string | null;
  severity: number;
  reasoning: string;
  recommendation: string;
}

function generateId(): string {
  return `rf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseSafetyResult(raw: string): SafetyResult {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as SafetyResult;
    return {
      halt: Boolean(parsed.halt),
      red_flag_type: parsed.red_flag_type ?? null,
      severity: typeof parsed.severity === "number" ? Math.max(1, Math.min(5, parsed.severity)) : 1,
      reasoning: parsed.reasoning ?? "",
      recommendation: parsed.recommendation ?? "",
    };
  } catch {
    return {
      halt: false,
      red_flag_type: null,
      severity: 1,
      reasoning: "Unable to parse safety analysis",
      recommendation: "",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, transcript, frame_base64, keypoints } = body;

    if (!session_id) {
      return Response.json(
        { error: "Missing required field: session_id" },
        { status: 400 },
      );
    }

    const contextPayload = JSON.stringify({
      session_id,
      transcript: transcript ?? null,
      keypoints: keypoints ?? null,
      timestamp: new Date().toISOString(),
    });

    let rawResponse: string;

    if (frame_base64) {
      // Use vision to analyze facial expression + body language alongside transcript/keypoints
      rawResponse = await callClaudeVision({
        model: "claude-haiku-4-5-20251001",
        system: SAFETY_MONITOR_SYSTEM,
        imageBase64: frame_base64,
        prompt: `Safety check. Monitor data:\n${contextPayload}\n\nAnalyze the frame for signs of distress, grimacing, or guarding. Output safety JSON.`,
        maxTokens: 512,
      });
    } else {
      // Transcript + keypoint only safety check
      rawResponse = await callClaudeSimple({
        model: "claude-haiku-4-5-20251001",
        system: SAFETY_MONITOR_SYSTEM,
        prompt: `Safety check. Monitor data:\n${contextPayload}\n\nOutput safety JSON.`,
        maxTokens: 512,
      });
    }

    const result = parseSafetyResult(rawResponse);

    // If halt triggered, write to red_flags table
    if (result.halt && result.red_flag_type) {
      const db = getDb();
      await db.insert(redFlags).values({
        id: generateId(),
        session_id,
        type: result.red_flag_type,
        transcript: transcript ?? null,
        halted: true,
        referred: result.severity >= 4,
      });
    }

    return Response.json({
      halt: result.halt,
      red_flag_type: result.red_flag_type,
      severity: result.severity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Safety monitor failure should not crash the session — return safe default
    return Response.json({
      halt: false,
      red_flag_type: null,
      severity: 1,
      error: message,
    });
  }
}
