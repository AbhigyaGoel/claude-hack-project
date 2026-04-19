import { callClaudeVision, callClaudeSimple } from "@/lib/claude/client";
import { getDb } from "@/db";
import { redFlags } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SafetyAlert {
  readonly type: string;
  readonly description: string;
  readonly severity: 1 | 2 | 3 | 4 | 5;
  readonly action: "log" | "warn" | "halt_exercise" | "halt_session";
}

export interface SafetyResult {
  readonly safe: boolean;
  readonly halt: boolean;
  readonly severity: number;
  readonly alerts: readonly SafetyAlert[];
  readonly red_flag_type: string | null;
  readonly reasoning: string;
  readonly recommendation: string;
}

export interface SafetyInput {
  readonly session_id?: string;
  readonly patient_id?: string;
  readonly exercise_name?: string;
  readonly rep_number?: number;
  readonly set_number?: number;
  readonly peak_angle?: number;
  readonly target_angle?: number;
  readonly pain_pre?: number;
  readonly current_faults?: readonly string[];
  readonly keypoints?: unknown;
  readonly frame_base64?: string;
}

// ---------------------------------------------------------------------------
// Keypoint-based heuristic checks (instant, no LLM call)
// ---------------------------------------------------------------------------

interface KeypointLandmark {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
  readonly visibility?: number;
}

function runKeypointChecks(keypoints: unknown): SafetyAlert[] {
  if (!Array.isArray(keypoints) || keypoints.length < 33) return [];

  const kp = keypoints as KeypointLandmark[];
  const alerts: SafetyAlert[] = [];

  // Landmark indices (MediaPipe BlazePose)
  const LEFT_HIP = kp[23];
  const RIGHT_HIP = kp[24];
  const LEFT_SHOULDER = kp[11];
  const RIGHT_SHOULDER = kp[12];
  const LEFT_ANKLE = kp[27];
  const RIGHT_ANKLE = kp[28];
  const LEFT_KNEE = kp[25];
  const RIGHT_KNEE = kp[26];
  const LEFT_ELBOW = kp[13];
  const RIGHT_ELBOW = kp[14];

  // 1. Fall detection — rapid hip drop
  // Hip center y > 0.85 in normalized coords means very low in frame
  const hipCenterY = (LEFT_HIP.y + RIGHT_HIP.y) / 2;
  if (hipCenterY > 0.88) {
    alerts.push({
      type: "fall_risk",
      description: "Patient appears very low in frame — possible fall or collapse",
      severity: 4,
      action: "halt_exercise",
    });
  }

  // 2. Severe lateral lean — shoulder tilt
  const shoulderDeltaY = Math.abs(LEFT_SHOULDER.y - RIGHT_SHOULDER.y);
  if (shoulderDeltaY > 0.15) {
    alerts.push({
      type: "lateral_lean",
      description: "Significant lateral trunk lean detected — possible balance issue",
      severity: 3,
      action: "warn",
    });
  }

  // 3. Knee valgus — knees collapsing inward relative to hip-ankle line
  const leftKneeExpectedX = (LEFT_HIP.x + LEFT_ANKLE.x) / 2;
  const rightKneeExpectedX = (RIGHT_HIP.x + RIGHT_ANKLE.x) / 2;
  const leftValgus = LEFT_KNEE.x - leftKneeExpectedX;
  const rightValgus = rightKneeExpectedX - RIGHT_KNEE.x;

  if (Math.abs(leftValgus) > 0.08 || Math.abs(rightValgus) > 0.08) {
    alerts.push({
      type: "knee_valgus",
      description: "Knee drifting inward past hip-ankle line — risk of knee strain",
      severity: 3,
      action: "warn",
    });
  }

  // 4. Hyperextension check — elbow or knee angle too straight
  // Simple check: if wrist/ankle is behind elbow/knee in the extension direction
  const leftElbowStraight = Math.abs(LEFT_ELBOW.y - LEFT_SHOULDER.y) < 0.02 &&
    LEFT_ELBOW.visibility !== undefined && LEFT_ELBOW.visibility > 0.5;
  const rightElbowStraight = Math.abs(RIGHT_ELBOW.y - RIGHT_SHOULDER.y) < 0.02 &&
    RIGHT_ELBOW.visibility !== undefined && RIGHT_ELBOW.visibility > 0.5;

  if (leftElbowStraight || rightElbowStraight) {
    // Not necessarily dangerous — context-dependent. Log only.
    alerts.push({
      type: "near_lockout",
      description: "Joint approaching full extension — monitor for hyperextension",
      severity: 2,
      action: "log",
    });
  }

  // 5. Loss of visibility — patient moving out of frame
  const coreVisibility = [LEFT_HIP, RIGHT_HIP, LEFT_SHOULDER, RIGHT_SHOULDER]
    .map((l) => l.visibility ?? 1);
  const avgCoreVisibility = coreVisibility.reduce((a, b) => a + b, 0) / coreVisibility.length;
  if (avgCoreVisibility < 0.4) {
    alerts.push({
      type: "out_of_frame",
      description: "Patient partially out of camera view — safety monitoring limited",
      severity: 2,
      action: "warn",
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Context-based checks (no LLM, just data rules)
// ---------------------------------------------------------------------------

function runContextChecks(input: SafetyInput): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];

  // Pain threshold check
  if (input.pain_pre !== undefined && input.pain_pre >= 7) {
    alerts.push({
      type: "high_pain",
      description: `Patient reported pain ${input.pain_pre}/10 before session — monitor closely`,
      severity: 3,
      action: "warn",
    });
  }

  // Angle deviation check — if peak angle is way off target, patient may be struggling
  if (input.peak_angle !== undefined && input.target_angle !== undefined) {
    const deviation = Math.abs(input.peak_angle - input.target_angle);
    if (deviation > 40) {
      alerts.push({
        type: "large_rom_deviation",
        description: `Joint angle ${Math.round(deviation)}° off target — patient may be compensating or in pain`,
        severity: 3,
        action: "warn",
      });
    }
  }

  // Repeated faults accumulating — sign of fatigue or pain
  if (input.current_faults && input.current_faults.length >= 3) {
    alerts.push({
      type: "accumulated_faults",
      description: `${input.current_faults.length} form faults this set — possible fatigue, consider ending set`,
      severity: 3,
      action: "warn",
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Vision-based safety check (LLM call — for distress/grimacing/environment)
// ---------------------------------------------------------------------------

const VISION_SAFETY_PROMPT = `You are a safety monitor for a physical therapy session. Analyze this webcam frame for safety concerns ONLY.

Check for:
1. FACIAL DISTRESS: grimacing, wincing, tears, breath-holding, jaw clenching
2. GUARDING: sudden limb withdrawal, protective posturing, bracing
3. BALANCE: unstable stance, swaying, grabbing for support
4. ENVIRONMENT: obstacles near patient, slippery surface, unstable furniture
5. BREATHING: visible Valsalva (straining, face reddening), labored breathing

DO NOT comment on exercise form or technique — other agents handle that.

Respond with JSON only:
{
  "distress_detected": boolean,
  "distress_type": string | null,
  "distress_confidence": number (0-1),
  "environment_safe": boolean,
  "environment_concern": string | null,
  "breathing_concern": boolean,
  "overall_severity": number (1-5, where 1=fine, 5=emergency)
}`;

interface VisionSafetyResult {
  distress_detected?: boolean;
  distress_type?: string | null;
  distress_confidence?: number;
  environment_safe?: boolean;
  environment_concern?: string | null;
  breathing_concern?: boolean;
  overall_severity?: number;
}

async function runVisionCheck(frameBase64: string, exerciseContext: string): Promise<SafetyAlert[]> {
  const alerts: SafetyAlert[] = [];

  try {
    const raw = await callClaudeVision({
      model: "claude-haiku-4-5-20251001",
      system: VISION_SAFETY_PROMPT,
      imageBase64: frameBase64,
      prompt: `Exercise context: ${exerciseContext}\n\nAnalyze this frame for safety concerns. JSON only.`,
      maxTokens: 300,
    });

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const result: VisionSafetyResult = JSON.parse(cleaned);

    if (result.distress_detected && (result.distress_confidence ?? 0) > 0.6) {
      const severity = (result.overall_severity ?? 3) >= 4 ? 4 : 3;
      alerts.push({
        type: "facial_distress",
        description: result.distress_type ?? "Signs of distress detected",
        severity: severity as 3 | 4,
        action: severity >= 4 ? "halt_exercise" : "warn",
      });
    }

    if (result.environment_safe === false && result.environment_concern) {
      alerts.push({
        type: "environment_hazard",
        description: result.environment_concern,
        severity: 3,
        action: "warn",
      });
    }

    if (result.breathing_concern) {
      alerts.push({
        type: "breathing",
        description: "Possible breath-holding or Valsalva maneuver detected",
        severity: 3,
        action: "warn",
      });
    }
  } catch {
    // Vision check failed — not a safety emergency, just log
    console.warn("[safety-monitor] Vision check failed, continuing with keypoint/context checks");
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Persistence — write to red_flags table on halt
// ---------------------------------------------------------------------------

async function persistRedFlag(
  sessionId: string | undefined,
  result: SafetyResult,
): Promise<void> {
  if (!sessionId || !result.halt) return;

  try {
    const db = getDb();
    await db.insert(redFlags).values({
      session_id: sessionId,
      type: result.red_flag_type ?? "unknown",
      transcript: JSON.stringify({
        alerts: result.alerts,
        reasoning: result.reasoning,
        recommendation: result.recommendation,
      }),
      halted: true,
      referred: result.severity >= 5,
    });
  } catch (err) {
    console.error("[safety-monitor] Failed to persist red flag:", err);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function checkSafety(input: SafetyInput): Promise<SafetyResult> {
  const allAlerts: SafetyAlert[] = [];

  // Layer 1: Instant keypoint-based heuristics (0ms)
  if (input.keypoints) {
    allAlerts.push(...runKeypointChecks(input.keypoints));
  }

  // Layer 2: Context/data rule checks (0ms)
  allAlerts.push(...runContextChecks(input));

  // Layer 3: Vision-based distress detection (LLM call, ~300ms)
  if (input.frame_base64) {
    const exerciseContext = [
      input.exercise_name ?? "unknown exercise",
      input.rep_number != null ? `rep ${input.rep_number}` : "",
      input.set_number != null ? `set ${input.set_number}` : "",
    ].filter(Boolean).join(", ");

    const visionAlerts = await runVisionCheck(input.frame_base64, exerciseContext);
    allAlerts.push(...visionAlerts);
  }

  // Determine overall severity and halt decision
  const maxSeverity = allAlerts.length > 0
    ? Math.max(...allAlerts.map((a) => a.severity))
    : 0;

  const shouldHalt = allAlerts.some(
    (a) => a.action === "halt_session" || a.action === "halt_exercise",
  );

  const haltAlert = allAlerts.find(
    (a) => a.action === "halt_session" || a.action === "halt_exercise",
  );

  const result: SafetyResult = {
    safe: maxSeverity <= 2,
    halt: shouldHalt,
    severity: maxSeverity,
    alerts: allAlerts,
    red_flag_type: shouldHalt ? (haltAlert?.type ?? null) : null,
    reasoning: allAlerts
      .filter((a) => a.severity >= 3)
      .map((a) => `[${a.type}] ${a.description}`)
      .join("; ") || "No significant safety concerns",
    recommendation: shouldHalt
      ? "Stop exercise immediately. Check in with patient."
      : maxSeverity >= 3
        ? "Monitor closely. Consider reducing intensity."
        : "",
  };

  // Persist red flags to DB
  await persistRedFlag(input.session_id, result);

  return result;
}
