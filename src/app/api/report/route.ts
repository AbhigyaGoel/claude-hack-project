import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/agents/sessionReport";
import { getDb } from "@/db";
import { sessions, sets, formEvents, patients, plans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id } = body;

  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const db = getDb();

  const sessionRows = await db.select().from(sessions).where(eq(sessions.id, session_id));
  if (sessionRows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const session = sessionRows[0];

  const patientRows = await db.select().from(patients).where(eq(patients.id, session.patient_id));
  const patient = (patientRows[0]?.profile_json as { name?: string } | null) ?? null;

  const planRows = session.plan_id
    ? await db.select().from(plans).where(eq(plans.id, session.plan_id))
    : [];
  const plan = planRows[0]?.plan_json ?? null;

  const sessionSets = await db.select().from(sets).where(eq(sets.session_id, session_id));

  const allFormEvents = [];
  for (const set of sessionSets) {
    const events = await db.select().from(formEvents).where(eq(formEvents.set_id, set.id));
    allFormEvents.push(...events);
  }

  const allPatientSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.patient_id, session.patient_id));

  try {
    const report = await generateReport({
      session,
      patient,
      plan,
      sets: sessionSets,
      form_events: allFormEvents,
      session_history: allPatientSessions.map((s) => ({
        id: s.id,
        date: s.started_at,
        pain_pre: s.pain_pre,
        pain_post: s.pain_post,
        summary: s.summary_json ?? null,
      })),
    });

    await db
      .update(sessions)
      .set({ summary_json: report })
      .where(eq(sessions.id, session_id));

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 },
    );
  }
}
