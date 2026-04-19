import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { REPORT_SYSTEM } from "@/lib/claude/prompts";
import { getTools } from "@/lib/claude/tools";
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

  // Gather session data
  const sessionRows = await db.select().from(sessions).where(eq(sessions.id, session_id));
  if (sessionRows.length === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const session = sessionRows[0];

  // Get patient
  const patientRows = await db.select().from(patients).where(eq(patients.id, session.patient_id));
  const patient = patientRows[0] ? JSON.parse(patientRows[0].profile_json) : null;

  // Get plan
  const planRows = await db.select().from(plans).where(eq(plans.id, session.plan_id));
  const plan = planRows[0] ? JSON.parse(planRows[0].plan_json) : null;

  // Get sets for this session
  const sessionSets = await db.select().from(sets).where(eq(sets.session_id, session_id));

  // Get form events for each set
  const allFormEvents = [];
  for (const set of sessionSets) {
    const events = await db.select().from(formEvents).where(eq(formEvents.set_id, set.id));
    allFormEvents.push(...events);
  }

  // Get prior sessions for trend data
  const allPatientSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.patient_id, session.patient_id));

  const sessionData = {
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
      summary: s.summary_json ? JSON.parse(s.summary_json) : null,
    })),
  };

  try {
    const result = await callClaude({
      model: "claude-opus-4-7-20250219",
      system: REPORT_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            action: "generate_full_report",
            session_data: sessionData,
          }),
        },
      ],
      tools: getTools("generate_report", "query_history"),
      toolHandlers: {
        generate_report: async (input) => input,
        query_history: async () => sessionData.session_history,
      },
      maxTokens: 8192,
    });

    let report;
    try {
      report = JSON.parse(result.response);
    } catch {
      // Build report from tool results
      report = result.toolResults.find(
        (r) => r && typeof r === "object" && "title" in (r as Record<string, unknown>)
      );
    }

    // Fallback report
    if (!report || !report.title) {
      const totalReps = sessionSets.reduce((sum, s) => sum + s.reps, 0);
      const avgForm = sessionSets.length > 0
        ? Math.round(sessionSets.reduce((sum, s) => sum + (s.form_score ?? 0), 0) / sessionSets.length * 100)
        : 0;

      report = {
        title: `Session Report — ${new Date(session.started_at).toLocaleDateString()}`,
        date: session.started_at,
        patient_name: patient?.name || "Patient",
        sections: [
          {
            heading: "Session Overview",
            content: `${sessionSets.length} exercises, ${totalReps} total reps. Pain: ${session.pain_pre}/10 → ${session.pain_post}/10.`,
          },
          {
            heading: "Exercise Performance",
            content: sessionSets.map((s) => `${s.exercise_name}: ${s.reps} reps, form ${Math.round((s.form_score ?? 0) * 100)}%`).join("\n"),
          },
          {
            heading: "Form Quality",
            content: `Average form quality: ${avgForm}%. ${allFormEvents.length} form events detected.`,
          },
        ],
        recommendations: avgForm >= 85
          ? ["Consider progressing difficulty next session"]
          : ["Focus on form quality before increasing difficulty"],
        charts: [
          {
            type: "line",
            title: "Pain Trend",
            data: allPatientSessions.map((s, i) => ({
              session: i + 1,
              pain_pre: s.pain_pre,
              pain_post: s.pain_post,
            })),
          },
        ],
      };
    }

    // Store summary in session
    await db
      .update(sessions)
      .set({ summary_json: JSON.stringify(report) })
      .where(eq(sessions.id, session_id));

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 },
    );
  }
}
