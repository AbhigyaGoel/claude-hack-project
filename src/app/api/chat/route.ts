import { NextRequest } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { CHAT_SYSTEM } from "@/lib/claude/prompts";
import { loadPatientContext, createMemoryToolHandlers, MEMORY_TOOLS } from "@/lib/claude/memory";
import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_HISTORY_MESSAGES = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_id, message } = body;

    if (!patient_id || !message) {
      return Response.json(
        { error: "Missing required fields: patient_id, message" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Load patient context from memory files
    const patientContext = loadPatientContext(patient_id);

    // Load recent chat history
    const recentMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.patient_id, patient_id))
      .orderBy(chatMessages.created_at)
      .limit(MAX_HISTORY_MESSAGES);

    // Build conversation history for Claude
    const conversationHistory = recentMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Add the new user message
    conversationHistory.push({
      role: "user",
      content: message,
    });

    // Create memory tool handlers for this patient
    const memoryHandlers = createMemoryToolHandlers(patient_id);

    const systemWithContext = `${CHAT_SYSTEM}\n\n## Patient Context\n${patientContext}`;

    const result = await callClaude({
      model: "claude-sonnet-4-6",
      system: systemWithContext,
      messages: conversationHistory,
      tools: MEMORY_TOOLS,
      toolHandlers: memoryHandlers,
      maxTokens: 1024,
    });

    const assistantResponse = result.response;
    const now = new Date().toISOString();

    // Save user message to database
    await db.insert(chatMessages).values({
      id: generateId(),
      patient_id,
      role: "user",
      content: message,
      created_at: now,
    });

    // Save assistant response to database
    await db.insert(chatMessages).values({
      id: generateId(),
      patient_id,
      role: "assistant",
      content: assistantResponse,
      created_at: now,
    });

    return Response.json({ response: assistantResponse });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Chat failed", detail: message },
      { status: 500 },
    );
  }
}
