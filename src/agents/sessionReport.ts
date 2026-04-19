import { callClaudeSimple } from "@/lib/claude/client";
import { readMemoryFile, writeMemoryFile } from "@/lib/claude/memory";

// Inlined — main's dead-code cleanup removed REPORT_SYSTEM from prompts.ts
// along with the report agent, but the report UI (and this file) still
// rely on it. Keeping the prompt here so sessionReport stays self-contained.
const REPORT_SYSTEM = `You are the Session Report Agent for Vero AI Physical Therapy.

Write a short, useful report the patient reads directly after a workout. Prose-only — no charts, no JSON chart arrays.

Principles:
- Every sentence must say something. No filler, no clinical throat-clearing, no restating the numbers just to fill space.
- Reference specific exercises, rep counts, form scores, and pain values from the provided data. Never invent numbers.
- Each section is 2–4 sentences. If you have less to say, write less.
- Lead with what changed (progress, plateau, or regression) — not "Today you did X reps of Y."
- Write like a knowledgeable friend. Avoid ALL-CAPS headers, bureaucratic phrasing, and PT-to-PT language ("adverse reaction", "regress intensity", "clinical check-in", "outcome instrument").
- Recommendations: 1 plain sentence each. Actionable, specific, no jargon. 2–4 total.
- Output strict JSON matching the schema — no prose outside the JSON, no code fences.`;

interface SessionRow {
  id: string;
  started_at: Date | string;
  ended_at?: Date | string | null;
  patient_id: string;
  plan_id: string | null;
  pain_pre?: number | null;
  pain_post?: number | null;
  summary_json?: unknown;
}

interface SetRow {
  id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  form_score?: number | null;
}

interface FormEventRow {
  id: string;
  set_id: string;
  fault?: string | null;
  severity?: number | null;
}

interface PriorSession {
  id: string;
  date: Date | string;
  pain_pre?: number | null;
  pain_post?: number | null;
  summary: unknown;
}

export interface ReportInput {
  session: SessionRow;
  patient: { name?: string } | null;
  plan: unknown;
  sets: SetRow[];
  form_events: FormEventRow[];
  session_history: PriorSession[];
}

export interface ReportChart {
  type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  data: Array<Record<string, unknown>>;
}

export interface ReportSection {
  heading: string;
  content: string;
  charts?: ReportChart[];
}

export interface SessionReport {
  title: string;
  date: string;
  patient_name: string;
  session_number?: number;
  overall_score?: number;
  sections: ReportSection[];
  recommendations: string[];
  charts?: ReportChart[];
  outcome_measure?: {
    instrument: string;
    current_score: number;
    initial_score: number;
    change: number;
    mcid_achieved: boolean;
  };
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : d;
}

function durationMinutes(started: Date | string, ended?: Date | string | null): number {
  const s = new Date(started).getTime();
  const e = ended ? new Date(ended).getTime() : s;
  return Math.max(0, Math.round((e - s) / 60000));
}

function summarizeSets(sets: SetRow[]) {
  // Group sets by exercise so the report renders one block per exercise, not per set.
  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exercise_id) ?? [];
    list.push(s);
    byExercise.set(s.exercise_id, list);
  }
  return Array.from(byExercise.entries()).map(([id, rows]) => {
    const totalReps = rows.reduce((sum, r) => sum + r.reps, 0);
    const scores = rows
      .map((r) => r.form_score)
      .filter((s): s is number => typeof s === "number");
    const avgForm =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      exercise_id: id,
      exercise_name: rows[0].exercise_name,
      sets_completed: rows.length,
      total_reps: totalReps,
      avg_form_score: avgForm,
      per_set: rows
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((r) => ({
          set: r.set_number,
          reps: r.reps,
          form_score: r.form_score ?? null,
        })),
    };
  });
}

export function buildFallbackReport(input: ReportInput): SessionReport {
  const { session, patient, sets, form_events, session_history } = input;
  const started = new Date(session.started_at);
  const dur = durationMinutes(session.started_at, session.ended_at ?? null);

  const exercises = summarizeSets(sets);
  const totalReps = exercises.reduce((sum, e) => sum + e.total_reps, 0);
  const formScores = sets
    .map((s) => s.form_score)
    .filter((x): x is number => typeof x === "number");
  const avgForm =
    formScores.length > 0
      ? formScores.reduce((a, b) => a + b, 0) / formScores.length
      : 0;
  const painDelta =
    session.pain_pre != null && session.pain_post != null
      ? session.pain_post - session.pain_pre
      : null;

  const sorted = session_history
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sessionNumber = Math.max(
    1,
    sorted.findIndex((s) => s.id === session.id) + 1 || sorted.length,
  );

  const sections: ReportSection[] = [];

  // Today — a single tight paragraph covering duration, volume, form, pain.
  const todayParts: string[] = [];
  if (exercises.length > 0) {
    todayParts.push(
      `You worked through ${exercises.length} exercise${exercises.length === 1 ? "" : "s"} — ${totalReps} rep${totalReps === 1 ? "" : "s"} in ${dur} minute${dur === 1 ? "" : "s"}.`,
    );
  } else {
    todayParts.push(
      `No exercises completed this session — you exited before any reps were recorded.`,
    );
  }
  if (formScores.length > 0) {
    todayParts.push(`Average form scored ${Math.round(avgForm * 100)}%.`);
  }
  if (session.pain_pre != null) {
    const post = session.pain_post ?? null;
    if (post != null && painDelta != null) {
      const delta =
        painDelta < 0
          ? `down ${Math.abs(painDelta)}`
          : painDelta > 0
            ? `up ${painDelta}`
            : "flat";
      todayParts.push(`Pain ${session.pain_pre}/10 → ${post}/10 (${delta}).`);
    } else {
      todayParts.push(`Starting pain ${session.pain_pre}/10.`);
    }
  }
  sections.push({ heading: "Today", content: todayParts.join(" ") });

  // Watch out — only when faults actually showed up.
  if (form_events.length > 0) {
    const byFault = new Map<string, number>();
    for (const e of form_events) {
      const key = e.fault ?? "unspecified";
      byFault.set(key, (byFault.get(key) ?? 0) + 1);
    }
    const top = Array.from(byFault.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([fault]) => fault.replace(/_/g, " "))
      .join(" and ");
    sections.push({
      heading: "Watch out",
      content: `Most frequent fault${byFault.size === 1 ? "" : "s"}: ${top}. Focus on cleaning ${byFault.size === 1 ? "this" : "these"} up before adding volume.`,
    });
  }

  const recommendations: string[] = [];
  if (avgForm >= 0.85) {
    recommendations.push(
      "Form is clean — progress load or complexity next session.",
    );
  } else if (avgForm > 0 && avgForm < 0.7) {
    recommendations.push(
      "Form is lagging — slow tempo, fewer reps, prioritize quality.",
    );
  }
  if (painDelta != null && painDelta <= -1) {
    recommendations.push(
      "Pain dropped during the session — the current dosage is working.",
    );
  } else if (painDelta != null && painDelta >= 2) {
    recommendations.push(
      "Pain spiked — scale back next session and check in on symptoms.",
    );
  }
  if (recommendations.length === 0) {
    recommendations.push("Hold the current program; reassess after one more session.");
  }

  return {
    title: `Session ${sessionNumber} — ${started.toLocaleDateString()}`,
    date: toIso(session.started_at),
    patient_name: patient?.name ?? "Patient",
    session_number: sessionNumber,
    overall_score:
      formScores.length > 0 ? Math.round(avgForm * 100) : undefined,
    sections,
    recommendations,
  };
}

function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore
  }
  // Pull from the first balanced { ... } block — handles code fences or prose.
  const start = trimmed.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = trimmed.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
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

/**
 * Append a per-session entry to the patient's running case_notes.md. Guarded
 * by a session-id marker so repeat views of the same report don't duplicate
 * the entry (the report route regenerates on every GET).
 */
async function recordSessionInCaseNotes(
  input: ReportInput,
  report: SessionReport,
): Promise<void> {
  const marker = `<!-- session:${input.session.id} -->`;
  const existing = (await readMemoryFile(input.session.patient_id, "case_notes.md")) ?? "";
  if (existing.includes(marker)) return;

  const dateLabel = new Date(input.session.started_at).toLocaleDateString();
  const exerciseLines = summarizeSets(input.sets)
    .map((e) => {
      const form = e.avg_form_score != null
        ? `form ${Math.round(e.avg_form_score * 100)}%`
        : "form —";
      return `  - ${e.exercise_name}: ${e.sets_completed}×${
        e.per_set[0]?.reps ?? 0
      }, ${form}`;
    })
    .join("\n");

  const faultCounts = new Map<string, number>();
  for (const ev of input.form_events) {
    const key = ev.fault ?? "unspecified";
    faultCounts.set(key, (faultCounts.get(key) ?? 0) + 1);
  }
  const topFaults = Array.from(faultCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([fault, count]) => `${fault} (${count})`)
    .join(", ");

  const painLine =
    input.session.pain_pre != null || input.session.pain_post != null
      ? `- Pain: ${input.session.pain_pre ?? "—"}/10 → ${
          input.session.pain_post ?? "—"
        }/10`
      : "";

  const entry = [
    marker,
    `## Session ${report.session_number ?? ""} — ${dateLabel}`,
    painLine,
    exerciseLines ? `- Exercises:\n${exerciseLines}` : "",
    topFaults ? `- Top faults: ${topFaults}` : "",
    report.recommendations.length > 0
      ? `- Next: ${report.recommendations[0]}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const separator = existing.trim().length > 0 ? "\n\n" : "";
  await writeMemoryFile(
    input.session.patient_id,
    "case_notes.md",
    `${existing}${separator}${entry}\n`,
  );
}

export async function generateReport(input: ReportInput): Promise<SessionReport> {
  const fallback = buildFallbackReport(input);

  // Give Claude the already-aggregated workout data so it reasons over real
  // numbers rather than inventing shape or filling with placeholders.
  const aggregated = {
    patient_name: fallback.patient_name,
    session_number: fallback.session_number,
    date: fallback.date,
    duration_minutes: durationMinutes(
      input.session.started_at,
      input.session.ended_at ?? null,
    ),
    pain_pre: input.session.pain_pre ?? null,
    pain_post: input.session.pain_post ?? null,
    exercises: summarizeSets(input.sets),
    form_events: input.form_events.map((e) => ({
      fault: e.fault ?? null,
      severity: e.severity ?? null,
    })),
    session_history: input.session_history.map((s) => ({
      date: toIso(s.date),
      pain_pre: s.pain_pre ?? null,
      pain_post: s.pain_post ?? null,
    })),
  };

  const instruction = `Generate the session report for the workout data below. Output ONLY a single JSON object (no prose, no code fences) matching this shape:

{
  "title": string,
  "date": ISO-8601 string,
  "patient_name": string,
  "session_number": number,
  "overall_score": number 0-100,
  "sections": [{ "heading": string, "content": string }],
  "recommendations": string[],
  "outcome_measure"?: { "instrument": string, "current_score": number, "initial_score": number, "change": number, "mcid_achieved": boolean }
}

Structure (prefer ≤3 sections — skip any that would be padding):
1. "Today" — 2–3 sentences: what stood out this session (biggest form gain, fault pattern that showed up, pain change). Specific to today's numbers.
2. "Trend" — 2–3 sentences: how today fits the last few sessions. If there's no prior history, skip this section entirely.
3. "Watch out" — 1–2 sentences naming the single most important fault to address next session, only when there's a clear one. Omit otherwise.

Do not include "charts" fields — the UI is text-only right now.

Use the actual numbers. Reference specific exercises, specific form scores, specific rep counts, specific pain values. Do not invent data not present below.

WORKOUT DATA:
${JSON.stringify(aggregated, null, 2)}`;

  let report: SessionReport = fallback;
  try {
    const result = await callClaudeSimple({
      model: "claude-sonnet-4-6",
      system: REPORT_SYSTEM,
      prompt: instruction,
      maxTokens: 4096,
    });
    const parsed = extractJson(result);
    if (isReport(parsed)) report = parsed;
  } catch {
    // fall through to fallback
  }

  // Fire-and-forget memory append so a slow or failed write never blocks
  // the report response. Guarded against duplicates by session id.
  recordSessionInCaseNotes(input, report).catch((err) => {
    console.error("[sessionReport] case_notes append failed", err);
  });

  return report;
}
