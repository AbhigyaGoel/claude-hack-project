import { callClaudeWithTools, type ClaudeTool } from "../lib/claude";
import {
  type CorrectionType,
  type Deviation,
  type FormAssessment,
  type RepData,
  type RepQuality,
  type TempoAssessment,
} from "../types/assessment";
import type { CompensationPattern } from "../types/exercise";

// ---------------------------------------------------------------------------
// Tool definitions for Claude tool-use
// ---------------------------------------------------------------------------

const EVALUATE_REP_TOOL: ClaudeTool = {
  name: "evaluate_rep",
  description:
    "Evaluate a single rep by comparing achieved angles against target angles and assessing tempo. Returns deviations with severity classification.",
  input_schema: {
    type: "object" as const,
    properties: {
      rep_data: {
        type: "object",
        description: "Batched rep data including peak angles, duration, and compensation flags",
        properties: {
          exercise_id: { type: "string" },
          rep_number: { type: "number" },
          peak_angles: {
            type: "object",
            additionalProperties: { type: "number" },
          },
          rep_duration_ms: { type: "number" },
          target_tempo_ms: { type: "number" },
          compensation_flags: {
            type: "array",
            items: { type: "string" },
          },
          pain_reported: { type: "boolean" },
        },
        required: [
          "exercise_id",
          "rep_number",
          "peak_angles",
          "rep_duration_ms",
          "target_tempo_ms",
          "compensation_flags",
          "pain_reported",
        ],
      },
      target_angles: {
        type: "object",
        description: "Target angles keyed by joint name",
        additionalProperties: { type: "number" },
      },
      tolerances: {
        type: "object",
        description: "Acceptable deviation per joint in degrees",
        additionalProperties: { type: "number" },
      },
    },
    required: ["rep_data", "target_angles", "tolerances"],
  },
};

const DETECT_COMPENSATION_TOOL: ClaudeTool = {
  name: "detect_compensation",
  description:
    "Detect compensation patterns in the movement buffer by matching against known compensation signatures for the exercise.",
  input_schema: {
    type: "object" as const,
    properties: {
      movement_buffer: {
        type: "array",
        description: "Array of compensation flag strings detected client-side during the rep",
        items: { type: "string" },
      },
      compensation_patterns: {
        type: "array",
        description: "Known compensation patterns for the current exercise",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            detection: { type: "string" },
            landmarks: {
              type: "array",
              items: { type: "number" },
            },
            severity: {
              type: "string",
              enum: ["yellow", "red"],
            },
          },
          required: ["name", "detection", "landmarks", "severity"],
        },
      },
    },
    required: ["movement_buffer", "compensation_patterns"],
  },
};

const CLASSIFY_SEVERITY_TOOL: ClaudeTool = {
  name: "classify_severity",
  description:
    "Classify overall rep severity (green/yellow/red) based on deviations, compensations, and pain status. Returns the final form assessment.",
  input_schema: {
    type: "object" as const,
    properties: {
      deviations: {
        type: "array",
        description: "Joint deviations with per-joint severity",
        items: {
          type: "object",
          properties: {
            joint: { type: "string" },
            actual: { type: "number" },
            target: { type: "number" },
            deficit: { type: "number" },
            severity: { type: "string", enum: ["green", "yellow", "red"] },
            correction_type: {
              type: "string",
              enum: ["rom_deficit", "rom_excess", "compensation"],
            },
          },
          required: ["joint", "actual", "target", "deficit", "severity", "correction_type"],
        },
      },
      compensations_detected: {
        type: "array",
        items: { type: "string" },
      },
      pain_reported: { type: "boolean" },
      tempo_assessment: {
        type: "string",
        enum: ["on_tempo", "too_fast", "too_slow"],
      },
    },
    required: ["deviations", "compensations_detected", "pain_reported", "tempo_assessment"],
  },
};

const TOOLS: ClaudeTool[] = [
  EVALUATE_REP_TOOL,
  DETECT_COMPENSATION_TOOL,
  CLASSIFY_SEVERITY_TOOL,
];

// ---------------------------------------------------------------------------
// Tool handler implementations (deterministic logic)
// ---------------------------------------------------------------------------

const DEFAULT_TOLERANCE = 10;

function evaluateRepHandler(
  input: Record<string, unknown>,
): Promise<unknown> {
  const repData = input.rep_data as RepData;
  const targetAngles = input.target_angles as Record<string, number>;
  const tolerances = (input.tolerances as Record<string, number>) ?? {};

  const deviations: Deviation[] = [];

  for (const [joint, target] of Object.entries(targetAngles)) {
    const actual = repData.peak_angles[joint];
    if (actual === undefined) continue;

    const tolerance = tolerances[joint] ?? DEFAULT_TOLERANCE;
    const deficit = target - actual;
    const absDeficit = Math.abs(deficit);

    if (absDeficit <= tolerance) continue;

    const correctionType: CorrectionType = deficit > 0 ? "rom_deficit" : "rom_excess";
    const severity: RepQuality = absDeficit > tolerance * 2 ? "red" : "yellow";

    deviations.push({
      joint,
      actual,
      target,
      deficit: absDeficit,
      severity,
      correction_type: correctionType,
    });
  }

  // Tempo assessment
  const tempoRatio = repData.rep_duration_ms / repData.target_tempo_ms;
  let tempoAssessment: TempoAssessment = "on_tempo";
  if (tempoRatio < 0.75) {
    tempoAssessment = "too_fast";
  } else if (tempoRatio > 1.35) {
    tempoAssessment = "too_slow";
  }

  return Promise.resolve({
    deviations,
    tempo_assessment: tempoAssessment,
  });
}

function detectCompensationHandler(
  input: Record<string, unknown>,
): Promise<unknown> {
  const movementBuffer = input.movement_buffer as string[];
  const compensationPatterns = input.compensation_patterns as CompensationPattern[];

  const knownNames = new Set(compensationPatterns.map((p) => p.name));

  const matched = movementBuffer.filter((flag) => knownNames.has(flag));

  const severityMap: Record<string, "yellow" | "red"> = {};
  for (const pattern of compensationPatterns) {
    if (matched.includes(pattern.name)) {
      severityMap[pattern.name] = pattern.severity;
    }
  }

  return Promise.resolve({
    compensations_detected: matched,
    severity_map: severityMap,
  });
}

function classifySeverityHandler(
  input: Record<string, unknown>,
): Promise<unknown> {
  const deviations = input.deviations as Deviation[];
  const compensationsDetected = input.compensations_detected as string[];
  const painReported = input.pain_reported as boolean;
  const tempoAssessment = input.tempo_assessment as TempoAssessment;

  // Pain is always red
  if (painReported) {
    return Promise.resolve({
      rep_quality: "red" as RepQuality,
      deviations,
      compensations_detected: compensationsDetected,
      coaching_priority: "pain_management",
      rep_counted: false,
      tempo_assessment: tempoAssessment,
    });
  }

  // Determine overall quality from worst deviation / compensation
  const hasRed = deviations.some((d) => d.severity === "red");
  const hasYellow = deviations.some((d) => d.severity === "yellow");
  const hasCompensations = compensationsDetected.length > 0;

  let repQuality: RepQuality = "green";
  if (hasRed) {
    repQuality = "red";
  } else if (hasYellow || hasCompensations) {
    repQuality = "yellow";
  }

  // Only count rep if not red
  const repCounted = repQuality !== "red";

  // Coaching priority: worst deviation joint, or first compensation, or null
  let coachingPriority: string | null = null;
  const redDeviation = deviations.find((d) => d.severity === "red");
  if (redDeviation) {
    coachingPriority = redDeviation.joint;
  } else if (hasCompensations) {
    coachingPriority = compensationsDetected[0];
  } else {
    const yellowDeviation = deviations.find((d) => d.severity === "yellow");
    if (yellowDeviation) {
      coachingPriority = yellowDeviation.joint;
    }
  }

  return Promise.resolve({
    rep_quality: repQuality,
    deviations,
    compensations_detected: compensationsDetected,
    coaching_priority: coachingPriority,
    rep_counted: repCounted,
    tempo_assessment: tempoAssessment,
  });
}

const TOOL_HANDLERS: Record<
  string,
  (input: Record<string, unknown>) => Promise<unknown>
> = {
  evaluate_rep: evaluateRepHandler,
  detect_compensation: detectCompensationHandler,
  classify_severity: classifySeverityHandler,
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const FORM_ANALYST_SYSTEM_PROMPT = `You are Agent 3 — Form Analyst for the Vero AI Physical Therapy system.

Your role is to evaluate biomechanical rep data and produce structured form assessments. You receive batched rep data (per-rep or every 5 seconds), NOT real-time frames.

Workflow for every rep evaluation:
1. Call evaluate_rep with the rep data, target angles, and tolerances to compute joint deviations and tempo assessment.
2. Call detect_compensation with the compensation flags from the rep and the exercise's known compensation patterns.
3. Call classify_severity with the combined deviations, detected compensations, pain status, and tempo assessment to produce the final FormAssessment.

Rules:
- Always call all three tools in sequence for each rep.
- Never generate prose — all output is structured JSON via tool calls.
- If pain_reported is true, the rep must be classified as red and not counted.
- A red-severity rep is not counted toward the set total.
- Coaching priority should be the most severe issue the patient needs to correct.`;

// ---------------------------------------------------------------------------
// Exercise config subset needed for analysis
// ---------------------------------------------------------------------------

export interface ExerciseConfig {
  readonly id: string;
  readonly target_angles: Readonly<Record<string, number>>;
  readonly tolerances: Readonly<Record<string, number>>;
  readonly compensation_patterns: readonly CompensationPattern[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a single rep using the Form Analyst agent (Agent 3).
 *
 * Sends batched rep data to Claude which orchestrates the three tool calls
 * (evaluate_rep, detect_compensation, classify_severity) and returns a
 * structured FormAssessment.
 */
export async function analyzeRep(
  repData: RepData,
  exerciseConfig: ExerciseConfig,
): Promise<FormAssessment> {
  const userMessage = JSON.stringify({
    action: "analyze_rep",
    rep_data: repData,
    target_angles: exerciseConfig.target_angles,
    tolerances: exerciseConfig.tolerances,
    compensation_patterns: exerciseConfig.compensation_patterns,
  });

  const messages: { role: string; content: string }[] = [
    { role: "user", content: userMessage },
  ];

  const { toolResults } = await callClaudeWithTools(
    FORM_ANALYST_SYSTEM_PROMPT,
    messages,
    TOOLS,
    TOOL_HANDLERS,
  );

  // The last tool result from classify_severity is the FormAssessment
  const lastResult = toolResults[toolResults.length - 1];
  if (!lastResult || typeof lastResult !== "object") {
    throw new Error("Form Analyst did not produce a valid assessment");
  }

  return lastResult as FormAssessment;
}

/**
 * Analyze a batch of reps (e.g., collected over a 5-second window).
 * Returns one FormAssessment per rep, processed sequentially.
 */
export async function analyzeRepBatch(
  reps: readonly RepData[],
  exerciseConfig: ExerciseConfig,
): Promise<readonly FormAssessment[]> {
  const results: FormAssessment[] = [];

  for (const rep of reps) {
    const assessment = await analyzeRep(rep, exerciseConfig);
    results.push(assessment);
  }

  return results;
}
