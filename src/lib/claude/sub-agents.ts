// Sub-agent spawners for the Vero multi-agent system
// Uses Claude tool-use to simulate sub-agent behavior
// (Full Agent SDK integration would use @anthropic-ai/claude-code SDK)

import { callClaudeSimple } from "./client";

interface Hypothesis {
  readonly diagnosis: string;
  readonly icd10?: string;
  readonly confidence: number;
  readonly supporting_findings?: readonly string[];
}

interface DifferentialResolverResult {
  readonly recommended_test: string;
  readonly test_description: string;
  readonly hypothesis_a_prediction: string;
  readonly hypothesis_b_prediction: string;
  readonly clinical_rationale: string;
  readonly estimated_information_gain: number;
}

interface ProgressionDecision {
  readonly exercise_id: string;
  readonly exercise_name: string;
  readonly action: "progress" | "maintain" | "regress";
  readonly rationale: string;
  readonly modifications: readonly string[];
  readonly confidence: number;
}

interface ProgressionEvaluatorResult {
  readonly decisions: readonly ProgressionDecision[];
  readonly overall_trend: "improving" | "stable" | "declining";
  readonly plateau_detected: boolean;
  readonly summary: string;
}

interface PatientData {
  readonly body_region: string;
  readonly severity_score: number;
  readonly responses: Record<string, unknown>;
  readonly red_flags: readonly string[];
  readonly [key: string]: unknown;
}

interface ExerciseHistoryEntry {
  readonly exercise_id: string;
  readonly exercise_name: string;
  readonly sessions: readonly {
    readonly date: string;
    readonly form_quality: number;
    readonly pain_level: number;
    readonly rpe: number;
    readonly reps_completed: number;
    readonly sets_completed: number;
    readonly compensations: readonly string[];
  }[];
}

interface CurrentPlanExercise {
  readonly exercise_id: string;
  readonly name: string;
  readonly sets: number;
  readonly reps: number;
  readonly difficulty_tier: number;
  readonly [key: string]: unknown;
}

const DIFFERENTIAL_RESOLVER_PROMPT = `You are a Differential Diagnosis Resolver sub-agent for Vero AI Physical Therapy.

Your task: Given two competing diagnostic hypotheses and patient data, propose a single special test or clinical question that would maximally differentiate between the two hypotheses.

Think step by step:
1. Identify the key clinical features that distinguish hypothesis A from hypothesis B
2. Find the single test or question with highest information gain
3. Predict what each hypothesis would show on that test

Output valid JSON only, with this schema:
{
  "recommended_test": "Name of the special test or clinical question",
  "test_description": "How to perform/ask it",
  "hypothesis_a_prediction": "Expected result if hypothesis A is correct",
  "hypothesis_b_prediction": "Expected result if hypothesis B is correct",
  "clinical_rationale": "Why this test maximally differentiates",
  "estimated_information_gain": 0.0-1.0
}`;

const PROGRESSION_EVALUATOR_PROMPT = `You are a Progression Evaluator sub-agent for Vero AI Physical Therapy.

Your task: Given longitudinal exercise history and the current plan, decide for each exercise whether to progress, maintain, or regress.

Rules:
- Progress when: RPE < 5, pain < 3, form quality > 80%, for 3+ consecutive sessions
- Regress when: pain > 5, form quality < 50%, compensations detected, RPE > 8
- Maintain when: neither progress nor regress criteria are fully met
- Detect plateaus: < 2% improvement across 3+ sessions in any key metric

Output valid JSON only, with this schema:
{
  "decisions": [
    {
      "exercise_id": "string",
      "exercise_name": "string",
      "action": "progress" | "maintain" | "regress",
      "rationale": "string",
      "modifications": ["string"],
      "confidence": 0.0-1.0
    }
  ],
  "overall_trend": "improving" | "stable" | "declining",
  "plateau_detected": boolean,
  "summary": "string"
}`;

function parseSubAgentJSON<T>(raw: string, fallback: T): T {
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
 * Spawn a differential resolver sub-agent.
 * Takes two competing hypotheses and patient data, proposes a special test
 * to maximally differentiate between them.
 */
export async function spawnDifferentialResolver(
  hypotheses: readonly [Hypothesis, Hypothesis],
  patientData: PatientData,
): Promise<DifferentialResolverResult> {
  const defaultResult: DifferentialResolverResult = {
    recommended_test: "General functional assessment",
    test_description: "Perform a comprehensive movement screen to gather more data",
    hypothesis_a_prediction: "Reduced functional capacity in specific pattern",
    hypothesis_b_prediction: "Different pattern of functional limitation",
    clinical_rationale: "Insufficient data for targeted differentiation",
    estimated_information_gain: 0.3,
  };

  try {
    const prompt = JSON.stringify({
      hypothesis_a: hypotheses[0],
      hypothesis_b: hypotheses[1],
      patient_data: {
        body_region: patientData.body_region,
        severity_score: patientData.severity_score,
        red_flags: patientData.red_flags,
        responses: patientData.responses,
      },
    });

    const raw = await callClaudeSimple({
      model: "claude-sonnet-4-6-20250514",
      system: DIFFERENTIAL_RESOLVER_PROMPT,
      prompt: `Resolve this differential:\n${prompt}\n\nOutput JSON only.`,
      maxTokens: 1024,
    });

    return parseSubAgentJSON(raw, defaultResult);
  } catch {
    return defaultResult;
  }
}

/**
 * Spawn a progression evaluator sub-agent.
 * Evaluates whether to progress, maintain, or regress each exercise
 * based on longitudinal data.
 */
export async function spawnProgressionEvaluator(
  exerciseHistory: readonly ExerciseHistoryEntry[],
  currentPlan: readonly CurrentPlanExercise[],
): Promise<ProgressionEvaluatorResult> {
  const defaultResult: ProgressionEvaluatorResult = {
    decisions: currentPlan.map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.name,
      action: "maintain" as const,
      rationale: "Insufficient history data for evaluation",
      modifications: [],
      confidence: 0.3,
    })),
    overall_trend: "stable",
    plateau_detected: false,
    summary: "Insufficient data to determine progression status. Maintaining current plan.",
  };

  try {
    const prompt = JSON.stringify({
      exercise_history: exerciseHistory,
      current_plan: currentPlan,
    });

    const raw = await callClaudeSimple({
      model: "claude-sonnet-4-6-20250514",
      system: PROGRESSION_EVALUATOR_PROMPT,
      prompt: `Evaluate progression:\n${prompt}\n\nOutput JSON only.`,
      maxTokens: 2048,
    });

    return parseSubAgentJSON(raw, defaultResult);
  } catch {
    return defaultResult;
  }
}
