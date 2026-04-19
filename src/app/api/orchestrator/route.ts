import { NextRequest } from "next/server";
import { callClaudeSimple, callClaudeVision, streamClaude } from "@/lib/claude/client";
import {
  FORM_CRITIC_SYSTEM,
  SAFETY_MONITOR_SYSTEM,
  NARRATOR_SYSTEM,
  CUE_GENERATOR_SYSTEM,
} from "@/lib/claude/prompts";
import { loadPatientContext } from "@/lib/claude/memory";
import { queryExercises } from "@/lib/exercises";
import { getTools } from "@/lib/claude/tools";
import { getDb } from "@/db";
import { sessions, sets, repAnalyses, redFlags, narratorLog } from "@/db/schema";
import { eq } from "drizzle-orm";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface SSEEvent {
  type: "assessment" | "cue" | "narrator" | "halt" | "status" | "error" | "done";
  data: unknown;
}

function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseJSON<T>(raw: string, fallback: T): T {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

/**
 * SSE streaming orchestrator — the main real-time loop.
 * Spawns form-critic, safety-monitor, and narrator as parallel calls.
 * Uses prompt caching for session-long cached prefix.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, session_id, data } = body;

  const db = getDb();

  // Non-streaming actions return JSON directly
  if (action === "start_session") {
    return handleStartSession(db, session_id, data);
  }

  if (action === "end_session") {
    return handleEndSession(db, session_id, data);
  }

  if (action === "halt_session") {
    return handleHaltSession(db, session_id, data);
  }

  if (action === "evaluate_rep") {
    return handleEvaluateRep(db, session_id, data);
  }

  return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

async function handleStartSession(
  db: ReturnType<typeof getDb>,
  sessionId: string | undefined,
  data: Record<string, unknown>,
) {
  const { plan_id, patient_id, pain_pre } = data as {
    plan_id: string;
    patient_id: string;
    pain_pre?: number;
  };

  const id = sessionId ?? `session_${Date.now()}`;

  await db.insert(sessions).values({
    id,
    plan_id,
    patient_id,
    started_at: new Date().toISOString(),
    pain_pre: pain_pre ?? null,
  });

  return Response.json({
    type: "status",
    data: { session_id: id, status: "started" },
  });
}

async function handleEndSession(
  db: ReturnType<typeof getDb>,
  sessionId: string,
  data: Record<string, unknown>,
) {
  const { pain_post } = data as { pain_post?: number };

  await db
    .update(sessions)
    .set({
      ended_at: new Date().toISOString(),
      pain_post: pain_post ?? null,
    })
    .where(eq(sessions.id, sessionId));

  return Response.json({
    type: "status",
    data: { session_id: sessionId, status: "ended" },
  });
}

async function handleHaltSession(
  db: ReturnType<typeof getDb>,
  sessionId: string,
  data: Record<string, unknown>,
) {
  const { reason, red_flag_type } = data as {
    reason?: string;
    red_flag_type?: string;
  };

  // Record the halt
  await db.insert(redFlags).values({
    id: generateId("rf"),
    session_id: sessionId,
    type: red_flag_type ?? "manual_halt",
    transcript: reason ?? null,
    halted: true,
    referred: true,
  });

  // End the session
  await db
    .update(sessions)
    .set({ ended_at: new Date().toISOString() })
    .where(eq(sessions.id, sessionId));

  return Response.json({
    type: "halt",
    data: {
      session_id: sessionId,
      status: "halted",
      reason: reason ?? "Session halted",
    },
  });
}

async function handleEvaluateRep(
  db: ReturnType<typeof getDb>,
  sessionId: string,
  data: Record<string, unknown>,
) {
  const {
    exercise,
    rep_data,
    keypoints_timeseries,
    frame_base64,
    rep_number,
    set_number,
    patient_id,
  } = data as {
    exercise: {
      id: string;
      name: string;
      target_angles?: Record<string, number>;
      tolerances?: Record<string, number>;
      compensation_patterns?: string[];
    };
    rep_data: Record<string, unknown>;
    keypoints_timeseries?: unknown[];
    frame_base64?: string;
    rep_number: number;
    set_number: number;
    patient_id?: string;
  };

  const encoder = new TextEncoder();
  const sessionStartMs = Date.now();

  // Build cached system parts for prompt caching
  const patientContext = patient_id ? loadPatientContext(patient_id) : "";
  const exerciseLibrary = queryExercises({ body_region: undefined });
  const exerciseLibraryJson = JSON.stringify(
    exerciseLibrary.map((ex) => ({
      id: ex.id,
      name: ex.name,
      body_region: ex.body_region,
      category: ex.category,
      target_angles: ex.target_angles,
      compensation_patterns: ex.compensation_patterns.map((cp) => cp.name),
    })),
  );
  const toolDefs = getTools(
    "log_rep", "progress_exercise", "regress_exercise", "flag_red_flag",
  );
  const toolDefsJson = JSON.stringify(toolDefs);
  const sessionContext = JSON.stringify({
    session_id: sessionId,
    exercise_name: exercise.name,
    rep_number,
    set_number,
  });

  // Cached system parts — the last part gets cache_control: ephemeral via buildCachedSystem()
  const formCriticSystemParts = [
    FORM_CRITIC_SYSTEM,
    `\n\nExercise Library:\n${exerciseLibraryJson}`,
    `\n\nPatient Profile:\n${patientContext}`,
    `\n\nTool Definitions:\n${toolDefsJson}`,
  ];

  const formCriticPrompt = JSON.stringify({
    exercise_name: exercise.name,
    exercise_id: exercise.id,
    target_angles: exercise.target_angles ?? {},
    tolerances: exercise.tolerances ?? {},
    compensation_patterns: exercise.compensation_patterns ?? [],
    rep_data,
    keypoints_timeseries: keypoints_timeseries ?? [],
  });

  const safetyPrompt = JSON.stringify({
    session_id: sessionId,
    keypoints: keypoints_timeseries ? keypoints_timeseries[keypoints_timeseries.length - 1] : null,
    timestamp: new Date().toISOString(),
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(formatSSE({
          type: "status",
          data: { message: "Evaluating rep...", rep_number, set_number },
        })));

        // Spawn form-critic and safety-monitor in parallel
        const [formResult, safetyResult] = await Promise.all([
          runFormCritic(formCriticPrompt, frame_base64, formCriticSystemParts),
          runSafetyMonitor(safetyPrompt, frame_base64),
        ]);

        // Check safety first — if halt, stop immediately
        if (safetyResult.halt) {
          // Write red flag to DB
          await db.insert(redFlags).values({
            id: generateId("rf"),
            session_id: sessionId,
            type: safetyResult.red_flag_type ?? "unknown",
            transcript: null,
            halted: true,
            referred: safetyResult.severity >= 4,
          });

          controller.enqueue(encoder.encode(formatSSE({
            type: "halt",
            data: safetyResult,
          })));
          controller.enqueue(encoder.encode(formatSSE({ type: "done", data: null })));
          controller.close();
          return;
        }

        // Send assessment
        controller.enqueue(encoder.encode(formatSSE({
          type: "assessment",
          data: formResult,
        })));

        // Log rep analysis
        const setId = `set_${sessionId}_${exercise.id}_${set_number}`;
        try {
          await db.insert(sets).values({
            id: setId,
            session_id: sessionId,
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            set_number,
            reps: rep_number,
            form_score: formResult.quality,
          });
        } catch {
          // Set already exists — that's fine
        }

        await db.insert(repAnalyses).values({
          id: generateId("ra"),
          set_id: setId,
          rep_num: rep_number,
          video_clip_url: null,
          faults_json: JSON.stringify(formResult.faults),
          quality: formResult.quality,
        });

        // Generate cue if faults detected or quality is low
        const needsCue = formResult.quality < 0.8 || (formResult.faults && formResult.faults.length > 0);
        if (needsCue) {
          const cue = await runCueGenerator(formResult, rep_number, set_number, exercise.name);
          controller.enqueue(encoder.encode(formatSSE({
            type: "cue",
            data: cue,
          })));
        }

        // Stream narrator reasoning (non-blocking)
        if (patient_id) {
          const narratorSystemParts = [
            NARRATOR_SYSTEM,
            `\n\nExercise Library:\n${exerciseLibraryJson}`,
            `\n\n## Patient Context\n${patientContext}`,
            `\n\n## Session Context\n${sessionContext}`,
          ];

          const narratorPrompt = JSON.stringify({
            session_id: sessionId,
            current_exercise: exercise.name,
            rep_data,
            assessment: formResult,
            safety_check: { severity: safetyResult.severity },
          });

          let narratorFullText = "";

          try {
            const narratorStream = streamClaude({
              model: "claude-opus-4-7",
              system: NARRATOR_SYSTEM,
              systemParts: narratorSystemParts,
              messages: [
                {
                  role: "user",
                  content: `Clinical reasoning narration:\n${narratorPrompt}`,
                },
              ],
              maxTokens: 1024,
              thinking: { type: "enabled", budget_tokens: 4096 },
            });

            for await (const chunk of narratorStream) {
              if (chunk.type === "text") {
                narratorFullText += chunk.content;
                controller.enqueue(encoder.encode(formatSSE({
                  type: "narrator",
                  data: { content: chunk.content },
                })));
              }
            }

            // Log narrator output
            if (narratorFullText.length > 0) {
              await db.insert(narratorLog).values({
                id: generateId("nl"),
                session_id: sessionId,
                t_ms: Date.now() - sessionStartMs,
                reasoning_text: narratorFullText,
              });
            }
          } catch {
            // Narrator failure is non-critical — don't crash the session
          }
        }

        controller.enqueue(encoder.encode(formatSSE({ type: "done", data: null })));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Orchestrator error";
        controller.enqueue(encoder.encode(formatSSE({
          type: "error",
          data: { message },
        })));
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// --- Agent runners ---

async function runFormCritic(prompt: string, frameBase64?: string, systemParts?: string[]) {
  const defaultResult = {
    faults: [],
    quality: 0.5,
    compensations: [],
    tempo_deviation: 0,
  };

  try {
    let raw: string;
    if (frameBase64) {
      // Vision calls don't support systemParts yet — use plain system
      raw = await callClaudeVision({
        model: "claude-sonnet-4-6",
        system: systemParts ? systemParts.join("") : FORM_CRITIC_SYSTEM,
        imageBase64: frameBase64,
        prompt: `Analyze this rep with visual + keypoint data:\n${prompt}\n\nOutput RepAnalysis JSON.`,
        maxTokens: 2048,
      });
    } else {
      // Use streaming-compatible callClaudeSimple with cached system
      raw = await callClaudeSimple({
        model: "claude-sonnet-4-6",
        system: FORM_CRITIC_SYSTEM,
        systemParts,
        prompt: `Analyze this rep:\n${prompt}\n\nOutput RepAnalysis JSON.`,
        maxTokens: 2048,
      });
    }
    return parseJSON(raw, defaultResult);
  } catch {
    return defaultResult;
  }
}

async function runSafetyMonitor(prompt: string, frameBase64?: string) {
  const defaultResult = {
    halt: false,
    red_flag_type: null as string | null,
    severity: 1,
    reasoning: "",
    recommendation: "",
  };

  try {
    let raw: string;
    if (frameBase64) {
      raw = await callClaudeVision({
        model: "claude-haiku-4-5-20251001",
        system: SAFETY_MONITOR_SYSTEM,
        imageBase64: frameBase64,
        prompt: `Safety check:\n${prompt}\n\nOutput safety JSON.`,
        maxTokens: 512,
      });
    } else {
      raw = await callClaudeSimple({
        model: "claude-haiku-4-5-20251001",
        system: SAFETY_MONITOR_SYSTEM,
        prompt: `Safety check:\n${prompt}\n\nOutput safety JSON.`,
        maxTokens: 512,
      });
    }
    return parseJSON(raw, defaultResult);
  } catch {
    return defaultResult;
  }
}

async function runCueGenerator(
  assessment: Record<string, unknown>,
  repNumber: number,
  setNumber: number,
  exerciseName: string,
) {
  const defaultCue = {
    text: "Keep going, nice and steady.",
    emotion: "encouraging" as const,
    priority: 1,
    interrupt_current: false,
  };

  try {
    const prompt = JSON.stringify({
      assessment,
      rep_number: repNumber,
      set_number: setNumber,
      exercise_name: exerciseName,
    });

    const raw = await callClaudeSimple({
      model: "claude-haiku-4-5-20251001",
      system: CUE_GENERATOR_SYSTEM,
      prompt: `Generate a coaching cue:\n${prompt}\n\nOutput cue JSON.`,
      maxTokens: 256,
    });

    return parseJSON(raw, defaultCue);
  } catch {
    return defaultCue;
  }
}
