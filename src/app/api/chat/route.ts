import { NextRequest } from "next/server";
import { chat, type ChatMessage } from "@/agents/chatAgent";
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

    const recentMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.patient_id, patient_id))
      .orderBy(chatMessages.created_at)
      .limit(MAX_HISTORY_MESSAGES);

    const history: ChatMessage[] = recentMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const assistantResponse = await chat({ patient_id, message, history });

    const now = new Date().toISOString();
    await db.insert(chatMessages).values({
      id: generateId(),
      patient_id,
      role: "user",
      content: message,
      created_at: now,
    });
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
