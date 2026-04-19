import type { MovementTemplate } from "../types";
import { clonePose, getBasePose } from "../basePoses";
import { easeInOutSine, rotatePoint } from "../easing";

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

/**
 * Bridge: supine, hips lift off the ground.
 * Used for: glute_bridge, single_leg_bridge
 */
export const bridge: MovementTemplate = {
  basePose: "supine",
  activeJoints: [23, 24, 25, 26],
  description: "Hips lift upward from supine (bridge)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const lift = easeInOutSine(t) * 0.12;
    // Lift hips upward (decrease y)
    pose[23] = { ...pose[23], y: pose[23].y - lift };
    pose[24] = { ...pose[24], y: pose[24].y - lift };
    // Knees stay roughly in place, so the thigh angle changes
    // Slight adjustment to keep it anatomically plausible
    pose[25] = { ...pose[25], y: pose[25].y - lift * 0.3 };
    pose[26] = { ...pose[26], y: pose[26].y - lift * 0.3 };
    return pose;
  },
};

/**
 * Sidelying abduction: top leg lifts upward.
 * Used for: hip_abduction_sidelying
 */
export const sidelyingAbduction: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [24, 26, 28],
  description: "Top leg lifts upward (sidelying hip abduction)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));
    // Lift top leg (right: hip 24, knee 26, ankle 28)
    const lift = easeInOutSine(t) * 0.12;
    for (const idx of [24, 26, 28, 30, 32]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - lift };
    }
    return pose;
  },
};

/**
 * Fire hydrant: quadruped, one knee lifts sideways.
 * Used for: fire_hydrant
 */
export const fireHydrant: MovementTemplate = {
  basePose: "quadruped",
  activeJoints: [24, 26],
  description: "Quadruped fire hydrant (knee lifts sideways)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("quadruped"));
    // Lift right knee outward (in side view, this is upward)
    const angle = easeInOutSine(t) * -35;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], angle);
    return pose;
  },
};

/**
 * Hip flexor stretch: half-kneeling lunge position.
 * Used for: hip_flexor_stretch_half_kneel
 */
export const hipFlexorStretch: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [23, 24, 25, 26],
  description: "Half-kneeling hip flexor stretch",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    const t2 = easeInOutSine(t);
    // Drop into lunge: back knee goes down, front knee bends
    // Front leg (right): bend knee
    pose[26] = { ...pose[26], x: pose[26].x + t2 * 0.05, y: pose[26].y + t2 * 0.05 };
    // Back leg (left): knee drops toward ground
    pose[25] = { ...pose[25], x: pose[25].x - t2 * 0.08, y: pose[25].y + t2 * 0.15 };
    pose[27] = { ...pose[27], x: pose[27].x - t2 * 0.10, y: pose[27].y + t2 * 0.02 };
    pose[29] = { ...pose[29], x: pose[29].x - t2 * 0.10, y: pose[29].y + t2 * 0.02 };
    pose[31] = { ...pose[31], x: pose[31].x - t2 * 0.10, y: pose[31].y + t2 * 0.02 };
    // Shift hips forward and down
    pose[23] = { ...pose[23], y: pose[23].y + t2 * 0.06 };
    pose[24] = { ...pose[24], y: pose[24].y + t2 * 0.06 };
    return pose;
  },
};

/**
 * Hip hinge: standing, bend at hips (deadlift pattern).
 * Used for: hip_hinge
 */
export const hipHinge: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [23, 24, 11, 12],
  description: "Standing hip hinge (bend at hips)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    // Rotate upper body forward around hips
    const angle = easeInOutSine(t) * 60;
    const upperBody = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    // Use midpoint of hips as pivot
    const hipMidX = (pose[23].x + pose[24].x) / 2;
    const hipMidY = (pose[23].y + pose[24].y) / 2;
    for (const idx of upperBody) {
      const rotated = rotatePoint(pose[idx].x, pose[idx].y, hipMidX, hipMidY, angle);
      pose[idx] = { ...pose[idx], x: rotated.x, y: rotated.y };
    }
    return pose;
  },
};
