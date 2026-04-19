import type { SessionState } from "@/types/session";
import type { FormAssessment } from "@/types/assessment";
import { callClaude, type ToolDef as ClaudeTool } from "@/lib/claude/client";

export interface SessionMetrics {
  exercises_completed: number;
  exercises_prescribed: number;
  total_reps: number;
  avg_form_quality: number;
  compensations: Record<string, number>;
  rom_improvements: Record<string, number>;
  plateau_flags: string[];
  recommendations: string[];
}

export interface ChartDataPoint {
  session_number: number;
  date: string;
  metric: string;
  value: number;
}

const SYSTEM_PROMPT = `You are Agent 5 — Progress Analyst for Vero AI Physical Therapy.

You run post-session only. Your job:
1. Analyze completed session data
2. Calculate progress metrics
3. Detect plateaus (no improvement over 3+ sessions)
4. Generate D3.js-compatible chart data
5. Produce adaptation recommendations for the next session

All outputs MUST be structured JSON. No prose responses.

When analyzing sessions:
- Track ROM trends per exercise
- Calculate form quality percentages
- Count compensation pattern frequency
- Compare against previous sessions
- Flag plateaus when <2% improvement over 3 sessions`;

const tools: ClaudeTool[] = [
  {
    name: "analyze_session",
    description: "Analyze a completed session and produce metrics",
    input_schema: {
      type: "object" as const,
      properties: {
        session_data: { type: "object", description: "Full session state data" },
      },
      required: ["session_data"],
    },
  },
  {
    name: "detect_plateau",
    description: "Detect plateaus across session history",
    input_schema: {
      type: "object" as const,
      properties: {
        metric_history: {
          type: "array",
          items: { type: "object" },
          description: "Array of metric data points across sessions",
        },
        window_sessions: { type: "number", description: "Number of sessions to look back" },
      },
      required: ["metric_history", "window_sessions"],
    },
  },
  {
    name: "generate_chart_data",
    description: "Generate D3.js-compatible chart data for a metric",
    input_schema: {
      type: "object" as const,
      properties: {
        all_sessions: {
          type: "array",
          items: { type: "object" },
          description: "All session data",
        },
        metric: { type: "string", description: "Metric to chart" },
      },
      required: ["all_sessions", "metric"],
    },
  },
];

function calculateSessionMetrics(sessionState: SessionState): SessionMetrics {
  const assessments = sessionState.assessments;
  const totalReps = assessments.filter((a) => a.rep_counted).length;

  const qualityCounts = { green: 0, yellow: 0, red: 0 };
  for (const a of assessments) {
    qualityCounts[a.rep_quality]++;
  }
  const avgQuality = totalReps > 0
    ? Math.round((qualityCounts.green / totalReps) * 100)
    : 0;

  const compensations: Record<string, number> = {};
  for (const a of assessments) {
    for (const comp of a.compensations_detected) {
      compensations[comp] = (compensations[comp] || 0) + 1;
    }
  }

  return {
    exercises_completed: sessionState.current_exercise_index,
    exercises_prescribed: sessionState.plan?.exercises.length ?? 0,
    total_reps: totalReps,
    avg_form_quality: avgQuality,
    compensations,
    rom_improvements: {},
    plateau_flags: [],
    recommendations: generateRecommendations(assessments, compensations, avgQuality),
  };
}

function generateRecommendations(
  assessments: FormAssessment[],
  compensations: Record<string, number>,
  avgQuality: number,
): string[] {
  const recommendations: string[] = [];

  if (avgQuality < 60) {
    recommendations.push("Consider reducing difficulty or load — form quality is below threshold");
  }

  const topCompensation = Object.entries(compensations)
    .sort(([, a], [, b]) => b - a)[0];

  if (topCompensation && topCompensation[1] > 3) {
    recommendations.push(
      `Add corrective exercises for ${topCompensation[0]} — detected ${topCompensation[1]} times`,
    );
  }

  const tempoIssues = assessments.filter((a) => a.tempo_assessment !== "on_tempo").length;
  if (tempoIssues > assessments.length * 0.5) {
    recommendations.push("Focus on tempo control — more than half of reps had timing issues");
  }

  if (avgQuality >= 85) {
    recommendations.push("Form quality excellent — consider progressing difficulty next session");
  }

  return recommendations;
}

export async function analyzeSession(
  sessionState: SessionState,
  previousSessions: SessionMetrics[] = [],
): Promise<SessionMetrics> {
  const metrics = calculateSessionMetrics(sessionState);

  // Use Claude for deeper analysis if there's session history
  if (previousSessions.length > 0) {
    const toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
      analyze_session: async (input) => {
        return metrics;
      },
      detect_plateau: async (input) => {
        const window = (input.window_sessions as number) || 3;
        const history = previousSessions.slice(-window);
        if (history.length < window) return { plateaus: [] };

        const qualityTrend = history.map((s) => s.avg_form_quality);
        const maxDelta = Math.max(...qualityTrend.map((v, i) =>
          i > 0 ? Math.abs(v - qualityTrend[i - 1]) : 0,
        ));

        if (maxDelta < 2) {
          return { plateaus: ["form_quality"], message: "Form quality plateaued over last sessions" };
        }
        return { plateaus: [] };
      },
      generate_chart_data: async (input) => {
        const metric = input.metric as string;
        return previousSessions.map((s, i) => ({
          session_number: i + 1,
          date: new Date().toISOString(),
          metric,
          value: metric === "form_quality" ? s.avg_form_quality : s.total_reps,
        }));
      },
    };

    try {
      const result = await callClaude({
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              action: "full_analysis",
              current_session: metrics,
              session_history: previousSessions,
            }),
          },
        ],
        tools,
        toolHandlers,
      });

      // Parse any additional insights from Claude's response
      try {
        const parsed = JSON.parse(result.response);
        if (parsed.recommendations) {
          metrics.recommendations = [
            ...metrics.recommendations,
            ...parsed.recommendations,
          ];
        }
        if (parsed.plateau_flags) {
          metrics.plateau_flags = parsed.plateau_flags;
        }
      } catch {
        // Claude response wasn't JSON — use computed metrics as-is
      }
    } catch {
      // Claude API unavailable — return computed metrics
    }
  }

  return metrics;
}

export function generateChartData(
  sessions: SessionMetrics[],
  metric: "form_quality" | "total_reps",
): ChartDataPoint[] {
  return sessions.map((s, i) => ({
    session_number: i + 1,
    date: new Date().toISOString(),
    metric,
    value: metric === "form_quality" ? s.avg_form_quality : s.total_reps,
  }));
}
