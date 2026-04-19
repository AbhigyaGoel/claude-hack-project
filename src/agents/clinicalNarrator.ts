import { streamClaude } from "@/lib/claude/client";
import { NARRATOR_SYSTEM } from "@/lib/claude/prompts";
import { loadPatientContext } from "@/lib/claude/memory";

export interface NarrationInput {
  session_id: string;
  patient_id: string;
  current_exercise?: unknown;
  rep_data?: unknown;
  assessment?: unknown;
  systemParts?: string[];
}

export interface NarrationChunk {
  type: "text";
  content: string;
}

export async function* streamNarration(
  input: NarrationInput,
): AsyncGenerator<NarrationChunk> {
  const patientContext = await loadPatientContext(input.patient_id);

  const systemParts = input.systemParts ?? [
    NARRATOR_SYSTEM,
    `\n\n## Patient Context\n${patientContext}`,
  ];

  const prompt = JSON.stringify({
    session_id: input.session_id,
    current_exercise: input.current_exercise ?? null,
    rep_data: input.rep_data ?? null,
    assessment: input.assessment ?? null,
    timestamp: new Date().toISOString(),
  });

  const stream = streamClaude({
    model: "claude-opus-4-7",
    system: NARRATOR_SYSTEM,
    systemParts,
    messages: [
      {
        role: "user",
        content: `Provide clinical reasoning narration for this moment in the session:\n${prompt}`,
      },
    ],
    maxTokens: 2048,
    thinking: { type: "adaptive", budget_tokens: 8192 },
  });

  for await (const chunk of stream) {
    if (chunk.type === "text") {
      yield { type: "text", content: chunk.content };
    }
    // Thinking chunks are internal — do not surface to callers
  }
}
