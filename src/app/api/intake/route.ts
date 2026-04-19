import { NextRequest, NextResponse } from "next/server";
import { conductIntake } from "@/agents/diagnosticInterviewer";
import { getDb } from "@/db";
import { patients } from "@/db/schema";
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

    const patientId = `patient_${Date.now()}`;
    const db = getDb();
    await db.insert(patients).values({
      id: patientId,
      profile_json: JSON.stringify({
        name: patientName || "Patient",
        diagnostic,
      }),
      memory_path: `/patient-memory/${patientId}`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      patient_id: patientId,
      diagnostic,
      instrument: diagnostic.instrument_used,
    });
  } catch (error) {
    console.error("[/api/intake] error:", error);
    return NextResponse.json({ error: "Intake failed" }, { status: 500 });
  }
}
