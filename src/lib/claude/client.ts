import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export type ModelId =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

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
 * Build a prompt-cacheable system message block.
 * Mark the last block with cache_control to cache the entire prefix.
 */
function buildCachedSystem(parts: string[]): Anthropic.TextBlockParam[] {
  return parts.map((text, i) => ({
    type: "text" as const,
    text,
    ...(i === parts.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

/**
 * Call Claude with tool-use via the Anthropic SDK.
 * Supports prompt caching, extended thinking, and multi-round tool loops.
 */
export async function callClaude(opts: {
  model?: ModelId;
  system: string;
  systemParts?: string[];
  messages: Anthropic.MessageParam[];
  tools: ToolDef[];
  toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>>;
  maxTokens?: number;
  thinking?: { type: "enabled"; budget_tokens: number };
}): Promise<ToolCallResult> {
  const {
    model = "claude-sonnet-4-6",
    system,
    systemParts,
    messages,
    tools,
    toolHandlers,
    maxTokens = 4096,
    thinking,
  } = opts;

  const toolResults: unknown[] = [];
  let currentMessages = [...messages];

  const apiTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  // Use cached system if parts provided, else plain string
  const systemParam = systemParts
    ? buildCachedSystem(systemParts)
    : system;

  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemParam,
      messages: currentMessages,
      tools: apiTools.length > 0 ? apiTools : undefined,
      ...(thinking ? { thinking } : {}),
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      return {
        response: textBlocks.map((b) => b.text).join("\n"),
        toolResults,
      };
    }

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

    currentMessages = [
      ...currentMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResultBlocks },
    ];
  }

  return { response: "{}", toolResults };
}

/**
 * Simple Claude call without tools.
 * Supports prompt caching via systemParts.
 */
export async function callClaudeSimple(opts: {
  model?: ModelId;
  system: string;
  systemParts?: string[];
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const { model = "claude-sonnet-4-6", system, systemParts, prompt, maxTokens = 4096 } = opts;
  const systemParam = systemParts ? buildCachedSystem(systemParts) : system;
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemParam,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlocks.map((b) => b.text).join("\n");
}

/**
 * Claude Vision — analyze an image.
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
    model = "claude-sonnet-4-6",
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
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
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

/**
 * Streaming Claude call — returns an async iterable of text chunks.
 * Used for Clinical Narrator SSE.
 */
export async function* streamClaude(opts: {
  model?: ModelId;
  system: string;
  systemParts?: string[];
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  thinking?: { type: "enabled"; budget_tokens: number };
}): AsyncGenerator<{ type: "text" | "thinking"; content: string }> {
  const {
    model = "claude-opus-4-7",
    system,
    systemParts,
    messages,
    maxTokens = 4096,
    thinking,
  } = opts;

  const systemParam = systemParts ? buildCachedSystem(systemParts) : system;

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemParam,
    messages,
    ...(thinking ? { thinking } : {}),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = event.delta;
      if ("text" in delta && delta.text) {
        yield { type: "text", content: delta.text };
      }
      if ("thinking" in delta && delta.thinking) {
        yield { type: "thinking", content: delta.thinking };
      }
    }
  }
}
