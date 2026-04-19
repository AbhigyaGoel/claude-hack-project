import { NextRequest, NextResponse } from "next/server";
import { designProgram } from "@/agents/programDesigner";
import { getDb } from "@/db";
import { patients, plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PatientProfile } from "@/types/patient";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patient_id } = body;

  const db = getDb();
  const patientRows = await db.select().from(patients).where(eq(patients.id, patient_id));
  if (patientRows.length === 0) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const row = patientRows[0];
  const profileJson = JSON.parse(row.profile_json);

  const patientProfile: PatientProfile = {
    id: row.id,
    diagnostic: profileJson.diagnostic,
    session_count: 0,
    created_at: row.created_at,
    updated_at: row.created_at,
  };

  const plan = await designProgram(patientProfile);

  const planId = `plan_${Date.now()}`;
  await db.insert(plans).values({
    id: planId,
    patient_id,
    plan_json: JSON.stringify(plan),
    active: true,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ plan_id: planId, plan });
}
