import { describe, it, expect } from "vitest";
import { queryClaudeMax, callClaudeWithTools } from "@/lib/claude";

describe("claude", () => {
  it("imports without error", () => {
    expect(queryClaudeMax).toBeDefined();
    expect(callClaudeWithTools).toBeDefined();
  });

  it("queryClaudeMax returns a string", async () => {
    const result = await queryClaudeMax("test prompt");
    expect(typeof result).toBe("string");
  });

  it("callClaudeWithTools returns response and toolResults", async () => {
    const result = await callClaudeWithTools(
      "system prompt",
      [{ role: "user", content: "hello" }],
      [],
      {},
    );
    expect(result).toHaveProperty("response");
    expect(result).toHaveProperty("toolResults");
    expect(Array.isArray(result.toolResults)).toBe(true);
  });
});
