import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { generateReport, type SessionReport } from "@/agents/sessionReport";
import { getDb } from "@/db";
import { sessions, sets, formEvents, patients, plans } from "@/db/schema";
import { SessionReportPdf } from "@/components/SessionReportPdf";

// react-pdf renders with Node APIs (Buffer, streams, font parsing) and is
// not compatible with the Edge runtime.
export const runtime = "nodejs";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "report";
}

function isReport(value: unknown): value is SessionReport {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.patient_name === "string" &&
    Array.isArray(v.sections) &&
    Array.isArray(v.recommendations)
  );
}

async function loadOrGenerateReport(sessionId: string): Promise<SessionReport | null> {
  const db = getDb();

  const sessionRows = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (sessionRows.length === 0) return null;
  const session = sessionRows[0];

  // Reuse the cached report if /api/report has already persisted it — saves
  // a 5–10s Claude round-trip on repeat PDF downloads.
  if (isReport(session.summary_json)) {
    return session.summary_json;
  }

  const patientRows = await db.select().from(patients).where(eq(patients.id, session.patient_id));
  const patient = (patientRows[0]?.profile_json as { name?: string } | null) ?? null;

  const planRows = session.plan_id
    ? await db.select().from(plans).where(eq(plans.id, session.plan_id))
    : [];
  const plan = planRows[0]?.plan_json ?? null;

  const sessionSets = await db.select().from(sets).where(eq(sets.session_id, sessionId));

  const allFormEvents = [];
  for (const set of sessionSets) {
    const events = await db.select().from(formEvents).where(eq(formEvents.set_id, set.id));
    allFormEvents.push(...events);
  }

  const allPatientSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.patient_id, session.patient_id));

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
    .where(eq(sessions.id, sessionId));

  return report;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return Response.json({ error: "session_id required" }, { status: 400 });
  }

  const report = await loadOrGenerateReport(sessionId);
  if (!report) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<SessionReportPdf report={report} />);
  const filename = `${slugify(report.patient_name)}-session-${
    report.session_number ?? "report"
  }.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
