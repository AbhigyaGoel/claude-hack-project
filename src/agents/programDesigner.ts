import type { ToolDef as ClaudeTool } from "@/lib/claude/client";
import type { PatientProfile } from "@/types/patient";
import type {
  ExercisePlan,
  ExercisePlanItem,
  Exercise,
  BodyRegion,
  ExerciseCategory,
  DifficultyTier,
} from "@/types/exercise";
import type { SessionData } from "@/types/session";
import { queryExercises } from "@/lib/exercises";
import { callClaude } from "@/lib/claude/client";

const SYSTEM_PROMPT = `You are Agent 2 — the Program Designer for Vero, an AI physical therapy system.

Your role:
- Take a Patient Profile JSON from Agent 1 (Diagnostic Interviewer).
- Query the exercise database to find suitable exercises.
- Generate a personalized session plan with progressions/regressions.

Guidelines:
- ALWAYS use the query_exercise_database tool to find exercises before generating a plan.
- Consider the patient's severity score, functional deficits, and contraindications.
- Start with lower difficulty tiers for higher severity scores.
- Respect contraindications — never include exercises with matching contraindications.
- If session history is provided, use it to adjust difficulty and progression.
- Typical session: 3-5 exercises, 2-3 sets each, 25-35 minutes total.
- Order exercises: mobility/stretching first, then stabilization, then strengthening.
- All output MUST be structured JSON via the generate_session_plan tool. Never generate prose.

Difficulty selection by severity:
- Severity 0-20 (mild): tiers 3-5
- Severity 21-50 (moderate): tiers 2-4
- Severity 51-70 (moderate-severe): tiers 1-3
- Severity 71-100 (severe): tiers 1-2

Session progression rules:
- If prior session form quality avg >= 85%: progress difficulty tier +1
- If prior session form quality avg < 60%: regress difficulty tier -1
- If plateau detected (3+ sessions with <2% ROM improvement): change exercise selection
- Increase reps before increasing sets, increase sets before increasing difficulty tier.`;

const tools: ClaudeTool[] = [
  {
    name: "query_exercise_database",
    description:
      "Query the exercise database to find exercises matching criteria. Returns matching exercises with full details including target angles, cues, and compensation patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        body_region: {
          type: "string",
          enum: ["shoulder", "knee", "hip", "ankle", "lumbar", "cervical"],
          description: "Target body region",
        },
        category: {
          type: "string",
          enum: ["mobility", "strengthening", "stabilization", "stretching"],
          description: "Exercise category filter",
        },
        difficulty_min: {
          type: "number",
          enum: [1, 2, 3, 4, 5],
          description: "Minimum difficulty tier (1-5)",
        },
        difficulty_max: {
          type: "number",
          enum: [1, 2, 3, 4, 5],
          description: "Maximum difficulty tier (1-5)",
        },
        equipment: {
          type: "array",
          items: { type: "string" },
          description: "Required equipment filter (empty array for bodyweight only)",
        },
      },
      required: ["body_region"],
    },
  },
  {
    name: "generate_session_plan",
    description:
      "Generate a personalized exercise session plan based on the patient profile, available exercises, and session history. Returns a structured ExercisePlan JSON.",
    input_schema: {
      type: "object" as const,
      properties: {
        session_number: {
          type: "number",
          description: "The session number for this patient (1 for first session)",
        },
        estimated_duration_minutes: {
          type: "number",
          description: "Estimated session duration in minutes (typically 25-35)",
        },
        exercises: {
          type: "array",
          description: "Array of exercises for the session plan",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Exercise ID from the database" },
              name: { type: "string", description: "Exercise name" },
              target_muscles: {
                type: "array",
                items: { type: "string" },
                description: "Target muscle groups",
              },
              target_angles: {
                type: "object",
                description: "Target joint angles in degrees",
              },
              tolerances: {
                type: "object",
                description: "Acceptable deviation tolerances in degrees",
              },
              tempo_seconds: {
                type: "string",
                description: "Tempo as eccentric-pause-concentric-pause",
              },
              sets: { type: "number", description: "Number of sets" },
              reps: { type: "number", description: "Reps per set" },
              rest_seconds: { type: "number", description: "Rest between sets in seconds" },
              cues: {
                type: "array",
                items: { type: "string" },
                description: "Coaching cues for the exercise",
              },
              compensation_patterns: {
                type: "array",
                description: "Compensation patterns to watch for",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    detection: { type: "string" },
                    landmarks: { type: "array", items: { type: "number" } },
                    severity: { type: "string", enum: ["yellow", "red"] },
                  },
                  required: ["name", "detection", "landmarks", "severity"],
                },
              },
              regression: { type: "string", description: "Regression option" },
              progression: { type: "string", description: "Progression option" },
            },
            required: [
              "id",
              "name",
              "target_muscles",
              "target_angles",
              "tolerances",
              "tempo_seconds",
              "sets",
              "reps",
              "rest_seconds",
              "cues",
              "compensation_patterns",
              "regression",
              "progression",
            ],
          },
        },
      },
      required: ["session_number", "estimated_duration_minutes", "exercises"],
    },
  },
];

function filterContraindicated(
  exercises: Exercise[],
  contraindications: readonly string[],
): Exercise[] {
  if (contraindications.length === 0) return exercises;
  return exercises.filter(
    (ex) =>
      !ex.contraindications.some((ci) =>
        contraindications.some(
          (patientCi) => patientCi.toLowerCase() === ci.toLowerCase(),
        ),
      ),
  );
}

function getDifficultyRange(severityScore: number): [DifficultyTier, DifficultyTier] {
  if (severityScore <= 20) return [3, 5];
  if (severityScore <= 50) return [2, 4];
  if (severityScore <= 70) return [1, 3];
  return [1, 2];
}

function buildUserMessage(
  patientProfile: PatientProfile,
  sessionHistory: readonly SessionData[],
): string {
  const parts: string[] = [
    "Patient Profile:",
    JSON.stringify(patientProfile.diagnostic, null, 2),
    "",
    `Session count so far: ${patientProfile.session_count}`,
    `Next session number: ${patientProfile.session_count + 1}`,
  ];

  if (sessionHistory.length > 0) {
    parts.push("", "Session History (most recent last):");
    for (const session of sessionHistory) {
      parts.push(JSON.stringify({
        session_number: session.session_number,
        date: session.date,
        pain_pre: session.pain_pre,
        pain_post: session.pain_post,
        exercises_completed: session.exercises_completed,
        exercises_prescribed: session.exercises_prescribed,
      }, null, 2));
    }
  }

  const [diffMin, diffMax] = getDifficultyRange(patientProfile.diagnostic.severity_score);
  parts.push(
    "",
    `Recommended difficulty range based on severity (${patientProfile.diagnostic.severity_score}): tiers ${diffMin}-${diffMax}`,
    "",
    "Instructions:",
    "1. Query the exercise database for the patient's body region with appropriate filters.",
    "2. Select 3-5 exercises that address the patient's functional deficits.",
    "3. Generate a session plan using generate_session_plan with appropriate sets, reps, and rest.",
    "4. Order: mobility/stretching -> stabilization -> strengthening.",
  );

  return parts.join("\n");
}

function handleQueryExerciseDatabase(
  input: Record<string, unknown>,
  contraindications: readonly string[],
): Exercise[] {
  const bodyRegion = input.body_region as BodyRegion;
  const category = input.category as ExerciseCategory | undefined;
  const difficultyMin = input.difficulty_min as DifficultyTier | undefined;
  const difficultyMax = input.difficulty_max as DifficultyTier | undefined;
  const equipment = input.equipment as string[] | undefined;

  const difficultyRange: [DifficultyTier, DifficultyTier] | undefined =
    difficultyMin !== undefined && difficultyMax !== undefined
      ? [difficultyMin, difficultyMax]
      : undefined;

  const results = queryExercises({
    body_region: bodyRegion,
    category,
    difficulty_range: difficultyRange,
    equipment,
  });

  return filterContraindicated(results, contraindications);
}

function parseExercisePlan(input: Record<string, unknown>): ExercisePlan {
  const rawExercises = input.exercises as Record<string, unknown>[];

  const exercises: ExercisePlanItem[] = rawExercises.map((raw) => ({
    id: raw.id as string,
    name: raw.name as string,
    target_muscles: raw.target_muscles as string[],
    target_angles: raw.target_angles as Record<string, number>,
    tolerances: (raw.tolerances as Record<string, number>) ?? {},
    tempo_seconds: raw.tempo_seconds as string,
    sets: raw.sets as number,
    reps: raw.reps as number,
    rest_seconds: raw.rest_seconds as number,
    cues: raw.cues as string[],
    compensation_patterns: (raw.compensation_patterns as ExercisePlanItem["compensation_patterns"]) ?? [],
    regression: raw.regression as string,
    progression: raw.progression as string,
  }));

  return {
    session_number: input.session_number as number,
    estimated_duration_minutes: input.estimated_duration_minutes as number,
    exercises,
  };
}

export async function designProgram(
  patientProfile: PatientProfile,
  sessionHistory: readonly SessionData[] = [],
): Promise<ExercisePlan> {
  if (!patientProfile.diagnostic.cleared_for_exercise) {
    throw new Error(
      "Patient is not cleared for exercise. Red flags or contraindications prevent program design.",
    );
  }

  const contraindications = patientProfile.diagnostic.contraindications;
  let capturedPlan: ExercisePlan | null = null;

  const toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
    query_exercise_database: async (input) => {
      const results = handleQueryExerciseDatabase(input, contraindications);
      return {
        count: results.length,
        exercises: results.map((ex) => ({
          id: ex.id,
          name: ex.name,
          body_region: ex.body_region,
          category: ex.category,
          difficulty_tier: ex.difficulty_tier,
          equipment: ex.equipment,
          target_muscles: ex.target_muscles,
          primary_joint_angle: ex.primary_joint_angle,
          target_angles: ex.target_angles,
          tolerances: ex.tolerances,
          tempo_seconds: ex.tempo_seconds,
          default_sets: ex.default_sets,
          default_reps: ex.default_reps,
          cues: ex.cues,
          compensation_patterns: ex.compensation_patterns,
          regression: ex.regression,
          progression: ex.progression,
        })),
      };
    },

    generate_session_plan: async (input) => {
      const plan = parseExercisePlan(input);
      capturedPlan = plan;
      return plan;
    },
  };

  const userMessage = buildUserMessage(patientProfile, sessionHistory);

  await callClaude({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    tools,
    toolHandlers,
  });

  if (!capturedPlan) {
    throw new Error("Program Designer did not generate a session plan.");
  }

  return capturedPlan;
}
