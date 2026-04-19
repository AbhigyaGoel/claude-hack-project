import { callClaudeWithTools, type ClaudeTool } from "../lib/claude";
import type { BodyRegion } from "../types/exercise";
import type { DiagnosticResult, Side } from "../types/patient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScreeningQuestion {
  id: string;
  text: string;
  response_type: "scale_0_10" | "yes_no" | "multiple_choice" | "free_text";
  options?: string[];
}

interface ScreeningInstrument {
  instrument_type: string;
  body_region: BodyRegion;
  questions: ScreeningQuestion[];
}

type SeverityClassification = "minimal" | "mild" | "moderate" | "severe" | "complete";

interface InstrumentScore {
  instrument_type: string;
  raw_score: number;
  max_score: number;
  percentage: number;
  severity: SeverityClassification;
}

interface FunctionalClassification {
  body_region: BodyRegion;
  side: Side;
  onset: string;
  mechanism: string;
  severity_score: number;
  instrument_used: string;
  functional_deficits: string[];
  contraindications: string[];
  red_flags: string[];
  cleared_for_exercise: boolean;
}

interface IntakeResponses {
  side?: Side;
  onset?: string;
  mechanism?: string;
  pain_level?: number;
  answers: Record<string, string | number | boolean>;
  history?: string;
}

// ---------------------------------------------------------------------------
// Red Flags — hard stop if any detected
// ---------------------------------------------------------------------------

const RED_FLAG_INDICATORS: ReadonlyArray<{
  keyword: string;
  description: string;
}> = [
  { keyword: "numbness", description: "Numbness or tingling" },
  { keyword: "tingling", description: "Numbness or tingling" },
  { keyword: "bowel", description: "Bowel or bladder changes" },
  { keyword: "bladder", description: "Bowel or bladder changes" },
  { keyword: "night_pain", description: "Night pain that wakes from sleep" },
  { keyword: "fever", description: "Fever or chills" },
  { keyword: "chills", description: "Fever or chills" },
  { keyword: "trauma", description: "Recent significant trauma" },
  { keyword: "weight_loss", description: "Unexplained weight loss" },
  { keyword: "progressive_weakness", description: "Progressive neurological weakness" },
  { keyword: "saddle_anesthesia", description: "Saddle anesthesia" },
  { keyword: "bilateral_symptoms", description: "Bilateral neurological symptoms" },
] as const;

// ---------------------------------------------------------------------------
// Screening Instrument Definitions
// ---------------------------------------------------------------------------

const SCREENING_INSTRUMENTS: Record<BodyRegion, () => ScreeningInstrument> = {
  shoulder: () => ({
    instrument_type: "DASH",
    body_region: "shoulder",
    questions: [
      { id: "dash_1", text: "Rate your difficulty opening a tight or new jar", response_type: "scale_0_10" },
      { id: "dash_2", text: "Rate your difficulty doing heavy household chores (washing walls, floors)", response_type: "scale_0_10" },
      { id: "dash_3", text: "Rate your difficulty carrying a shopping bag or briefcase", response_type: "scale_0_10" },
      { id: "dash_4", text: "Rate your difficulty washing your back", response_type: "scale_0_10" },
      { id: "dash_5", text: "Rate your difficulty using a knife to cut food", response_type: "scale_0_10" },
      { id: "dash_6", text: "Rate your difficulty with recreational activities that require force through your arm, shoulder, or hand", response_type: "scale_0_10" },
      { id: "dash_7", text: "Rate the severity of your arm, shoulder, or hand pain", response_type: "scale_0_10" },
      { id: "dash_8", text: "Rate your difficulty with overhead reaching", response_type: "scale_0_10" },
      { id: "dash_9", text: "Rate how much your arm, shoulder, or hand problem interferes with social activities", response_type: "scale_0_10" },
      { id: "dash_10", text: "Rate how much your arm, shoulder, or hand problem limits your work or daily activities", response_type: "scale_0_10" },
      { id: "red_flag_numbness", text: "Do you experience numbness or tingling in your arm or hand?", response_type: "yes_no" },
      { id: "red_flag_night_pain", text: "Does pain wake you from sleep at night?", response_type: "yes_no" },
      { id: "red_flag_trauma", text: "Did this start after a significant trauma or fall?", response_type: "yes_no" },
      { id: "red_flag_fever", text: "Have you had any fever, chills, or unexplained weight loss?", response_type: "yes_no" },
    ],
  }),

  lumbar: () => ({
    instrument_type: "ODI",
    body_region: "lumbar",
    questions: [
      { id: "odi_1", text: "Rate your pain intensity right now", response_type: "scale_0_10" },
      { id: "odi_2", text: "Rate your difficulty with personal care (washing, dressing)", response_type: "scale_0_10" },
      { id: "odi_3", text: "Rate your difficulty with lifting", response_type: "scale_0_10" },
      { id: "odi_4", text: "Rate your difficulty with walking", response_type: "scale_0_10" },
      { id: "odi_5", text: "Rate your difficulty with sitting", response_type: "scale_0_10" },
      { id: "odi_6", text: "Rate your difficulty with standing", response_type: "scale_0_10" },
      { id: "odi_7", text: "Rate how much pain disturbs your sleep", response_type: "scale_0_10" },
      { id: "odi_8", text: "Rate your difficulty with social life", response_type: "scale_0_10" },
      { id: "odi_9", text: "Rate your difficulty with travelling", response_type: "scale_0_10" },
      { id: "odi_10", text: "Rate how your pain changes with activity level", response_type: "scale_0_10" },
      { id: "red_flag_bowel_bladder", text: "Have you noticed any changes in bowel or bladder function?", response_type: "yes_no" },
      { id: "red_flag_numbness", text: "Do you have numbness in your groin or saddle area?", response_type: "yes_no" },
      { id: "red_flag_progressive_weakness", text: "Do you have progressive weakness in your legs?", response_type: "yes_no" },
      { id: "red_flag_fever", text: "Have you had any fever, chills, or unexplained weight loss?", response_type: "yes_no" },
      { id: "red_flag_night_pain", text: "Does pain wake you from sleep at night and is not relieved by any position?", response_type: "yes_no" },
    ],
  }),

  knee: () => ({
    instrument_type: "KOOS",
    body_region: "knee",
    questions: [
      { id: "koos_1", text: "Rate your knee pain when going up or down stairs", response_type: "scale_0_10" },
      { id: "koos_2", text: "Rate your knee pain when bending your knee fully", response_type: "scale_0_10" },
      { id: "koos_3", text: "Rate your knee pain when walking on a flat surface", response_type: "scale_0_10" },
      { id: "koos_4", text: "Rate your difficulty with twisting/pivoting on your knee", response_type: "scale_0_10" },
      { id: "koos_5", text: "Rate your difficulty with kneeling", response_type: "scale_0_10" },
      { id: "koos_6", text: "Rate your difficulty with squatting", response_type: "scale_0_10" },
      { id: "koos_7", text: "Rate how much your knee swells", response_type: "scale_0_10" },
      { id: "koos_8", text: "Rate how often your knee catches or locks", response_type: "scale_0_10" },
      { id: "koos_9", text: "How much has your knee problem affected your quality of life?", response_type: "scale_0_10" },
      { id: "koos_10", text: "How much are you troubled by lack of confidence in your knee?", response_type: "scale_0_10" },
      { id: "red_flag_trauma", text: "Did this start after a significant trauma or fall?", response_type: "yes_no" },
      { id: "red_flag_fever", text: "Is your knee hot, red, or swollen with fever?", response_type: "yes_no" },
      { id: "red_flag_numbness", text: "Do you have numbness or tingling below your knee?", response_type: "yes_no" },
    ],
  }),

  hip: () => ({
    instrument_type: "LEFS",
    body_region: "hip",
    questions: [
      { id: "lefs_1", text: "Rate your difficulty with usual work or housework", response_type: "scale_0_10" },
      { id: "lefs_2", text: "Rate your difficulty with hobbies or recreational activities", response_type: "scale_0_10" },
      { id: "lefs_3", text: "Rate your difficulty getting into or out of the bath", response_type: "scale_0_10" },
      { id: "lefs_4", text: "Rate your difficulty walking between rooms", response_type: "scale_0_10" },
      { id: "lefs_5", text: "Rate your difficulty putting on shoes or socks", response_type: "scale_0_10" },
      { id: "lefs_6", text: "Rate your difficulty with squatting", response_type: "scale_0_10" },
      { id: "lefs_7", text: "Rate your difficulty getting up from a chair", response_type: "scale_0_10" },
      { id: "lefs_8", text: "Rate your difficulty climbing stairs", response_type: "scale_0_10" },
      { id: "lefs_9", text: "Rate your difficulty standing for 1 hour", response_type: "scale_0_10" },
      { id: "lefs_10", text: "Rate your difficulty walking a mile", response_type: "scale_0_10" },
      { id: "red_flag_trauma", text: "Did this start after a significant trauma or fall?", response_type: "yes_no" },
      { id: "red_flag_fever", text: "Have you had any fever, chills, or unexplained weight loss?", response_type: "yes_no" },
      { id: "red_flag_night_pain", text: "Does pain wake you from sleep and is unrelieved by position change?", response_type: "yes_no" },
      { id: "red_flag_numbness", text: "Do you have numbness or tingling in your leg?", response_type: "yes_no" },
    ],
  }),

  ankle: () => ({
    instrument_type: "LEFS",
    body_region: "ankle",
    questions: [
      { id: "lefs_a1", text: "Rate your difficulty with usual work or housework", response_type: "scale_0_10" },
      { id: "lefs_a2", text: "Rate your difficulty walking on uneven ground", response_type: "scale_0_10" },
      { id: "lefs_a3", text: "Rate your difficulty with going up or down curbs", response_type: "scale_0_10" },
      { id: "lefs_a4", text: "Rate your difficulty walking a block", response_type: "scale_0_10" },
      { id: "lefs_a5", text: "Rate your difficulty going up or down stairs", response_type: "scale_0_10" },
      { id: "lefs_a6", text: "Rate your difficulty standing for 1 hour", response_type: "scale_0_10" },
      { id: "lefs_a7", text: "Rate your difficulty with running on even ground", response_type: "scale_0_10" },
      { id: "lefs_a8", text: "Rate your difficulty with hopping", response_type: "scale_0_10" },
      { id: "lefs_a9", text: "Rate your difficulty rolling over in bed", response_type: "scale_0_10" },
      { id: "lefs_a10", text: "Rate how much your ankle gives way or feels unstable", response_type: "scale_0_10" },
      { id: "red_flag_trauma", text: "Did this start after a significant trauma or fall?", response_type: "yes_no" },
      { id: "red_flag_fever", text: "Is your ankle hot, red, or swollen with fever?", response_type: "yes_no" },
      { id: "red_flag_numbness", text: "Do you have numbness or tingling in your foot?", response_type: "yes_no" },
    ],
  }),

  cervical: () => ({
    instrument_type: "NDI",
    body_region: "cervical",
    questions: [
      { id: "ndi_1", text: "Rate your neck pain intensity right now", response_type: "scale_0_10" },
      { id: "ndi_2", text: "Rate your difficulty with personal care (washing, dressing) due to neck pain", response_type: "scale_0_10" },
      { id: "ndi_3", text: "Rate your difficulty with lifting due to neck pain", response_type: "scale_0_10" },
      { id: "ndi_4", text: "Rate your difficulty with reading due to neck pain", response_type: "scale_0_10" },
      { id: "ndi_5", text: "Rate your headache severity related to your neck", response_type: "scale_0_10" },
      { id: "ndi_6", text: "Rate your difficulty with concentration due to neck pain", response_type: "scale_0_10" },
      { id: "ndi_7", text: "Rate your difficulty with work due to neck pain", response_type: "scale_0_10" },
      { id: "ndi_8", text: "Rate your difficulty with driving due to neck pain", response_type: "scale_0_10" },
      { id: "ndi_9", text: "Rate how much neck pain disturbs your sleep", response_type: "scale_0_10" },
      { id: "ndi_10", text: "Rate your difficulty with recreation due to neck pain", response_type: "scale_0_10" },
      { id: "red_flag_numbness", text: "Do you have numbness or tingling in both arms or legs?", response_type: "yes_no" },
      { id: "red_flag_bowel_bladder", text: "Have you noticed any changes in bowel or bladder function?", response_type: "yes_no" },
      { id: "red_flag_progressive_weakness", text: "Do you have progressive weakness in your arms or legs?", response_type: "yes_no" },
      { id: "red_flag_trauma", text: "Did this start after a significant trauma or fall?", response_type: "yes_no" },
      { id: "red_flag_fever", text: "Have you had any fever, chills, or unexplained weight loss?", response_type: "yes_no" },
    ],
  }),
};

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

function generateScreeningInstrument(
  bodyRegion: BodyRegion,
): ScreeningInstrument {
  const factory = SCREENING_INSTRUMENTS[bodyRegion];
  if (!factory) {
    throw new Error(`Unsupported body region: ${bodyRegion}`);
  }
  return factory();
}

function scoreInstrument(
  instrumentType: string,
  responses: Record<string, string | number | boolean>,
): InstrumentScore {
  // Collect numeric (scale) answers — ignore red flag questions
  const scaleAnswers = Object.entries(responses)
    .filter(([key]) => !key.startsWith("red_flag_"))
    .map(([, value]) => (typeof value === "number" ? value : 0));

  const rawScore = scaleAnswers.reduce((sum, v) => sum + v, 0);
  const maxScore = scaleAnswers.length * 10;
  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;

  const severity = classifySeverityFromPercentage(percentage);

  return {
    instrument_type: instrumentType,
    raw_score: rawScore,
    max_score: maxScore,
    percentage,
    severity,
  };
}

function classifySeverityFromPercentage(percentage: number): SeverityClassification {
  if (percentage <= 10) return "minimal";
  if (percentage <= 30) return "mild";
  if (percentage <= 50) return "moderate";
  if (percentage <= 70) return "severe";
  return "complete";
}

function detectRedFlags(
  responses: Record<string, string | number | boolean>,
): string[] {
  const detected: string[] = [];

  for (const [key, value] of Object.entries(responses)) {
    if (!key.startsWith("red_flag_")) continue;

    const isPositive =
      value === true ||
      value === "yes" ||
      value === "true" ||
      value === 1;

    if (!isPositive) continue;

    // Map question key to red flag description
    const flagKey = key.replace("red_flag_", "");
    const matchingIndicator = RED_FLAG_INDICATORS.find((ind) =>
      flagKey.includes(ind.keyword),
    );
    detected.push(
      matchingIndicator?.description ?? flagKey.replace(/_/g, " "),
    );
  }

  // Deduplicate
  return [...new Set(detected)];
}

function classifyFunctionalDeficit(
  bodyRegion: BodyRegion,
  side: Side,
  onset: string,
  mechanism: string,
  score: InstrumentScore,
  responses: Record<string, string | number | boolean>,
): FunctionalClassification {
  const redFlags = detectRedFlags(responses);
  const clearedForExercise = redFlags.length === 0;

  // Derive functional deficits from high-scoring answers
  const functionalDeficits = deriveFunctionalDeficits(bodyRegion, responses);

  // Derive contraindications based on severity and body region
  const contraindications = deriveContraindications(bodyRegion, score.severity);

  return {
    body_region: bodyRegion,
    side,
    onset,
    mechanism,
    severity_score: score.percentage,
    instrument_used: score.instrument_type,
    functional_deficits: functionalDeficits,
    contraindications,
    red_flags: redFlags,
    cleared_for_exercise: clearedForExercise,
  };
}

// ---------------------------------------------------------------------------
// Functional Deficit Derivation
// ---------------------------------------------------------------------------

const DEFICIT_MAP: Record<BodyRegion, Record<string, string>> = {
  shoulder: {
    dash_1: "grip_strength",
    dash_2: "heavy_housework",
    dash_3: "carrying",
    dash_4: "reaching_behind_back",
    dash_5: "fine_motor",
    dash_6: "forceful_recreation",
    dash_8: "overhead_reaching",
    dash_9: "social_activities",
    dash_10: "work_activities",
  },
  lumbar: {
    odi_2: "personal_care",
    odi_3: "lifting",
    odi_4: "walking",
    odi_5: "sitting_tolerance",
    odi_6: "standing_tolerance",
    odi_8: "social_activities",
    odi_9: "travelling",
  },
  knee: {
    koos_1: "stair_climbing",
    koos_2: "full_knee_flexion",
    koos_3: "level_walking",
    koos_4: "twisting_pivoting",
    koos_5: "kneeling",
    koos_6: "squatting",
  },
  hip: {
    lefs_3: "bathing",
    lefs_5: "donning_shoes",
    lefs_6: "squatting",
    lefs_7: "sit_to_stand",
    lefs_8: "stair_climbing",
    lefs_9: "standing_tolerance",
    lefs_10: "walking_endurance",
  },
  ankle: {
    lefs_a2: "uneven_terrain",
    lefs_a3: "curbs",
    lefs_a5: "stair_climbing",
    lefs_a6: "standing_tolerance",
    lefs_a7: "running",
    lefs_a8: "hopping",
    lefs_a10: "ankle_stability",
  },
  cervical: {
    ndi_2: "personal_care",
    ndi_3: "lifting",
    ndi_4: "reading",
    ndi_5: "headache",
    ndi_6: "concentration",
    ndi_7: "work_activities",
    ndi_8: "driving",
  },
};

function deriveFunctionalDeficits(
  bodyRegion: BodyRegion,
  responses: Record<string, string | number | boolean>,
): string[] {
  const regionDeficits = DEFICIT_MAP[bodyRegion] ?? {};
  const deficits: string[] = [];

  for (const [questionId, deficitName] of Object.entries(regionDeficits)) {
    const value = responses[questionId];
    // Threshold: score >= 5 on 0-10 scale indicates meaningful deficit
    if (typeof value === "number" && value >= 5) {
      deficits.push(deficitName);
    }
  }

  return deficits;
}

function deriveContraindications(
  bodyRegion: BodyRegion,
  severity: SeverityClassification,
): string[] {
  const contraindications: string[] = [];

  if (severity === "severe" || severity === "complete") {
    contraindications.push("high_resistance_exercises");
    contraindications.push("plyometrics");
  }

  if (severity === "complete") {
    contraindications.push("weight_bearing_exercises");
  }

  const regionContraindications: Record<BodyRegion, string[]> = {
    shoulder: severity === "severe" || severity === "complete"
      ? ["overhead_exercises", "heavy_lifting"]
      : [],
    lumbar: severity === "severe" || severity === "complete"
      ? ["spinal_flexion_under_load", "heavy_deadlifts"]
      : [],
    knee: severity === "severe" || severity === "complete"
      ? ["deep_squats", "impact_activities"]
      : [],
    hip: severity === "severe" || severity === "complete"
      ? ["deep_hip_flexion", "impact_activities"]
      : [],
    ankle: severity === "severe" || severity === "complete"
      ? ["impact_activities", "single_leg_balance"]
      : [],
    cervical: severity === "severe" || severity === "complete"
      ? ["cervical_extension_exercises", "heavy_overhead_press"]
      : [],
  };

  return [...contraindications, ...(regionContraindications[bodyRegion] ?? [])];
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a clinical diagnostic screening agent for a physical therapy AI system called Vero.

Your role is to conduct orthopedic screening using validated clinical instruments. You MUST use the provided tools to generate screening instruments, score responses, and classify functional deficits.

## Screening Protocols

You have access to the following validated instruments:
- **DASH** (Disabilities of the Arm, Shoulder and Hand) — for shoulder region
- **ODI** (Oswestry Disability Index) — for low back / lumbar region
- **KOOS** (Knee Injury and Osteoarthritis Outcome Score) — for knee region
- **LEFS** (Lower Extremity Functional Scale) — for hip and ankle regions
- **NDI** (Neck Disability Index) — for cervical region

## Workflow

1. Call generate_screening_instrument with the body region to get the appropriate questionnaire.
2. Call score_instrument with the instrument type and patient responses to get severity classification.
3. Call classify_functional_deficit with all gathered data to produce the final patient profile.

## Red Flag Detection (CRITICAL)

The following are RED FLAGS that indicate the patient must be referred for medical evaluation. If ANY red flag is present, the patient MUST NOT be cleared for exercise:
- Numbness or tingling
- Bowel or bladder changes
- Night pain that wakes from sleep (unrelieved by position change)
- Fever or chills
- Recent significant trauma
- Unexplained weight loss
- Progressive neurological weakness
- Saddle anesthesia
- Bilateral neurological symptoms

When red flags are present, set cleared_for_exercise to false and include all detected red flags in the output.

## Output Requirements

All outputs MUST be structured JSON. Never generate prose responses. Use the tools provided to process all clinical data.`;

// ---------------------------------------------------------------------------
// Claude Tool Definitions
// ---------------------------------------------------------------------------

const TOOLS: ClaudeTool[] = [
  {
    name: "generate_screening_instrument",
    description:
      "Generates a validated clinical screening questionnaire for the specified body region. Returns the appropriate instrument (DASH for shoulder, ODI for lumbar, KOOS for knee, LEFS for hip/ankle, NDI for cervical) with all questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        body_region: {
          type: "string",
          enum: ["shoulder", "knee", "hip", "ankle", "lumbar", "cervical"],
          description: "The body region to generate a screening instrument for",
        },
      },
      required: ["body_region"],
    },
  },
  {
    name: "score_instrument",
    description:
      "Scores a completed screening instrument. Calculates raw score, percentage, and severity classification (minimal/mild/moderate/severe/complete).",
    input_schema: {
      type: "object" as const,
      properties: {
        instrument_type: {
          type: "string",
          enum: ["DASH", "ODI", "KOOS", "LEFS", "NDI"],
          description: "The type of screening instrument being scored",
        },
        responses: {
          type: "object",
          description:
            "Map of question IDs to responses. Scale questions use 0-10 numbers, red flag questions use boolean true/false.",
          additionalProperties: true,
        },
      },
      required: ["instrument_type", "responses"],
    },
  },
  {
    name: "classify_functional_deficit",
    description:
      "Classifies the patient's functional deficits based on screening scores and history. Detects red flags and determines exercise clearance. Returns the complete Patient Profile JSON.",
    input_schema: {
      type: "object" as const,
      properties: {
        body_region: {
          type: "string",
          enum: ["shoulder", "knee", "hip", "ankle", "lumbar", "cervical"],
        },
        side: {
          type: "string",
          enum: ["left", "right", "bilateral"],
        },
        onset: {
          type: "string",
          description: "When symptoms began (e.g., '2_weeks_ago', '3_months_ago')",
        },
        mechanism: {
          type: "string",
          description: "How the injury or pain started (e.g., 'overhead_lifting', 'gradual_onset')",
        },
        instrument_score: {
          type: "object",
          description: "The scored instrument result from score_instrument",
          properties: {
            instrument_type: { type: "string" },
            raw_score: { type: "number" },
            max_score: { type: "number" },
            percentage: { type: "number" },
            severity: { type: "string" },
          },
          required: ["instrument_type", "raw_score", "max_score", "percentage", "severity"],
        },
        responses: {
          type: "object",
          description: "Original questionnaire responses for red flag detection",
          additionalProperties: true,
        },
      },
      required: [
        "body_region",
        "side",
        "onset",
        "mechanism",
        "instrument_score",
        "responses",
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handler Registry
// ---------------------------------------------------------------------------

function createToolHandlers(): Record<
  string,
  (input: Record<string, unknown>) => Promise<unknown>
> {
  return {
    generate_screening_instrument: async (input) => {
      const bodyRegion = input.body_region as BodyRegion;
      return generateScreeningInstrument(bodyRegion);
    },

    score_instrument: async (input) => {
      const instrumentType = input.instrument_type as string;
      const responses = input.responses as Record<string, string | number | boolean>;
      return scoreInstrument(instrumentType, responses);
    },

    classify_functional_deficit: async (input) => {
      const bodyRegion = input.body_region as BodyRegion;
      const side = input.side as Side;
      const onset = input.onset as string;
      const mechanism = input.mechanism as string;
      const instrumentScore = input.instrument_score as InstrumentScore;
      const responses = input.responses as Record<string, string | number | boolean>;

      return classifyFunctionalDeficit(
        bodyRegion,
        side,
        onset,
        mechanism,
        instrumentScore,
        responses,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Conducts a diagnostic intake screening for the specified body region.
 *
 * Sends patient responses through the Claude-powered diagnostic pipeline:
 * 1. Generates the appropriate screening instrument
 * 2. Scores the responses
 * 3. Classifies functional deficits and detects red flags
 *
 * Returns a DiagnosticResult with exercise clearance determination.
 * If any red flags are detected, cleared_for_exercise will be false.
 */
export async function conductIntake(
  bodyRegion: BodyRegion,
  responses: IntakeResponses,
): Promise<DiagnosticResult> {
  const toolHandlers = createToolHandlers();

  const userMessage = buildUserMessage(bodyRegion, responses);

  const { toolResults } = await callClaudeWithTools(
    SYSTEM_PROMPT,
    [{ role: "user", content: userMessage }],
    TOOLS,
    toolHandlers,
  );

  // The final tool result should be the FunctionalClassification
  const classification = findClassificationResult(toolResults);

  if (classification) {
    return classificationToDiagnosticResult(classification);
  }

  // Fallback: run the pipeline directly without Claude if tool results
  // didn't produce a classification (defensive path)
  return runDirectPipeline(bodyRegion, responses);
}

/**
 * Runs the screening pipeline directly without Claude orchestration.
 * Useful for testing or as a fallback.
 */
export async function conductIntakeDirect(
  bodyRegion: BodyRegion,
  responses: IntakeResponses,
): Promise<DiagnosticResult> {
  return runDirectPipeline(bodyRegion, responses);
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function buildUserMessage(
  bodyRegion: BodyRegion,
  responses: IntakeResponses,
): string {
  return JSON.stringify({
    task: "conduct_diagnostic_screening",
    body_region: bodyRegion,
    patient_info: {
      side: responses.side ?? "bilateral",
      onset: responses.onset ?? "unknown",
      mechanism: responses.mechanism ?? "unknown",
      pain_level: responses.pain_level,
    },
    questionnaire_responses: responses.answers,
    history: responses.history ?? "",
    instructions: [
      `1. Call generate_screening_instrument for body region "${bodyRegion}".`,
      "2. Call score_instrument with the instrument type and the provided questionnaire_responses.",
      "3. Call classify_functional_deficit with all data to produce the final patient profile.",
      "4. Return the classification result as your final output.",
    ],
  });
}

function findClassificationResult(
  toolResults: unknown[],
): FunctionalClassification | null {
  // Walk results in reverse — the classification is typically the last tool call
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const result = toolResults[i];
    if (isFunctionalClassification(result)) {
      return result as FunctionalClassification;
    }
  }
  return null;
}

function isFunctionalClassification(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    "body_region" in obj &&
    "severity_score" in obj &&
    "instrument_used" in obj &&
    "cleared_for_exercise" in obj &&
    "red_flags" in obj
  );
}

function classificationToDiagnosticResult(
  classification: FunctionalClassification,
): DiagnosticResult {
  return {
    body_region: classification.body_region,
    side: classification.side,
    onset: classification.onset,
    mechanism: classification.mechanism,
    severity_score: classification.severity_score,
    instrument_used: classification.instrument_used,
    functional_deficits: classification.functional_deficits,
    contraindications: classification.contraindications,
    red_flags: classification.red_flags,
    cleared_for_exercise: classification.cleared_for_exercise,
  };
}

function runDirectPipeline(
  bodyRegion: BodyRegion,
  responses: IntakeResponses,
): DiagnosticResult {
  const instrument = generateScreeningInstrument(bodyRegion);
  const score = scoreInstrument(instrument.instrument_type, responses.answers);
  const classification = classifyFunctionalDeficit(
    bodyRegion,
    responses.side ?? "bilateral",
    responses.onset ?? "unknown",
    responses.mechanism ?? "unknown",
    score,
    responses.answers,
  );

  return classificationToDiagnosticResult(classification);
}
