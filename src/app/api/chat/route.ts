import { NextRequest } from "next/server";
import { chat, type ChatMessage } from "@/agents/chatAgent";
import { getDb } from "@/db";
import { chatMessages, patients } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const MAX_HISTORY_MESSAGES = 20;

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patient_id, message } = body;

    if (!patient_id || !message) {
      return Response.json(
        { error: "Missing required fields: patient_id, message" },
        { status: 400 },
      );
    }

    const db = getDb();

    const owned = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, patient_id), eq(patients.user_id, userId)))
      .limit(1);
    if (owned.length === 0) {
      return Response.json({ error: "patient not found" }, { status: 404 });
    }

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

    await db.insert(chatMessages).values({
      patient_id,
      user_id: userId,
      role: "user",
      content: message,
    });
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
