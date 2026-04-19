import { NextRequest } from "next/server";
import { callClaudeSimple, callClaudeVision } from "@/lib/claude/client";
import { FORM_CRITIC_SYSTEM } from "@/lib/claude/prompts";
import { getDb } from "@/db";
import { repAnalyses } from "@/db/schema";

interface Fault {
  type: string;
  joint: string;
  description: string;
  severity: number;
  phase: "concentric" | "peak" | "eccentric";
}

interface Compensation {
  primary_joint: string;
  compensating_joint: string;
  description: string;
}

interface RepAnalysis {
  faults: Fault[];
  quality: number;
  compensations: Compensation[];
  tempo_deviation: number;
}

function generateId(): string {
  return `ra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseAnalysis(raw: string): RepAnalysis {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as RepAnalysis;
    return {
      faults: Array.isArray(parsed.faults) ? parsed.faults : [],
      quality: typeof parsed.quality === "number" ? Math.max(0, Math.min(1, parsed.quality)) : 0.5,
      compensations: Array.isArray(parsed.compensations) ? parsed.compensations : [],
      tempo_deviation: typeof parsed.tempo_deviation === "number" ? parsed.tempo_deviation : 0,
    };
  } catch {
    return { faults: [], quality: 0.5, compensations: [], tempo_deviation: 0 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exercise, rep_data, keypoints_timeseries, frame_base64, set_id } = body;

    if (!exercise || !rep_data) {
      return Response.json(
        { error: "Missing required fields: exercise, rep_data" },
        { status: 400 },
      );
    }

    const prompt = JSON.stringify({
      exercise_name: exercise.name,
      exercise_id: exercise.id,
      target_angles: exercise.target_angles,
      tolerances: exercise.tolerances,
      compensation_patterns: exercise.compensation_patterns,
      rep_data,
      keypoints_timeseries: keypoints_timeseries ?? [],
    });

    let rawResponse: string;

    if (frame_base64) {
      // Use vision model to cross-reference keypoint data with visual frame
      rawResponse = await callClaudeVision({
        model: "claude-sonnet-4-6-20250514",
        system: FORM_CRITIC_SYSTEM,
        imageBase64: frame_base64,
        prompt: `Analyze this rep. Keypoint timeseries and exercise context:\n${prompt}\n\nCross-reference the visual frame with the keypoint data. Output RepAnalysis JSON.`,
        maxTokens: 2048,
      });
    } else {
      // Keypoint-only analysis
      rawResponse = await callClaudeSimple({
        model: "claude-sonnet-4-6-20250514",
        system: FORM_CRITIC_SYSTEM,
        prompt: `Analyze this rep from keypoint timeseries data:\n${prompt}\n\nOutput RepAnalysis JSON.`,
        maxTokens: 2048,
      });
    }

    const analysis = parseAnalysis(rawResponse);

    // Log to rep_analyses table
    if (set_id) {
      const db = getDb();
      await db.insert(repAnalyses).values({
        id: generateId(),
        set_id,
        rep_num: rep_data.rep_number ?? 1,
        video_clip_url: null,
        faults_json: JSON.stringify(analysis.faults),
        quality: analysis.quality,
      });
    }

    return Response.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Form analysis failed", detail: message },
      { status: 500 },
    );
  }
}
