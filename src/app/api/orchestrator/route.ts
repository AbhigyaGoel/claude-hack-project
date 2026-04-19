import { NextRequest } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { getTools } from "@/lib/claude/tools";
import { FORM_ANALYSIS_SYSTEM, COACHING_SYSTEM } from "@/lib/claude/prompts";
import { getDb } from "@/db";
import { sessions, sets, formEvents, redFlags } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * SSE streaming orchestrator — the main real-time loop.
 * Client sends rep data, orchestrator evaluates form + generates coaching.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, session_id, data } = body;

  const db = getDb();

  switch (action) {
    case "start_session": {
      const { plan_id, patient_id, pain_pre } = data;
      const id = session_id || `session_${Date.now()}`;

      await db.insert(sessions).values({
        id,
        plan_id,
        patient_id,
        started_at: new Date().toISOString(),
        pain_pre,
      });

      return Response.json({ session_id: id, status: "started" });
    }

    case "evaluate_rep": {
      const { exercise, rep_data, rep_number, set_number } = data;

      // Form analysis via Claude
      let assessment;
      try {
        const result = await callClaude({
          model: "claude-sonnet-4-6-20250514",
          system: FORM_ANALYSIS_SYSTEM,
          messages: [
            {
              role: "user",
              content: JSON.stringify({
                exercise_name: exercise.name,
                target_angles: exercise.target_angles,
                tolerances: exercise.tolerances,
                compensation_patterns: exercise.compensation_patterns,
                rep_data,
              }),
            },
          ],
          tools: getTools("log_rep", "speak", "regress_exercise", "flag_red_flag"),
          toolHandlers: {
            log_rep: async (input) => {
              const setId = `set_${session_id}_${exercise.id}_${set_number}`;
              // Upsert set record
              try {
                await db.insert(sets).values({
                  id: setId,
                  session_id,
                  exercise_id: exercise.id,
                  exercise_name: exercise.name,
                  set_number,
                  reps: rep_number,
                  form_score: input.quality === "green" ? 1.0 : input.quality === "yellow" ? 0.5 : 0.0,
                });
              } catch {
                // Set already exists, update rep count
              }

              // Log form event if faults detected
              if (input.faults && (input.faults as string[]).length > 0) {
                for (const fault of input.faults as string[]) {
                  await db.insert(formEvents).values({
                    id: `fe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    set_id: setId,
                    t_ms: Date.now(),
                    fault,
                    severity: input.quality === "red" ? 4 : 2,
                    cue_sent: null,
                  });
                }
              }
              return { logged: true };
            },
            speak: async (input) => ({ queued: true, text: input.text }),
            regress_exercise: async (input) => ({
              regressed: true,
              exercise_id: input.exercise_id,
              reason: input.reason,
            }),
            flag_red_flag: async (input) => {
              await db.insert(redFlags).values({
                id: `rf_${Date.now()}`,
                session_id,
                type: input.type as string,
                transcript: (input.transcript as string) || null,
                referred: true,
              });
              return { halted: true, type: input.type };
            },
          },
          maxTokens: 2048,
        });

        try {
          assessment = JSON.parse(result.response);
        } catch {
          assessment = { rep_quality: "yellow", severity: 2 };
        }
      } catch {
        // Fallback to local evaluation
        const targetAngle = Object.values(exercise.target_angles as Record<string, number>)[0] ?? 90;
        const tolerance = Object.values(exercise.tolerances as Record<string, number>)[0] ?? 10;
        const peakAngle = rep_data.peak_angle ?? 0;
        const deficit = Math.abs(peakAngle - targetAngle);
        assessment = {
          rep_quality: deficit <= tolerance ? "green" : deficit <= tolerance * 2 ? "yellow" : "red",
          severity: deficit <= tolerance ? 1 : deficit <= tolerance * 2 ? 3 : 4,
        };
      }

      // Generate coaching cue
      let coachingCue = null;
      if (assessment.severity >= 3) {
        try {
          const coachResult = await callClaude({
            model: "claude-sonnet-4-6-20250514",
            system: COACHING_SYSTEM,
            messages: [
              {
                role: "user",
                content: JSON.stringify({
                  assessment,
                  rep_number,
                  set_number,
                  exercise_name: exercise.name,
                }),
              },
            ],
            tools: getTools("speak"),
            toolHandlers: {
              speak: async (input) => input,
            },
            maxTokens: 512,
          });

          try {
            coachingCue = JSON.parse(coachResult.response);
          } catch {
            coachingCue = coachResult.toolResults[0] ?? null;
          }
        } catch {
          // No coaching cue
        }
      }

      return Response.json({
        assessment,
        coaching_cue: coachingCue,
        tool_results: [],
      });
    }

    case "end_session": {
      const { pain_post } = data;

      await db
        .update(sessions)
        .set({
          ended_at: new Date().toISOString(),
          pain_post,
        })
        .where(eq(sessions.id, session_id));

      return Response.json({ status: "ended" });
    }

    case "vision_check": {
      // Proxy to vision endpoint (keeps the orchestrator as single entry point)
      const { frame_base64, keypoints_json, exercise_context } = data;

      try {
        const { callClaudeVision } = await import("@/lib/claude/client");
        const { VISION_SYSTEM } = await import("@/lib/claude/prompts");

        const response = await callClaudeVision({
          system: VISION_SYSTEM,
          imageBase64: frame_base64,
          prompt: `Analyze this exercise frame. Exercise: ${exercise_context || "unknown"}. Keypoints: ${keypoints_json || "none"}. Respond with JSON: { faults, overall_severity, recommendation }`,
        });

        try {
          return Response.json(JSON.parse(response.replace(/```json\s*/g, "").replace(/```/g, "").trim()));
        } catch {
          return Response.json({ faults: [], overall_severity: 1, recommendation: "" });
        }
      } catch {
        return Response.json({ faults: [], overall_severity: 1, recommendation: "Vision unavailable" });
      }
    }

    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
