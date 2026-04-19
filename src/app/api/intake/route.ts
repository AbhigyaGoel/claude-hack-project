import { NextRequest, NextResponse } from "next/server";
import { conductIntake } from "@/agents/diagnosticInterviewer";
import { getDb } from "@/db";
import { patients } from "@/db/schema";
import { getDemoUserId } from "@/lib/supabase";
import type { BodyRegion } from "@/types/exercise";
import type { Side } from "@/types/patient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bodyRegion, responses, patientName } = body as {
      bodyRegion: BodyRegion;
      responses: Record<string, string | number | boolean>;
      patientName?: string;
    };

    const diagnostic = await conductIntake(bodyRegion, {
      side: (responses.side as Side) ?? undefined,
      onset: responses.onset as string | undefined,
      mechanism: responses.mechanism as string | undefined,
      pain_level:
        typeof responses.pain_level === "number" ? responses.pain_level : undefined,
      answers: responses,
      history: responses.history as string | undefined,
    });

    const db = getDb();
    const [row] = await db
      .insert(patients)
      .values({
        user_id: getDemoUserId(),
        name: patientName || "Patient",
        profile_json: {
          name: patientName || "Patient",
          diagnostic,
        },
      })
      .returning({ id: patients.id });

    return NextResponse.json({
      patient_id: row.id,
      diagnostic,
      instrument: diagnostic.instrument_used,
    });
  } catch (error) {
    console.error("[/api/intake] error:", error);
    return NextResponse.json({ error: "Intake failed" }, { status: 500 });
  }
}
