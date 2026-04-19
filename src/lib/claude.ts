import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Calls Claude via the `claude` CLI (--print mode).
 * Bills through the user's Max subscription — no API key needed.
 *
 * Since the CLI doesn't expose raw tool_use, we:
 * 1. Describe tools in the prompt
 * 2. Ask Claude for a JSON response with tool_call requests
 * 3. Execute handlers locally
 * 4. Feed results back in a second call
 */
export async function callClaudeWithTools(
  systemPrompt: string,
  messages: { role: string; content: string | object }[],
  tools: ClaudeTool[],
  toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>,
): Promise<{ response: string; toolResults: unknown[] }> {
  const toolResults: unknown[] = [];

  const toolDescriptions = tools.map((t) =>
    `Tool: ${t.name}\nDescription: ${t.description}\nInput schema: ${JSON.stringify(t.input_schema)}`
  ).join("\n\n");

  const userContent = messages
    .map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content))
    .join("\n");

  const fullPrompt = `${systemPrompt}

## Available Tools
You have the following tools. To use a tool, respond with JSON like:
{"tool_calls": [{"name": "tool_name", "input": {...}}]}

If no tools needed, respond directly with your final JSON answer.

${toolDescriptions}

## User Input
${userContent}

Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`;

  // First call
  let responseText = await queryClaudeMax(fullPrompt);
  responseText = cleanJsonResponse(responseText);

  try {
    const parsed = JSON.parse(responseText);

    if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
      const results: Record<string, unknown> = {};

      for (const call of parsed.tool_calls) {
        const handler = toolHandlers[call.name];
        if (handler) {
          const result = await handler(call.input || {});
          toolResults.push(result);
          results[call.name] = result;
        }
      }

      // Second call with tool results
      const followUp = `${systemPrompt}

Tools were called with these results:
${JSON.stringify(results, null, 2)}

Original input:
${userContent}

Produce your final JSON response. Respond ONLY with valid JSON.`;

      let finalResponse = await queryClaudeMax(followUp);
      finalResponse = cleanJsonResponse(finalResponse);
      return { response: finalResponse, toolResults };
    }

    return { response: responseText, toolResults };
  } catch {
    return { response: responseText, toolResults };
  }
}

/**
 * Query Claude via the CLI's --print mode.
 * Uses the user's Max subscription — no API key required.
 */
export async function queryClaudeMax(prompt: string): Promise<string> {
  const { stdout } = await execFileAsync("claude", [
    "--print",
    "--output-format", "text",
    "--tools", "",
    "--system-prompt", "Respond only with valid JSON. No markdown formatting.",
    "--no-session-persistence",
    prompt,
  ], {
    maxBuffer: 1024 * 1024,
    timeout: 60_000,
    env: { ...process.env },
  });

  return stdout.trim();
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}
