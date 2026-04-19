import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { callClaudeSimple } from "@/lib/claude/client";
import { getDb } from "@/db";
import { narratorLog, patients, sessions, sets } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth";

const SYSTEM = `You are a physical therapy session analyst. Given session data, produce a structured JSON report for the patient.

Output ONLY valid JSON with no markdown fencing. Schema:
{
  "overall_score": number (0-100, based on form quality, pain trajectory, completion rate),
  "highlights": ["string", ...],   // 2-4 specific things the patient did well
  "improvements": ["string", ...], // 2-4 concrete actionable things to work on next session
  "next_steps": [
    { "title": "string", "description": "string" }
  ],  // 3-5 recovery resources/actions tailored to their body region and session findings
  "export_summary": "string"  // 150-200 words plain text for emailing to a supervising PT
}

For highlights and improvements: be specific, reference actual exercises or findings from the data.
For next_steps: mix immediate (today), short-term (next 48h), and ongoing recommendations.
For export_summary: professional tone, include patient name, session number, exercises, pain trajectory, key findings, next focus.`;

interface CoachEntry {
  message: string;
  next_steps: string[];
  resources: { title: string; description: string }[];
}

function parseCoachLog(text: string): CoachEntry | null {
  try {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const obj = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Partial<CoachEntry>;
      if (typeof obj.message === "string") return obj as CoachEntry;
    }
  } catch { /* not JSON */ }
  // Plain text fallback
  const lines = text.split("\n").filter((l) => l.trim());
  return { message: lines[0] ?? text, next_steps: [], resources: [] };
}

function jsonParse<T>(raw: string): T | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { session_id?: string } | null;
  if (!body?.session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const db = getDb();

  const [sessionRows, setRows, logRows] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.id, body.session_id)).limit(1),
    db.select().from(sets).where(eq(sets.session_id, body.session_id)).orderBy(asc(sets.set_number)),
    db
      .select({ source: narratorLog.source, text: narratorLog.reasoning_text })
      .from(narratorLog)
      .where(eq(narratorLog.session_id, body.session_id))
      .orderBy(asc(narratorLog.t_ms)),
  ]);

  const session = sessionRows[0];
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const [patientRows, priorSessionRows] = await Promise.all([
    db.select({ name: patients.name }).from(patients).where(eq(patients.id, session.patient_id)).limit(1),
    db
      .select({ started_at: sessions.started_at, pain_pre: sessions.pain_pre, pain_post: sessions.pain_post })
      .from(sessions)
      .where(and(eq(sessions.patient_id, session.patient_id), eq(sessions.user_id, userId!)))
      .orderBy(desc(sessions.started_at))
      .limit(10),
  ]);

  const patientName = patientRows[0]?.name ?? "Patient";
  const sessionNumber = priorSessionRows.findIndex((s) => s.started_at?.toISOString() === session.started_at?.toISOString()) + 1
    || priorSessionRows.length;

  // Coach entry (already written by /api/progression-coach)
  const coachLogEntry = logRows.find((l) => l.source === "coach");
  const coachData = coachLogEntry ? parseCoachLog(coachLogEntry.text) : null;

  // Observer/reasoner notes
  const observerNotes = logRows.filter((l) => l.source === "observer").map((l) => l.text);
  const reasonerNotes = logRows.filter((l) => l.source === "reasoner").map((l) => l.text);

  const avgFormScore = setRows.length > 0
    ? setRows.reduce((sum, s) => sum + (s.form_score ?? 0), 0) / setRows.length
    : 0;
  const totalReps = setRows.reduce((sum, s) => sum + s.reps, 0);
  const exerciseNames = [...new Set(setRows.map((s) => s.exercise_name))];

  const promptData = [
    `Patient: ${patientName}`,
    `Session number: ${sessionNumber}`,
    `Date: ${session.started_at?.toISOString().slice(0, 10) ?? "unknown"}`,
    `Pain: ${session.pain_pre ?? "?"}/10 → ${session.pain_post ?? "?"}/10`,
    `Exercises: ${exerciseNames.join(", ")}`,
    `Total reps: ${totalReps}`,
    `Avg form score: ${Math.round(avgFormScore * 100)}%`,
    ``,
    `Sets detail:`,
    ...setRows.map((s) => `  - ${s.exercise_name} set ${s.set_number}: ${s.reps} reps, form ${Math.round((s.form_score ?? 0) * 100)}%`),
    ``,
    `Observer notes:`,
    ...observerNotes.slice(-5).map((n) => `  - ${n}`),
    ``,
    `Reasoner analysis:`,
    ...reasonerNotes.slice(-3).map((n) => `  - ${n}`),
    ``,
    `Coach recap: ${coachData?.message ?? "(none)"}`,
    ``,
    `Prior sessions pain trend: ${priorSessionRows.slice(0, 4).map((s) => `${s.pain_pre}→${s.pain_post}`).join(", ")}`,
  ].join("\n");

  interface ClaudeReport {
    overall_score?: number;
    highlights?: string[];
    improvements?: string[];
    next_steps?: { title: string; description: string }[];
    export_summary?: string;
  }

  let claudeReport: ClaudeReport | null = null;
  try {
    const raw = await callClaudeSimple({
      model: "claude-haiku-4-5-20251001",
      system: SYSTEM,
      prompt: promptData,
      maxTokens: 1200,
    });
    claudeReport = jsonParse<ClaudeReport>(raw);
  } catch (err) {
    console.error("[/api/report] Claude call failed:", err);
  }

  // Build sections from available data
  const sections = [];

  if (setRows.length > 0) {
    const detail = exerciseNames.map((name) => {
      const exerciseSets = setRows.filter((s) => s.exercise_name === name);
      const totalR = exerciseSets.reduce((sum, s) => sum + s.reps, 0);
      const avgForm = Math.round((exerciseSets.reduce((sum, s) => sum + (s.form_score ?? 0), 0) / exerciseSets.length) * 100);
      return `${name}: ${exerciseSets.length} set${exerciseSets.length !== 1 ? "s" : ""}, ${totalR} reps, ${avgForm}% form quality`;
    }).join("\n");
    sections.push({ heading: "Exercise Performance", content: detail });
  }

  if (reasonerNotes.length > 0) {
    sections.push({ heading: "Clinical Analysis", content: reasonerNotes.join("\n\n") });
  }

  const painDeltaText = session.pain_pre != null && session.pain_post != null
    ? `Pain changed from ${session.pain_pre}/10 to ${session.pain_post}/10 (${session.pain_post < session.pain_pre ? "improved" : session.pain_post > session.pain_pre ? "increased" : "no change"}).`
    : "";

  sections.push({
    heading: "Session Summary",
    content: [
      `${setRows.length} exercise${setRows.length !== 1 ? "s" : ""} completed, ${totalReps} total reps.`,
      painDeltaText,
      `Average form quality: ${Math.round(avgFormScore * 100)}%.`,
    ].filter(Boolean).join(" "),
  });

  const coachNextSteps: { title: string; description: string }[] = coachData?.next_steps.map((s) => ({
    title: s.split(" ").slice(0, 4).join(" "),
    description: s,
  })) ?? [];

  const coachResources: { title: string; description: string }[] = coachData?.resources ?? [];

  const nextSteps: { title: string; description: string }[] = [
    ...(claudeReport?.next_steps ?? []),
    ...coachNextSteps,
    ...coachResources,
  ].slice(0, 5);

  if (nextSteps.length === 0) {
    nextSteps.push(
      { title: "Rest & Recovery", description: "Allow 24–48 hours before your next session targeting the same muscle groups." },
      { title: "Stay Active", description: "Light walking and gentle stretching between sessions speeds recovery." },
    );
  }

  const overallScore = claudeReport?.overall_score
    ?? Math.round(
        (avgFormScore * 0.5 + (session.pain_pre != null && session.pain_post != null && session.pain_post < session.pain_pre ? 0.8 : 0.5) * 0.3 + (totalReps > 0 ? 0.9 : 0.5) * 0.2) * 100,
      );

  return NextResponse.json({
    title: `Session Report — ${new Date(session.started_at ?? Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    date: session.started_at?.toISOString() ?? new Date().toISOString(),
    patient_name: patientName,
    session_number: sessionNumber,
    overall_score: Math.min(100, Math.max(0, overallScore)),
    pain_pre: session.pain_pre,
    pain_post: session.pain_post,
    sections,
    recommendations: coachData?.next_steps ?? [],
    highlights: claudeReport?.highlights ?? [
      avgFormScore >= 0.8 ? "Maintained strong form quality throughout the session" : "Completed all prescribed exercises",
      totalReps > 0 ? `Completed ${totalReps} total reps` : "Showed up and did the work",
    ],
    improvements: claudeReport?.improvements ?? [
      avgFormScore < 0.8 ? "Focus on controlled movement quality before increasing difficulty" : "Ready to progress load next session",
    ],
    next_steps: nextSteps,
    export_summary: claudeReport?.export_summary ?? [
      `Patient: ${patientName} — Session ${sessionNumber} — ${session.started_at?.toISOString().slice(0, 10) ?? ""}`,
      ``,
      `Exercises: ${exerciseNames.join(", ")}. Total: ${totalReps} reps across ${setRows.length} sets.`,
      `Form quality: ${Math.round(avgFormScore * 100)}% average.`,
      painDeltaText,
      ``,
      coachData?.message ?? "",
    ].filter(Boolean).join("\n"),
    charts: priorSessionRows.length > 1 ? [{
      type: "line",
      title: "Pain Trend",
      data: priorSessionRows.slice().reverse().map((s, i) => ({
        session: i + 1,
        date: s.started_at?.toISOString().slice(0, 10),
        pain_pre: s.pain_pre,
        pain_post: s.pain_post,
      })),
    }] : [],
  });
}
