import { NextRequest } from "next/server";
import { streamNarration } from "@/agents/clinicalNarrator";
import { getDb } from "@/db";
import { narratorLog } from "@/db/schema";

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

    const encoder = new TextEncoder();
    let fullText = "";
    const sessionStartMs = Date.now();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const narration = streamNarration({
            session_id,
            patient_id,
            current_exercise,
            rep_data,
            assessment,
          });

          for await (const chunk of narration) {
            fullText += chunk.content;
            const sseData = JSON.stringify({ type: "narrator", text: chunk.content });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }

          if (fullText.length > 0) {
            const db = getDb();
            await db.insert(narratorLog).values({
              session_id,
              t_ms: Date.now() - sessionStartMs,
              reasoning_text: fullText,
            });
          }

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
