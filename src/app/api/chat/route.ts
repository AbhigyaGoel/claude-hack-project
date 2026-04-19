import { NextRequest } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { CHAT_SYSTEM } from "@/lib/claude/prompts";
import { loadPatientContext, createMemoryToolHandlers, MEMORY_TOOLS } from "@/lib/claude/memory";
import { getDb } from "@/db";
import { chatMessages } from "@/db/schema";
import { getDemoUserId } from "@/lib/supabase";
import { eq } from "drizzle-orm";

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
    const patientContext = await loadPatientContext(patient_id);

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
      model: "claude-sonnet-4-6-20250514",
      system: systemWithContext,
      messages: conversationHistory,
      tools: MEMORY_TOOLS,
      toolHandlers: memoryHandlers,
      maxTokens: 1024,
    });

    const assistantResponse = result.response;
    const userId = getDemoUserId();

    // Save user message to database (id and created_at default in DB)
    await db.insert(chatMessages).values({
      patient_id,
      user_id: userId,
      role: "user",
      content: message,
    });

    // Save assistant response to database
    await db.insert(chatMessages).values({
      patient_id,
      user_id: userId,
      role: "assistant",
      content: assistantResponse,
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
