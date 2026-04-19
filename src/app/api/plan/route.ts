import { NextRequest, NextResponse } from "next/server";
import { designProgram } from "@/agents/programDesigner";
import { getDb } from "@/db";
import { patients, plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PatientProfile, DiagnosticResult } from "@/types/patient";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patient_id } = body;

  const db = getDb();
  const patientRows = await db.select().from(patients).where(eq(patients.id, patient_id));
  if (patientRows.length === 0) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const patientRow = patientRows[0];
  const profileJson = patientRow.profile_json as { diagnostic: DiagnosticResult };

  const createdAt =
    patientRow.created_at instanceof Date
      ? patientRow.created_at.toISOString()
      : String(patientRow.created_at ?? new Date().toISOString());

  const patientProfile: PatientProfile = {
    id: patientRow.id,
    diagnostic: profileJson.diagnostic,
    session_count: 0,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const plan = await designProgram(patientProfile);

  const [planRow] = await db
    .insert(plans)
    .values({
      patient_id,
      plan_json: plan,
      active: true,
    })
    .returning({ id: plans.id });

  return NextResponse.json({ plan_id: planRow.id, plan });
}
