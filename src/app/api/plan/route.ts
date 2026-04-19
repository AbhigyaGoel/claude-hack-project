import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude/client";
import { PROGRAMMING_SYSTEM } from "@/lib/claude/prompts";
import { getDb } from "@/db";
import { patients, plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { BodyRegion, ExerciseCategory, DifficultyTier } from "@/types/exercise";
import { queryExercises } from "@/lib/exercises";

const tools = [
  {
    name: "query_exercise_database",
    description: "Query the exercise library by body region, category, and difficulty",
    input_schema: {
      type: "object" as const,
      properties: {
        body_region: { type: "string" },
        category: { type: "string" },
        difficulty_range: { type: "array", items: { type: "number" } },
      },
      required: ["body_region"],
    },
  },
  {
    name: "generate_session_plan",
    description: "Output the final exercise plan with sets, reps, and progression rules",
    input_schema: {
      type: "object" as const,
      properties: {
        exercises: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              sets: { type: "number" },
              reps: { type: "number" },
              rest_seconds: { type: "number" },
            },
          },
        },
        estimated_duration_minutes: { type: "number" },
      },
      required: ["exercises"],
    },
  },
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patient_id } = body;

  // Get patient profile from DB
  const db = getDb();
  const patientRows = await db.select().from(patients).where(eq(patients.id, patient_id));
  if (patientRows.length === 0) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const profile = JSON.parse(patientRows[0].profile_json);
  const diagnostic = profile.diagnostic;

  // Determine difficulty range from severity
  const maxDifficulty = diagnostic.severity_score > 60 ? 2 : diagnostic.severity_score > 30 ? 3 : 4;

  // Query available exercises
  const availableExercises = queryExercises({
    body_region: diagnostic.body_region,
    difficulty_range: [1, maxDifficulty],
  });

  // Filter out contraindicated
  const safe = availableExercises.filter((ex) =>
    !ex.contraindications.some((c: string) =>
      diagnostic.contraindications.includes(c)
    )
  );

  let planData;

  try {
    const result = await callClaude({
      model: "claude-opus-4-7-20250219",
      system: PROGRAMMING_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            patient_profile: diagnostic,
            available_exercises: safe.map((e) => ({
              id: e.id,
              name: e.name,
              category: e.category,
              difficulty_tier: e.difficulty_tier,
              target_muscles: e.target_muscles,
              default_sets: e.default_sets,
              default_reps: e.default_reps,
            })),
          }),
        },
      ],
      tools,
      toolHandlers: {
        query_exercise_database: async (input) => {
          return queryExercises({
            body_region: (input.body_region as BodyRegion) || diagnostic.body_region,
            category: input.category as ExerciseCategory | undefined,
            difficulty_range: (input.difficulty_range as [DifficultyTier, DifficultyTier]) || [1, maxDifficulty as DifficultyTier],
          });
        },
        generate_session_plan: async (input) => input,
      },
      maxTokens: 4096,
    });

    try {
      planData = JSON.parse(result.response);
    } catch {
      // Use tool result directly
      planData = result.toolResults.find(
        (r) => r && typeof r === "object" && "exercises" in (r as Record<string, unknown>)
      );
    }
  } catch {
    // Fallback: deterministic plan
  }

  // Fallback if Claude didn't produce a plan
  if (!planData || !planData.exercises) {
    const selected = safe.slice(0, 5);
    planData = {
      exercises: selected.map((ex) => ({
        id: ex.id,
        name: ex.name,
        target_muscles: ex.target_muscles,
        target_angles: ex.target_angles,
        tolerances: ex.tolerances,
        tempo_seconds: ex.tempo_seconds,
        sets: ex.default_sets,
        reps: ex.default_reps,
        rest_seconds: 60,
        cues: ex.cues,
        compensation_patterns: ex.compensation_patterns,
        regression: ex.regression,
        progression: ex.progression,
      })),
      estimated_duration_minutes: 25,
      session_number: 1,
    };
  }

  // Enrich plan items with full exercise data
  const enrichedExercises = (planData.exercises as Array<Record<string, unknown>>).map((item) => {
    const full = safe.find((e) => e.id === item.id);
    if (!full) return item;
    return {
      ...item,
      target_muscles: full.target_muscles,
      target_angles: full.target_angles,
      tolerances: full.tolerances,
      tempo_seconds: full.tempo_seconds,
      sets: item.sets ?? full.default_sets,
      reps: item.reps ?? full.default_reps,
      rest_seconds: item.rest_seconds ?? 60,
      cues: full.cues,
      compensation_patterns: full.compensation_patterns,
      regression: full.regression,
      progression: full.progression,
    };
  });

  const plan = {
    session_number: planData.session_number ?? 1,
    estimated_duration_minutes: planData.estimated_duration_minutes ?? 25,
    exercises: enrichedExercises,
  };

  // Persist plan
  const planId = `plan_${Date.now()}`;
  await db.insert(plans).values({
    id: planId,
    patient_id,
    plan_json: JSON.stringify(plan),
    active: true,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ plan_id: planId, plan });
}
