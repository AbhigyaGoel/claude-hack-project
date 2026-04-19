import { NextRequest, NextResponse } from "next/server";
import { MCP_TOOLS, handleMCPToolCall } from "@/lib/mcp/server";

/**
 * Vero MCP Server endpoint.
 * Exposes tools for human PTs to supervise patients via Claude Desktop.
 *
 * Protocol: simplified MCP over HTTP
 * - GET: returns tool definitions (tool listing)
 * - POST: executes a tool call
 */

export async function GET() {
  return NextResponse.json({
    name: "vero-mcp",
    version: "1.0.0",
    description: "Vero AI Physical Therapy — MCP server for PT supervision",
    tools: MCP_TOOLS,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tool, input } = body;

  if (!tool) {
    return NextResponse.json({ error: "tool is required" }, { status: 400 });
  }

  const validTools = MCP_TOOLS.map((t) => t.name);
  if (!validTools.includes(tool)) {
    return NextResponse.json(
      { error: `Unknown tool: ${tool}. Available: ${validTools.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const result = await handleMCPToolCall(tool, input || {});
    return NextResponse.json({ tool, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 },
    );
  }
}
