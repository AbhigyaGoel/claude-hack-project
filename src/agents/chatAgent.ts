import { callClaude } from "@/lib/claude/client";
import { CHAT_SYSTEM } from "@/lib/claude/prompts";
import { loadPatientContext, createMemoryToolHandlers, MEMORY_TOOLS } from "@/lib/claude/memory";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatInput {
  patient_id: string;
  message: string;
  history: ChatMessage[];
}

export async function chat(input: ChatInput): Promise<string> {
  const patientContext = await loadPatientContext(input.patient_id);
  const systemWithContext = `${CHAT_SYSTEM}\n\n## Patient Context\n${patientContext}`;

  const messages: ChatMessage[] = [
    ...input.history,
    { role: "user", content: input.message },
  ];

  const memoryHandlers = createMemoryToolHandlers(input.patient_id);

  const result = await callClaude({
    model: "claude-sonnet-4-6",
    system: systemWithContext,
    messages,
    tools: MEMORY_TOOLS,
    toolHandlers: memoryHandlers,
    maxTokens: 1024,
  });

  return result.response;
}
