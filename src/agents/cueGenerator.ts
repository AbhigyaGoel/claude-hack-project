import { callClaudeSimple } from "@/lib/claude/client";
import { CUE_GENERATOR_SYSTEM } from "@/lib/claude/prompts";

export type CueEmotion = "calm" | "encouraging" | "urgent";

export interface CoachingCue {
  text: string;
  emotion: CueEmotion;
  priority: number;
  interrupt_current: boolean;
}

export interface CueInput {
  assessment: unknown;
  rep_number: number;
  set_number: number;
  exercise_name: string;
}

const DEFAULT_CUE: CoachingCue = {
  text: "Keep going, nice and steady.",
  emotion: "encouraging",
  priority: 1,
  interrupt_current: false,
};

function parseCue(raw: string): CoachingCue {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<CoachingCue> & { suppressed?: boolean };
    if (!parsed.text) return DEFAULT_CUE;
    return parsed as CoachingCue;
  } catch {
    return DEFAULT_CUE;
  }
}

export async function generateCue(input: CueInput): Promise<CoachingCue> {
  try {
    const prompt = JSON.stringify({
      assessment: input.assessment,
      rep_number: input.rep_number,
      set_number: input.set_number,
      exercise_name: input.exercise_name,
    });

    const raw = await callClaudeSimple({
      model: "claude-haiku-4-5-20251001",
      system: CUE_GENERATOR_SYSTEM,
      prompt: `Generate a coaching cue:\n${prompt}\n\nOutput cue JSON.`,
      maxTokens: 256,
    });

    return parseCue(raw);
  } catch {
    return DEFAULT_CUE;
  }
}
