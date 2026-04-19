import type { Landmark } from "@/types/landmark";
import type { BasePoseType } from "./types";

/**
 * Creates a landmark with the given coordinates.
 * z defaults to 0, visibility defaults to 1.
 */
function lm(x: number, y: number, z = 0, visibility = 1): Landmark {
  return { x, y, z, visibility };
}

/** Low-visibility landmark for face/hand/foot detail points. */
function faint(x: number, y: number, z = 0): Landmark {
  return lm(x, y, z, 0.3);
}

/**
 * Standing pose, front view.
 * 33 BlazePose landmarks with anatomically correct proportions.
 *
 * Key Y positions:
 *   Head ~0.12, Shoulders ~0.25, Elbows ~0.38, Wrists ~0.50
 *   Hips ~0.52, Knees ~0.72, Ankles ~0.90
 *
 * Shoulder width ~0.18 (0.41–0.59), hip width ~0.10 (0.45–0.55)
 */
function createStanding(): Landmark[] {
  return [
    // 0: nose
    lm(0.50, 0.10),
    // 1: left eye inner
    faint(0.48, 0.08),
    // 2: left eye
    faint(0.47, 0.08),
    // 3: left eye outer
    faint(0.46, 0.08),
    // 4: right eye inner
    faint(0.52, 0.08),
    // 5: right eye
    faint(0.53, 0.08),
    // 6: right eye outer
    faint(0.54, 0.08),
    // 7: left ear
    faint(0.44, 0.10),
    // 8: right ear
    faint(0.56, 0.10),
    // 9: mouth left
    faint(0.48, 0.12),
    // 10: mouth right
    faint(0.52, 0.12),
    // 11: left shoulder
    lm(0.41, 0.25),
    // 12: right shoulder
    lm(0.59, 0.25),
    // 13: left elbow
    lm(0.38, 0.38),
    // 14: right elbow
    lm(0.62, 0.38),
    // 15: left wrist
    lm(0.36, 0.50),
    // 16: right wrist
    lm(0.64, 0.50),
    // 17: left pinky
    faint(0.35, 0.52),
    // 18: right pinky
    faint(0.65, 0.52),
    // 19: left index
    faint(0.36, 0.53),
    // 20: right index
    faint(0.64, 0.53),
    // 21: left thumb
    faint(0.37, 0.52),
    // 22: right thumb
    faint(0.63, 0.52),
    // 23: left hip
    lm(0.45, 0.52),
    // 24: right hip
    lm(0.55, 0.52),
    // 25: left knee
    lm(0.44, 0.72),
    // 26: right knee
    lm(0.56, 0.72),
    // 27: left ankle
    lm(0.43, 0.90),
    // 28: right ankle
    lm(0.57, 0.90),
    // 29: left heel
    faint(0.42, 0.92),
    // 30: right heel
    faint(0.58, 0.92),
    // 31: left foot index
    faint(0.44, 0.93),
    // 32: right foot index
    faint(0.56, 0.93),
  ];
}

/**
 * Standing pose, side view (facing right).
 * Same Y positions as standing front, but X values centered around 0.5.
 */
function createStandingSide(): Landmark[] {
  return [
    // 0: nose
    lm(0.55, 0.10),
    // 1–6: eyes (faint)
    faint(0.54, 0.08),
    faint(0.55, 0.08),
    faint(0.56, 0.08),
    faint(0.53, 0.08),
    faint(0.52, 0.08),
    faint(0.51, 0.08),
    // 7: left ear (behind)
    faint(0.46, 0.10),
    // 8: right ear (in front)
    faint(0.54, 0.10),
    // 9–10: mouth
    faint(0.54, 0.12),
    faint(0.55, 0.12),
    // 11: left shoulder (behind)
    lm(0.48, 0.25),
    // 12: right shoulder (in front)
    lm(0.52, 0.25),
    // 13: left elbow (behind)
    lm(0.46, 0.38),
    // 14: right elbow (in front)
    lm(0.54, 0.38),
    // 15: left wrist (behind)
    lm(0.45, 0.50),
    // 16: right wrist (in front)
    lm(0.55, 0.50),
    // 17–22: hand landmarks
    faint(0.44, 0.52),
    faint(0.56, 0.52),
    faint(0.45, 0.53),
    faint(0.55, 0.53),
    faint(0.46, 0.52),
    faint(0.54, 0.52),
    // 23: left hip (behind)
    lm(0.49, 0.52),
    // 24: right hip (in front)
    lm(0.51, 0.52),
    // 25: left knee
    lm(0.49, 0.72),
    // 26: right knee
    lm(0.51, 0.72),
    // 27: left ankle
    lm(0.49, 0.90),
    // 28: right ankle
    lm(0.51, 0.90),
    // 29–32: feet
    faint(0.48, 0.92),
    faint(0.50, 0.92),
    faint(0.50, 0.93),
    faint(0.52, 0.93),
  ];
}

/**
 * Supine (lying on back), side view.
 * Head at left (x=0.15), feet at right (x=0.85).
 * Body at y~0.65, knees slightly bent upward.
 */
function createSupine(): Landmark[] {
  return [
    // 0: nose (face up)
    lm(0.15, 0.60),
    // 1–6: eyes
    faint(0.14, 0.58),
    faint(0.13, 0.58),
    faint(0.12, 0.58),
    faint(0.16, 0.58),
    faint(0.17, 0.58),
    faint(0.18, 0.58),
    // 7: left ear, 8: right ear
    faint(0.14, 0.62),
    faint(0.16, 0.62),
    // 9–10: mouth
    faint(0.15, 0.61),
    faint(0.15, 0.61),
    // 11: left shoulder (top)
    lm(0.25, 0.62),
    // 12: right shoulder (bottom, closer to ground)
    lm(0.25, 0.68),
    // 13: left elbow
    lm(0.20, 0.62),
    // 14: right elbow
    lm(0.20, 0.68),
    // 15: left wrist
    lm(0.16, 0.62),
    // 16: right wrist
    lm(0.16, 0.68),
    // 17–22: hands
    faint(0.15, 0.61),
    faint(0.15, 0.69),
    faint(0.15, 0.62),
    faint(0.15, 0.68),
    faint(0.16, 0.61),
    faint(0.16, 0.69),
    // 23: left hip
    lm(0.52, 0.62),
    // 24: right hip
    lm(0.52, 0.68),
    // 25: left knee (bent up)
    lm(0.62, 0.50),
    // 26: right knee (bent up)
    lm(0.62, 0.56),
    // 27: left ankle
    lm(0.72, 0.65),
    // 28: right ankle
    lm(0.72, 0.70),
    // 29–32: feet
    faint(0.73, 0.65),
    faint(0.73, 0.70),
    faint(0.74, 0.65),
    faint(0.74, 0.70),
  ];
}

/**
 * Prone (face down), side view.
 * Head at left (x=0.15), feet at right (x=0.85).
 * Body lying flat at y~0.65.
 */
function createProne(): Landmark[] {
  return [
    // 0: nose (face down)
    lm(0.15, 0.68),
    // 1–6: eyes
    faint(0.14, 0.66),
    faint(0.13, 0.66),
    faint(0.12, 0.66),
    faint(0.16, 0.66),
    faint(0.17, 0.66),
    faint(0.18, 0.66),
    // 7–8: ears
    faint(0.14, 0.64),
    faint(0.16, 0.64),
    // 9–10: mouth
    faint(0.15, 0.69),
    faint(0.15, 0.69),
    // 11: left shoulder (on top)
    lm(0.25, 0.62),
    // 12: right shoulder
    lm(0.25, 0.68),
    // 13: left elbow
    lm(0.20, 0.58),
    // 14: right elbow
    lm(0.20, 0.72),
    // 15: left wrist
    lm(0.18, 0.55),
    // 16: right wrist
    lm(0.18, 0.75),
    // 17–22: hands
    faint(0.17, 0.54),
    faint(0.17, 0.76),
    faint(0.17, 0.55),
    faint(0.17, 0.75),
    faint(0.18, 0.54),
    faint(0.18, 0.76),
    // 23: left hip
    lm(0.55, 0.62),
    // 24: right hip
    lm(0.55, 0.68),
    // 25: left knee
    lm(0.72, 0.62),
    // 26: right knee
    lm(0.72, 0.68),
    // 27: left ankle
    lm(0.85, 0.62),
    // 28: right ankle
    lm(0.85, 0.68),
    // 29–32: feet
    faint(0.86, 0.61),
    faint(0.86, 0.67),
    faint(0.87, 0.62),
    faint(0.87, 0.68),
  ];
}

/**
 * Sidelying (on left side), viewed from front.
 * Head at left (x=0.15), body stacked, hips center.
 */
function createSidelying(): Landmark[] {
  return [
    // 0: nose
    lm(0.15, 0.62),
    // 1–6: eyes
    faint(0.14, 0.60),
    faint(0.13, 0.60),
    faint(0.12, 0.60),
    faint(0.16, 0.60),
    faint(0.17, 0.60),
    faint(0.18, 0.60),
    // 7–8: ears
    faint(0.14, 0.64),
    faint(0.16, 0.64),
    // 9–10: mouth
    faint(0.15, 0.63),
    faint(0.15, 0.63),
    // 11: left shoulder (bottom, on ground)
    lm(0.25, 0.68),
    // 12: right shoulder (top)
    lm(0.25, 0.58),
    // 13: left elbow (bottom)
    lm(0.20, 0.70),
    // 14: right elbow (top)
    lm(0.22, 0.55),
    // 15: left wrist
    lm(0.18, 0.68),
    // 16: right wrist
    lm(0.20, 0.52),
    // 17–22: hands
    faint(0.17, 0.69),
    faint(0.19, 0.51),
    faint(0.17, 0.68),
    faint(0.19, 0.52),
    faint(0.18, 0.69),
    faint(0.20, 0.51),
    // 23: left hip (bottom)
    lm(0.50, 0.68),
    // 24: right hip (top)
    lm(0.50, 0.58),
    // 25: left knee (bottom)
    lm(0.62, 0.70),
    // 26: right knee (top)
    lm(0.62, 0.56),
    // 27: left ankle (bottom)
    lm(0.75, 0.70),
    // 28: right ankle (top)
    lm(0.75, 0.56),
    // 29–32: feet
    faint(0.76, 0.71),
    faint(0.76, 0.55),
    faint(0.77, 0.70),
    faint(0.77, 0.56),
  ];
}

/**
 * Quadruped (hands and knees), side view.
 * Hands at x=0.25, knees at x=0.65, back roughly horizontal.
 */
function createQuadruped(): Landmark[] {
  return [
    // 0: nose
    lm(0.20, 0.40),
    // 1–6: eyes
    faint(0.19, 0.38),
    faint(0.18, 0.38),
    faint(0.17, 0.38),
    faint(0.21, 0.38),
    faint(0.22, 0.38),
    faint(0.23, 0.38),
    // 7–8: ears
    faint(0.18, 0.40),
    faint(0.22, 0.40),
    // 9–10: mouth
    faint(0.20, 0.42),
    faint(0.20, 0.42),
    // 11: left shoulder
    lm(0.30, 0.45),
    // 12: right shoulder
    lm(0.30, 0.50),
    // 13: left elbow
    lm(0.27, 0.58),
    // 14: right elbow
    lm(0.27, 0.62),
    // 15: left wrist (on ground)
    lm(0.25, 0.72),
    // 16: right wrist
    lm(0.25, 0.75),
    // 17–22: hands
    faint(0.24, 0.73),
    faint(0.24, 0.76),
    faint(0.25, 0.74),
    faint(0.25, 0.77),
    faint(0.26, 0.73),
    faint(0.26, 0.76),
    // 23: left hip
    lm(0.58, 0.45),
    // 24: right hip
    lm(0.58, 0.50),
    // 25: left knee (on ground)
    lm(0.65, 0.72),
    // 26: right knee
    lm(0.65, 0.75),
    // 27: left ankle
    lm(0.75, 0.72),
    // 28: right ankle
    lm(0.75, 0.75),
    // 29–32: feet
    faint(0.76, 0.72),
    faint(0.76, 0.75),
    faint(0.77, 0.73),
    faint(0.77, 0.76),
  ];
}

/**
 * Seated pose, side view.
 * Torso upright, hips at ~90 degrees, knees at ~90 degrees.
 */
function createSeated(): Landmark[] {
  return [
    // 0: nose
    lm(0.40, 0.12),
    // 1–6: eyes
    faint(0.39, 0.10),
    faint(0.38, 0.10),
    faint(0.37, 0.10),
    faint(0.41, 0.10),
    faint(0.42, 0.10),
    faint(0.43, 0.10),
    // 7–8: ears
    faint(0.38, 0.12),
    faint(0.42, 0.12),
    // 9–10: mouth
    faint(0.40, 0.14),
    faint(0.40, 0.14),
    // 11: left shoulder
    lm(0.38, 0.25),
    // 12: right shoulder
    lm(0.42, 0.25),
    // 13: left elbow
    lm(0.36, 0.38),
    // 14: right elbow
    lm(0.44, 0.38),
    // 15: left wrist
    lm(0.35, 0.48),
    // 16: right wrist
    lm(0.45, 0.48),
    // 17–22: hands
    faint(0.34, 0.50),
    faint(0.46, 0.50),
    faint(0.35, 0.50),
    faint(0.45, 0.50),
    faint(0.36, 0.49),
    faint(0.44, 0.49),
    // 23: left hip (seated surface)
    lm(0.40, 0.52),
    // 24: right hip
    lm(0.44, 0.52),
    // 25: left knee (out in front)
    lm(0.55, 0.52),
    // 26: right knee
    lm(0.58, 0.52),
    // 27: left ankle
    lm(0.55, 0.72),
    // 28: right ankle
    lm(0.58, 0.72),
    // 29–32: feet
    faint(0.54, 0.74),
    faint(0.57, 0.74),
    faint(0.56, 0.74),
    faint(0.59, 0.74),
  ];
}

const POSE_CREATORS: Record<BasePoseType, () => Landmark[]> = {
  standing: createStanding,
  standingSide: createStandingSide,
  supine: createSupine,
  prone: createProne,
  sidelying: createSidelying,
  quadruped: createQuadruped,
  seated: createSeated,
};

/**
 * Returns a fresh copy of the specified base pose.
 * Always returns a new array so callers can mutate safely.
 */
export function getBasePose(type: BasePoseType): Landmark[] {
  const creator = POSE_CREATORS[type];
  return creator().map((l) => ({ ...l }));
}

/**
 * Deep-clone an array of landmarks (for animation mutations).
 */
export function clonePose(pose: Landmark[]): Landmark[] {
  return pose.map((l) => ({ ...l }));
}
