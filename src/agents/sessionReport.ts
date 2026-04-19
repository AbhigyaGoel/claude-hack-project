import { callClaude } from "@/lib/claude/client";
import { REPORT_SYSTEM } from "@/lib/claude/prompts";
import { getTools } from "@/lib/claude/tools";

interface SessionRow {
  id: string;
  started_at: string;
  patient_id: string;
  plan_id: string;
  pain_pre?: number | null;
  pain_post?: number | null;
  summary_json?: string | null;
}

interface SetRow {
  id: string;
  exercise_name: string;
  reps: number;
  form_score?: number | null;
}

interface FormEventRow {
  id: string;
  set_id: string;
}

interface PriorSession {
  id: string;
  date: string;
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

export interface ReportSection {
  heading: string;
  content: string;
}

export interface ReportChart {
  type: string;
  title: string;
  data: unknown[];
}

export interface SessionReport {
  title: string;
  date: string;
  patient_name: string;
  sections: ReportSection[];
  recommendations: string[];
  charts: ReportChart[];
}

function buildFallbackReport(input: ReportInput): SessionReport {
  const { session, patient, sets, form_events, session_history } = input;
  const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
  const avgForm =
    sets.length > 0
      ? Math.round((sets.reduce((sum, s) => sum + (s.form_score ?? 0), 0) / sets.length) * 100)
      : 0;

  return {
    title: `Session Report — ${new Date(session.started_at).toLocaleDateString()}`,
    date: session.started_at,
    patient_name: patient?.name || "Patient",
    sections: [
      {
        heading: "Session Overview",
        content: `${sets.length} exercises, ${totalReps} total reps. Pain: ${session.pain_pre}/10 → ${session.pain_post}/10.`,
      },
      {
        heading: "Exercise Performance",
        content: sets
          .map(
            (s) =>
              `${s.exercise_name}: ${s.reps} reps, form ${Math.round((s.form_score ?? 0) * 100)}%`,
          )
          .join("\n"),
      },
      {
        heading: "Form Quality",
        content: `Average form quality: ${avgForm}%. ${form_events.length} form events detected.`,
      },
    ],
    recommendations:
      avgForm >= 85
        ? ["Consider progressing difficulty next session"]
        : ["Focus on form quality before increasing difficulty"],
    charts: [
      {
        type: "line",
        title: "Pain Trend",
        data: session_history.map((s, i) => ({
          session: i + 1,
          pain_pre: s.pain_pre,
          pain_post: s.pain_post,
        })),
      },
    ],
  };
}

export async function generateReport(input: ReportInput): Promise<SessionReport> {
  const result = await callClaude({
    model: "claude-opus-4-7",
    system: REPORT_SYSTEM,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          action: "generate_full_report",
          session_data: input,
        }),
      },
    ],
    tools: getTools("generate_report", "query_history"),
    toolHandlers: {
      generate_report: async (toolInput) => toolInput,
      query_history: async () => input.session_history,
    },
    maxTokens: 8192,
  });

  let report: SessionReport | undefined;
  try {
    report = JSON.parse(result.response) as SessionReport;
  } catch {
    const fromTool = result.toolResults.find(
      (r) => r && typeof r === "object" && "title" in (r as Record<string, unknown>),
    );
    if (fromTool) report = fromTool as SessionReport;
  }

  if (!report || !report.title) {
    report = buildFallbackReport(input);
  }

  return report;
}
