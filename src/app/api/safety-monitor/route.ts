import { NextRequest } from "next/server";
import { checkSafety } from "@/agents/safetyMonitor";
import { getDb } from "@/db";
import { redFlags } from "@/db/schema";

function generateId(): string {
  return `rf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, transcript, frame_base64, keypoints } = body;

    if (!session_id) {
      return Response.json(
        { error: "Missing required field: session_id" },
        { status: 400 },
      );
    }

    const result = await checkSafety({ session_id, transcript, frame_base64, keypoints });

    if (result.halt && result.red_flag_type) {
      const db = getDb();
      await db.insert(redFlags).values({
        id: generateId(),
        session_id,
        type: result.red_flag_type,
        transcript: transcript ?? null,
        halted: true,
        referred: result.severity >= 4,
      });
    }

    return Response.json({
      halt: result.halt,
      red_flag_type: result.red_flag_type,
      severity: result.severity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({
      halt: false,
      red_flag_type: null,
      severity: 1,
      error: message,
    });
  }
}
