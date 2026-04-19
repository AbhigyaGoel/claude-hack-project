import type { MovementTemplate } from "../types";
import { clonePose, getBasePose } from "../basePoses";
import { easeInOutSine, rotatePoint } from "../easing";

/**
 * Rotates a set of child landmark indices around a pivot landmark by the given angle.
 * Mutates the pose array in place (caller must clone first).
 */
function rotateJointsAround(
  pose: { x: number; y: number; z: number; visibility: number }[],
  pivotIdx: number,
  childIndices: number[],
  angleDeg: number,
): void {
  const pivot = pose[pivotIdx];
  for (const idx of childIndices) {
    const child = pose[idx];
    const rotated = rotatePoint(child.x, child.y, pivot.x, pivot.y, angleDeg);
    pose[idx] = { ...child, x: rotated.x, y: rotated.y };
  }
}

// Left arm chain indices from shoulder
const LEFT_ARM = [13, 15, 17, 19, 21];
// Right arm chain indices from shoulder
const RIGHT_ARM = [14, 16, 18, 20, 22];

/**
 * Overhead reach: arms raise from sides to overhead (shoulder flexion).
 * Used for: wall_slide, supine_flexion, prone_y_raise, wall_angel
 */
export const overheadReach: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12, 13, 14],
  description: "Arms raise overhead (shoulder flexion)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const angle = easeInOutSine(t) * -150; // negative = upward in screen coords
    rotateJointsAround(pose, 11, LEFT_ARM, angle);
    rotateJointsAround(pose, 12, RIGHT_ARM, angle);
    return pose;
  },
};

/**
 * Lateral raise: arms raise to the side (shoulder abduction).
 * Used for: shoulder_abduction, prone_t_raise
 */
export const lateralRaise: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12, 13, 14, 15, 16],
  description: "Arms raise sideways (shoulder abduction)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const angle = easeInOutSine(t) * -80;
    // Left arm goes counter-clockwise (up-left), right goes clockwise (up-right)
    rotateJointsAround(pose, 11, LEFT_ARM, angle);
    rotateJointsAround(pose, 12, RIGHT_ARM, -angle);
    return pose;
  },
};

/**
 * External rotation: elbow at 90 degrees, forearm rotates outward.
 * Used for: ER exercises (sidelying, standing band, 90-degree)
 */
export const externalRotation: MovementTemplate = {
  basePose: "standing",
  activeJoints: [12, 14, 16],
  description: "Forearm rotates outward (external rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    // Set right elbow at 90 degrees bent at side
    pose[14] = { x: 0.59, y: 0.38, z: 0, visibility: 1 };
    pose[16] = { x: 0.59, y: 0.38, z: 0, visibility: 1 };
    // Position forearm horizontally (elbow bent 90)
    pose[16] = { x: 0.68, y: 0.38, z: 0, visibility: 1 };
    // Rotate forearm around elbow
    const angle = easeInOutSine(t) * -45;
    rotateJointsAround(pose, 14, [16, 18, 20, 22], angle);
    return pose;
  },
};

/**
 * Internal rotation: elbow at 90 degrees, forearm rotates inward.
 * Used for: IR exercises
 */
export const internalRotation: MovementTemplate = {
  basePose: "standing",
  activeJoints: [12, 14, 16],
  description: "Forearm rotates inward (internal rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    // Elbow at side, forearm pointing forward
    pose[14] = { x: 0.59, y: 0.38, z: 0, visibility: 1 };
    pose[16] = { x: 0.68, y: 0.38, z: 0, visibility: 1 };
    // Rotate forearm inward (positive = clockwise = inward)
    const angle = easeInOutSine(t) * 45;
    rotateJointsAround(pose, 14, [16, 18, 20, 22], angle);
    return pose;
  },
};

/**
 * Scapular squeeze: arms pull back slightly, squeezing shoulder blades.
 * Used for: scapular_retraction
 */
export const scapularSqueeze: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12, 13, 14],
  description: "Arms pull back, squeezing shoulder blades",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);
    // Elbows pull back and shoulders pinch together
    const dx = t2 * 0.03;
    pose[11] = { ...pose[11], x: pose[11].x - dx };
    pose[12] = { ...pose[12], x: pose[12].x + dx };
    pose[13] = { ...pose[13], x: pose[13].x - dx * 1.5 };
    pose[14] = { ...pose[14], x: pose[14].x + dx * 1.5 };
    // Bend elbows slightly back
    const angle = t2 * -15;
    rotateJointsAround(pose, 13, [15, 17, 19, 21], angle);
    rotateJointsAround(pose, 14, [16, 18, 20, 22], -angle);
    return pose;
  },
};

/**
 * Pendulum: bent over, arm swings gently.
 * Used for: pendulum exercise
 */
export const pendulum: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [12, 14, 16],
  description: "Bent over, arm swings like a pendulum",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    // Bend torso forward: shift upper body forward and down
    const bend = 0.12;
    pose[0] = { ...pose[0], x: pose[0].x + 0.10, y: pose[0].y + bend };
    pose[11] = { ...pose[11], x: pose[11].x + 0.05, y: pose[11].y + bend * 0.8 };
    pose[12] = { ...pose[12], x: pose[12].x + 0.05, y: pose[12].y + bend * 0.8 };
    // Right arm hangs down and swings
    pose[14] = { ...pose[14], x: 0.55, y: 0.55, z: 0, visibility: 1 };
    pose[16] = { ...pose[16], x: 0.55, y: 0.68, z: 0, visibility: 1 };
    // Swing the hanging arm
    const swingAngle = Math.sin(easeInOutSine(t) * Math.PI * 2) * 25;
    rotateJointsAround(pose, 12, [14, 16, 18, 20, 22], swingAngle);
    return pose;
  },
};

/**
 * Shrug: shoulders elevate upward.
 * Used for: shoulder_shrug
 */
export const shrug: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12],
  description: "Shoulders elevate upward (shrug)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const lift = easeInOutSine(t) * -0.04;
    // Lift shoulders, elbows, and wrists
    for (const idx of [11, 13, 15, 17, 19, 21]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + lift };
    }
    for (const idx of [12, 14, 16, 18, 20, 22]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + lift };
    }
    return pose;
  },
};

/**
 * Cross-body stretch: arm reaches across the chest.
 * Used for: cross_body_stretch
 */
export const crossBody: MovementTemplate = {
  basePose: "standing",
  activeJoints: [12, 14, 16],
  description: "Arm reaches across the chest",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const angle = easeInOutSine(t) * 90; // clockwise moves right arm across
    rotateJointsAround(pose, 12, RIGHT_ARM, angle);
    return pose;
  },
};
