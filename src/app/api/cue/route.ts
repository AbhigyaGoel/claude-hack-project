import { NextRequest } from "next/server";
import { callClaudeSimple } from "@/lib/claude/client";
import { CUE_GENERATOR_SYSTEM } from "@/lib/claude/prompts";

interface CueResult {
  text: string;
  emotion: "calm" | "encouraging" | "urgent";
  priority: number;
  interrupt_current: boolean;
}

function parseCueResult(raw: string): CueResult {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as CueResult;

    // Enforce 15-word max on cue text
    const words = (parsed.text ?? "").split(/\s+/);
    const truncatedText = words.slice(0, 15).join(" ");

    const validEmotions = ["calm", "encouraging", "urgent"] as const;
    const emotion = validEmotions.includes(parsed.emotion as typeof validEmotions[number])
      ? parsed.emotion
      : "calm";

    return {
      text: truncatedText,
      emotion,
      priority: typeof parsed.priority === "number" ? Math.max(1, Math.min(5, parsed.priority)) : 2,
      interrupt_current: Boolean(parsed.interrupt_current),
    };
  } catch {
    return {
      text: "Keep going, you're doing great.",
      emotion: "encouraging",
      priority: 1,
      interrupt_current: false,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assessment, rep_number, set_number, exercise_name, patient_context } = body;

    if (!assessment || !exercise_name) {
      return Response.json(
        { error: "Missing required fields: assessment, exercise_name" },
        { status: 400 },
      );
    }

    const prompt = JSON.stringify({
      assessment,
      rep_number: rep_number ?? 1,
      set_number: set_number ?? 1,
      exercise_name,
      patient_context: patient_context ?? null,
    });

    const rawResponse = await callClaudeSimple({
      model: "claude-haiku-4-5-20251001",
      system: CUE_GENERATOR_SYSTEM,
      prompt: `Generate a coaching cue for this moment:\n${prompt}\n\nOutput cue JSON.`,
      maxTokens: 256,
    });

    const cue = parseCueResult(rawResponse);

    return Response.json(cue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Cue generation failed", detail: message },
      { status: 500 },
    );
  }
}
