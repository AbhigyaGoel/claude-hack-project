import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export type ModelId = "claude-opus-4-7-20250219" | "claude-sonnet-4-6-20250514";

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Anthropic.Tool["input_schema"];
}

export interface ToolCallResult {
  response: string;
  toolResults: unknown[];
}

/**
 * Call Claude with tool-use via the Anthropic SDK.
 * Handles the tool-use loop: send → execute tool calls → return results → get final response.
 */
export async function callClaude(opts: {
  model?: ModelId;
  system: string;
  messages: Anthropic.MessageParam[];
  tools: ToolDef[];
  toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>;
  maxTokens?: number;
  thinking?: { type: "enabled"; budget_tokens: number };
}): Promise<ToolCallResult> {
  const {
    model = "claude-sonnet-4-6-20250514",
    system,
    messages,
    tools,
    toolHandlers,
    maxTokens = 4096,
    thinking,
  } = opts;

  const toolResults: unknown[] = [];
  let currentMessages = [...messages];

  // Build tools array for API
  const apiTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  // Tool-use loop — keep going until Claude stops calling tools
  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: currentMessages,
      tools: apiTools,
      ...(thinking ? { thinking } : {}),
    });

    // Check if Claude wants to use tools
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls — extract text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      return {
        response: textBlocks.map((b) => b.text).join("\n"),
        toolResults,
      };
    }

    // Execute tool calls
    const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const handler = toolHandlers[toolUse.name];
      if (handler) {
        const result = await handler(toolUse.input as Record<string, unknown>);
        toolResults.push(result);
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } else {
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolUse.name}` }),
          is_error: true,
        });
      }
    }

    // Add assistant response + tool results to messages for next iteration
    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResultBlocks },
    ];
  }

  // Exhausted iterations — return what we have
  return { response: "{}", toolResults };
}

/**
 * Simple Claude call without tools.
 */
export async function callClaudeSimple(opts: {
  model?: ModelId;
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const { model = "claude-sonnet-4-6-20250514", system, prompt, maxTokens = 4096 } = opts;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlocks.map((b) => b.text).join("\n");
}

/**
 * Claude Vision — analyze an image with optional context.
 */
export async function callClaudeVision(opts: {
  model?: ModelId;
  system: string;
  imageBase64: string;
  mediaType?: "image/jpeg" | "image/png" | "image/webp";
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const {
    model = "claude-sonnet-4-6-20250514",
    system,
    imageBase64,
    mediaType = "image/jpeg",
    prompt,
    maxTokens = 2048,
  } = opts;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlocks.map((b) => b.text).join("\n");
}
