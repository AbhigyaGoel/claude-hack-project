import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, sets, repAnalyses } from "@/db/schema";
import { getDemoUserId } from "@/lib/supabase";

/**
 * GET /api/sessions?patient_id=UUID
 *
 * Returns sessions for the patient with aggregated totals so the progress
 * page can render without further roundtrips.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const userId = getDemoUserId();
  const url = new URL(req.url);
  const patientId = url.searchParams.get("patient_id");

  if (!patientId) {
    return NextResponse.json({ error: "patient_id required" }, { status: 400 });
  }

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.patient_id, patientId), eq(sessions.user_id, userId)))
    .orderBy(asc(sessions.started_at));

  if (sessionRows.length === 0) {
    return NextResponse.json({ sessions: [] });
  }

  const allSets = await db.select().from(sets);
  const setsBySession = new Map<string, typeof allSets>();
  for (const s of allSets) {
    const list = setsBySession.get(s.session_id) ?? [];
    list.push(s);
    setsBySession.set(s.session_id, list);
  }

  const result = sessionRows.map((session, idx) => {
    const thisSets = setsBySession.get(session.id) ?? [];
    const totalReps = thisSets.reduce((sum, s) => sum + s.reps, 0);
    const formScores = thisSets
      .map((s) => s.form_score)
      .filter((q): q is number => q != null);
    const avgFormQuality = formScores.length > 0
      ? Math.round((formScores.reduce((a, b) => a + b, 0) / formScores.length) * 100)
      : 0;

    const started = session.started_at ? new Date(session.started_at) : null;
    const ended = session.ended_at ? new Date(session.ended_at) : null;
    const durationMinutes = started && ended
      ? Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000))
      : 0;

    return {
      id: session.id,
      patient_id: session.patient_id,
      session_number: idx + 1,
      date: started?.toISOString() ?? null,
      duration_minutes: durationMinutes,
      pain_pre: session.pain_pre ?? 0,
      pain_post: session.pain_post ?? 0,
      total_reps: totalReps,
      avg_form_quality: avgFormQuality,
      exercises: thisSets.map((s) => ({
        exercise_id: s.exercise_id,
        exercise_name: s.exercise_name,
        set_number: s.set_number,
        reps: s.reps,
        form_score: s.form_score,
      })),
      summary: session.summary_json ?? null,
    };
  });

  return NextResponse.json({ sessions: result });
}

/**
 * POST /api/sessions
 *
 * Persist a fully-formed session (session row + sets + rep analyses) in one
 * request. Used by the /session page when a workout completes on the client.
 * Server agents that stream via /api/orchestrator use the orchestrator's own
 * start_session/evaluate_rep/end_session actions instead.
 */
interface PostPayload {
  patient_id: string;
  plan_id?: string | null;
  started_at?: string;
  ended_at?: string;
  pain_pre?: number | null;
  pain_post?: number | null;
  summary?: Record<string, unknown> | null;
  exercises: {
    exercise_id: string;
    exercise_name: string;
    set_number: number;
    reps: number;
    form_score?: number | null;
    faults?: unknown[];
  }[];
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const userId = getDemoUserId();
  const body = (await req.json()) as PostPayload;

  if (!body.patient_id || !Array.isArray(body.exercises)) {
    return NextResponse.json(
      { error: "patient_id and exercises[] are required" },
      { status: 400 },
    );
  }

  const [sessionRow] = await db
    .insert(sessions)
    .values({
      patient_id: body.patient_id,
      plan_id: body.plan_id ?? null,
      user_id: userId,
      started_at: body.started_at ? new Date(body.started_at) : new Date(),
      ended_at: body.ended_at ? new Date(body.ended_at) : new Date(),
      pain_pre: body.pain_pre ?? null,
      pain_post: body.pain_post ?? null,
      summary_json: body.summary ?? null,
    })
    .returning();

  // Persist sets + optional rep analyses. Natural-key upsert keeps the
  // endpoint idempotent if the client retries.
  for (const ex of body.exercises) {
    const [setRow] = await db
      .insert(sets)
      .values({
        session_id: sessionRow.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        set_number: ex.set_number,
        reps: ex.reps,
        form_score: ex.form_score ?? null,
      })
      .onConflictDoUpdate({
        target: [sets.session_id, sets.exercise_id, sets.set_number],
        set: { reps: ex.reps, form_score: ex.form_score ?? null },
      })
      .returning({ id: sets.id });

    if (Array.isArray(ex.faults) && ex.faults.length > 0) {
      await db.insert(repAnalyses).values({
        set_id: setRow.id,
        rep_num: ex.reps,
        faults_json: ex.faults,
        quality: ex.form_score ?? null,
      });
    }
  }

  return NextResponse.json({
    id: sessionRow.id,
    patient_id: sessionRow.patient_id,
    started_at: sessionRow.started_at,
    ended_at: sessionRow.ended_at,
  });
}
