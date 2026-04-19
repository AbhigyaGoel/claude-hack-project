/**
 * Legacy wrapper — agents that import from "@/lib/claude" continue to work.
 * New code should import from "@/lib/claude/client" directly.
 */
import { callClaude, type ToolDef } from "./claude/client";

export type ClaudeTool = ToolDef;

export interface ToolResult {
  tool_use_id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Backward-compatible wrapper around the new SDK-based callClaude.
 * Old signature: (system, messages, tools, toolHandlers) => { response, toolResults }
 */
export async function callClaudeWithTools(
  systemPrompt: string,
  messages: { role: string; content: string | object }[],
  tools: ClaudeTool[],
  toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>,
): Promise<{ response: string; toolResults: unknown[] }> {
  const apiMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  return callClaude({
    system: systemPrompt,
    messages: apiMessages,
    tools,
    toolHandlers,
  });
}

/**
 * @deprecated Use callClaudeSimple from "@/lib/claude/client" instead.
 */
export async function queryClaudeMax(prompt: string): Promise<string> {
  const { callClaudeSimple } = await import("./claude/client");
  return callClaudeSimple({
    system: "Respond only with valid JSON. No markdown formatting.",
    prompt,
  });
}
