import type { MovementTemplate } from "../types";
import { clonePose, getBasePose } from "../basePoses";
import { easeInOutSine, rotatePoint, lerp } from "../easing";

/**
 * Rotates child landmarks around a pivot by angleDeg.
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

// Leg chains
const LEFT_LEG_FROM_HIP = [25, 27, 29, 31];
const RIGHT_LEG_FROM_HIP = [26, 28, 30, 32];
const LEFT_LOWER_LEG = [27, 29, 31];
const RIGHT_LOWER_LEG = [28, 30, 32];

/**
 * Squat: hips drop, knees bend (front view).
 * Used for: squat, mini_squat, wall_sit, split_squat, bulgarian_split_squat
 */
export const squat: MovementTemplate = {
  basePose: "standing",
  activeJoints: [23, 24, 25, 26],
  description: "Squat motion with hips dropping and knees bending",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const depth = easeInOutSine(t);
    const drop = depth * 0.12;

    // Drop the whole body (head to hips)
    for (let i = 0; i <= 24; i++) {
      pose[i] = { ...pose[i], y: pose[i].y + drop };
    }
    // Hands and arm details follow
    for (const idx of [17, 18, 19, 20, 21, 22]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + drop };
    }

    // Knees push forward and out
    const kneeSpread = depth * 0.03;
    const kneeForward = depth * 0.04;
    pose[25] = { ...pose[25], x: pose[25].x - kneeSpread, y: pose[25].y + kneeForward };
    pose[26] = { ...pose[26], x: pose[26].x + kneeSpread, y: pose[26].y + kneeForward };

    // Ankles stay planted
    return pose;
  },
};

/**
 * Leg raise: supine, straight leg lifts upward.
 * Used for: SLR, quad_set
 */
export const legRaise: MovementTemplate = {
  basePose: "supine",
  activeJoints: [23, 25, 27],
  description: "Straight leg raise from supine position",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    // Straighten the left leg first
    pose[25] = { ...pose[25], x: 0.68, y: 0.62 };
    pose[27] = { ...pose[27], x: 0.82, y: 0.62 };
    pose[29] = { ...pose[29], x: 0.83, y: 0.62 };
    pose[31] = { ...pose[31], x: 0.84, y: 0.62 };

    // Raise the straight leg (rotate around hip)
    const angle = easeInOutSine(t) * -40;
    rotateJointsAround(pose, 23, [25, 27, 29, 31], angle);
    return pose;
  },
};

/**
 * Heel slide: supine, heel slides toward the buttock (knee flexion).
 * Used for: heel_slide
 */
export const heelSlide: MovementTemplate = {
  basePose: "supine",
  activeJoints: [25, 27],
  description: "Heel slides toward buttock from supine",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);
    // Left knee bends more (heel slides back)
    const kneeUp = t2 * 0.12;
    const ankleBack = t2 * 0.15;
    pose[25] = { ...pose[25], y: pose[25].y - kneeUp };
    pose[27] = { ...pose[27], x: pose[27].x - ankleBack, y: pose[27].y - kneeUp * 0.3 };
    pose[29] = { ...pose[29], x: pose[29].x - ankleBack, y: pose[29].y - kneeUp * 0.3 };
    pose[31] = { ...pose[31], x: pose[31].x - ankleBack, y: pose[31].y - kneeUp * 0.3 };
    return pose;
  },
};

/**
 * Hamstring curl: standing, foot curls backward (knee flexion).
 * Used for: hamstring_curl, standing_hamstring_curl
 */
export const hamstringCurl: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [26, 28],
  description: "Standing hamstring curl (foot curls behind)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    // Curl right lower leg behind by rotating around knee
    const angle = easeInOutSine(t) * -120;
    rotateJointsAround(pose, 26, RIGHT_LOWER_LEG, angle);
    return pose;
  },
};

/**
 * Knee extension: from slight bend to straight.
 * Used for: terminal_knee_extension, seated_knee_extension, quad_set
 */
export const kneeExtension: MovementTemplate = {
  basePose: "seated",
  activeJoints: [25, 27],
  description: "Knee straightens from bent to extended",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("seated"));
    // Extend the left lower leg out (rotate around knee)
    const angle = easeInOutSine(t) * -60;
    rotateJointsAround(pose, 25, LEFT_LOWER_LEG, angle);
    return pose;
  },
};

/**
 * Clamshell: sidelying, top knee opens while feet stay together.
 * Used for: clamshell
 */
export const clamshell: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [24, 26],
  description: "Sidelying clamshell (top knee opens)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));
    // Top leg (right side: hip 24, knee 26, ankle 28)
    // Rotate knee upward around hip
    const angle = easeInOutSine(t) * -30;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], angle);
    return pose;
  },
};
