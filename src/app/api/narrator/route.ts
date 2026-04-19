import { NextRequest } from "next/server";
import { streamClaude } from "@/lib/claude/client";
import { NARRATOR_SYSTEM } from "@/lib/claude/prompts";
import { loadPatientContext } from "@/lib/claude/memory";
import { getDb } from "@/db";
import { narratorLog } from "@/db/schema";

function generateId(): string {
  return `nl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, patient_id, current_exercise, rep_data, assessment } = body;

    if (!session_id || !patient_id) {
      return Response.json(
        { error: "Missing required fields: session_id, patient_id" },
        { status: 400 },
      );
    }

    // Load patient context for clinical reasoning
    const patientContext = loadPatientContext(patient_id);

    const prompt = JSON.stringify({
      session_id,
      current_exercise: current_exercise ?? null,
      rep_data: rep_data ?? null,
      assessment: assessment ?? null,
      timestamp: new Date().toISOString(),
    });

    const systemParts = [
      NARRATOR_SYSTEM,
      `\n\n## Patient Context\n${patientContext}`,
    ];

    const encoder = new TextEncoder();
    let fullText = "";
    const sessionStartMs = Date.now();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const stream = streamClaude({
            model: "claude-opus-4-7",
            system: NARRATOR_SYSTEM,
            systemParts,
            messages: [
              {
                role: "user",
                content: `Provide clinical reasoning narration for this moment in the session:\n${prompt}`,
              },
            ],
            maxTokens: 2048,
            thinking: { type: "enabled", budget_tokens: 8192 },
          });

          for await (const chunk of stream) {
            if (chunk.type === "text") {
              fullText += chunk.content;
              const sseData = JSON.stringify({
                type: "narrator",
                content: chunk.content,
              });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
            // Thinking chunks are internal reasoning — do not stream to client
          }

          // Log the complete narration to the database
          if (fullText.length > 0) {
            const db = getDb();
            await db.insert(narratorLog).values({
              id: generateId(),
              session_id,
              t_ms: Date.now() - sessionStartMs,
              reasoning_text: fullText,
            });
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Stream error";
          const errorEvent = JSON.stringify({ type: "error", content: message });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Narrator failed", detail: message },
      { status: 500 },
    );
  }
}
