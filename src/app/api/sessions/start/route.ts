import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, patients } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

/**
 * POST /api/sessions/start
 *
 * Creates an empty sessions row at workout start so rep-commentary rows
 * (and any per-rep writes) can reference a real session_id instead of null.
 * The session is finalized later via POST /api/sessions with the id echoed
 * back — that writes ended_at, pain_post, sets, and summary.
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    patient_id?: string;
    plan_id?: string | null;
    pain_pre?: number | null;
  };

  if (!body.patient_id) {
    return NextResponse.json({ error: "patient_id required" }, { status: 400 });
  }

  const db = getDb();

  // Patient ownership — don't let user A start a session for user B's patient.
  const owned = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, body.patient_id), eq(patients.user_id, userId)))
    .limit(1);
  if (owned.length === 0) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const [row] = await db
    .insert(sessions)
    .values({
      patient_id: body.patient_id,
      plan_id: body.plan_id ?? null,
      user_id: userId,
      started_at: new Date(),
      pain_pre: body.pain_pre ?? null,
    })
    .returning({
      id: sessions.id,
      started_at: sessions.started_at,
    });

  return NextResponse.json({ id: row.id, started_at: row.started_at });
}
