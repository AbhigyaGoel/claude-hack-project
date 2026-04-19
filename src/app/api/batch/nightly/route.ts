import { NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { getDb } from "@/db";
import { patients, sessions, sets, formEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { loadPatientContext, writeMemoryFile } from "@/lib/claude/memory";

const BATCH_ANALYSIS_SYSTEM = `You are the Batch Analyst for Vero AI Physical Therapy.

You run nightly across all active patients. Your job:
1. Re-analyze the last 7 days of session data per patient
2. Detect longitudinal patterns that per-session analysis misses
3. Update pattern_observations.md memory files
4. Flag patients who are plateauing or need human PT review

Pattern types to detect:
- Fatigue patterns: "knee valgus only after rep 8 — likely glute med fatigue"
- Compensation trends: "lumbar extension compensating for hip flexion deficit across last 3 sessions"
- Plateau detection: "<2% ROM improvement over 3+ sessions"
- Pain trajectory: increasing/decreasing/stable trends
- Adherence gaps: missed sessions, shortened sessions
- Asymmetry trends: consistent L/R differences

Output JSON:
{
  "patient_id": string,
  "patterns_detected": [{ "type": string, "description": string, "severity": 1-5, "evidence": string }],
  "plateau_flags": [{ "metric": string, "sessions_stagnant": number, "current_value": number }],
  "recommendations": string[],
  "needs_pt_review": boolean,
  "review_reason": string | null,
  "memory_updates": { "filename": string, "content": string }[]
}`;

/**
 * Batch nightly analysis — cron-triggered.
 * Re-analyzes last 7 days of sessions for all active patients.
 * Updates pattern_observations.md memory files.
 * Flags plateauing patients for human PT review via vero-mcp.
 */
export async function POST() {
  const db = getDb();

  // Get all patients
  const allPatients = await db.select().from(patients);
  const results = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const patient of allPatients) {
    const patientId = patient.id;
    const profile = (patient.profile_json ?? {}) as { name?: string };

    // Get recent sessions
    const recentSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.patient_id, patientId))
      .orderBy(desc(sessions.started_at));

    const filteredSessions = recentSessions.filter(
      (s) => s.started_at != null && s.started_at >= sevenDaysAgo,
    );

    if (filteredSessions.length === 0) continue;

    // Gather exercise data for each session
    const sessionData = [];
    for (const session of filteredSessions) {
      const sessionSets = await db
        .select()
        .from(sets)
        .where(eq(sets.session_id, session.id));

      const sessionEvents = [];
      for (const set of sessionSets) {
        const events = await db
          .select()
          .from(formEvents)
          .where(eq(formEvents.set_id, set.id));
        sessionEvents.push(...events);
      }

      sessionData.push({
        session_id: session.id,
        date: session.started_at,
        pain_pre: session.pain_pre,
        pain_post: session.pain_post,
        sets: sessionSets.map((s) => ({
          exercise: s.exercise_name,
          set_number: s.set_number,
          reps: s.reps,
          form_score: s.form_score,
        })),
        form_events: sessionEvents.map((e) => ({
          fault: e.fault,
          severity: e.severity,
          t_ms: e.t_ms,
        })),
      });
    }

    // Load existing patient context
    const existingContext = await loadPatientContext(patientId);

    try {
      const result = await callClaude({
        model: "claude-opus-4-7-20250219",
        system: BATCH_ANALYSIS_SYSTEM,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              patient_id: patientId,
              patient_profile: profile,
              existing_observations: existingContext,
              recent_sessions: sessionData,
              total_sessions_all_time: recentSessions.length,
            }),
          },
        ],
        tools: [],
        toolHandlers: {},
        maxTokens: 4096,
        thinking: { type: "enabled", budget_tokens: 8000 },
      });

      let analysis;
      try {
        const cleaned = result.response
          .replace(/```json\s*/g, "")
          .replace(/```/g, "")
          .trim();
        analysis = JSON.parse(cleaned);
      } catch {
        analysis = {
          patient_id: patientId,
          patterns_detected: [],
          plateau_flags: [],
          recommendations: [],
          needs_pt_review: false,
          review_reason: null,
          memory_updates: [],
        };
      }

      // Apply memory updates
      if (analysis.memory_updates) {
        for (const update of analysis.memory_updates) {
          await writeMemoryFile(patientId, update.filename, update.content);
        }
      }

      // Always update pattern_observations.md with detected patterns
      if (analysis.patterns_detected?.length > 0) {
        const patternsContent = [
          `# Pattern Observations — Updated ${new Date().toISOString().split("T")[0]}`,
          "",
          ...analysis.patterns_detected.map(
            (p: { type: string; description: string; severity: number; evidence: string }) =>
              `## ${p.type} (severity: ${p.severity}/5)\n${p.description}\n**Evidence:** ${p.evidence}\n`,
          ),
        ].join("\n");

        await writeMemoryFile(patientId, "pattern_observations.md", patternsContent);
      }

      results.push({
        patient_id: patientId,
        patient_name: profile.name,
        sessions_analyzed: filteredSessions.length,
        patterns_found: analysis.patterns_detected?.length ?? 0,
        plateaus: analysis.plateau_flags?.length ?? 0,
        needs_pt_review: analysis.needs_pt_review ?? false,
        review_reason: analysis.review_reason,
      });
    } catch (error) {
      results.push({
        patient_id: patientId,
        patient_name: profile.name,
        error: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  }

  return NextResponse.json({
    analyzed_at: new Date().toISOString(),
    patients_analyzed: results.length,
    patients_needing_review: results.filter((r) => "needs_pt_review" in r && r.needs_pt_review).length,
    results,
  });
}
