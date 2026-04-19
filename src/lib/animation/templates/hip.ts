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
 * Bridge: lying on back, knees bent, feet flat. Hips lift toward ceiling,
 * creating a straight line from shoulders to knees. Then lower back down.
 * Arms stay at sides on the ground.
 */
export const bridge: MovementTemplate = {
  basePose: "supine",
  activeJoints: [23, 24, 25, 26],
  description: "Supine glute bridge — hips lift toward ceiling",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);

    // In supine side view: hips are at ~x=0.52, knees at x=0.62 (bent up)
    // Hips lift upward (decrease y) to create a line from shoulders to knees
    const lift = t2 * 0.14;

    // Lift hips up
    pose[23] = { ...pose[23], y: pose[23].y - lift };
    pose[24] = { ...pose[24], y: pose[24].y - lift };

    // Knees stay roughly in place (feet planted), slight adjustment
    pose[25] = { ...pose[25], y: pose[25].y - lift * 0.2 };
    pose[26] = { ...pose[26], y: pose[26].y - lift * 0.2 };

    // Arms stay on the ground (no change)
    // Shoulders stay on ground (no change)

    return pose;
  },
};

/**
 * Sidelying abduction: lying on side, bottom leg slightly bent.
 * Top leg lifts straight up toward ceiling (hip abduction ~30-40°).
 * Keep leg straight and slightly behind the hip line.
 */
export const sidelyingAbduction: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [24, 26, 28],
  description: "Sidelying hip abduction — top leg lifts toward ceiling",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));
    const t2 = easeInOutSine(t);

    // Straighten top leg first (right side: hip 24, knee 26, ankle 28)
    // In sidelying view, "up toward ceiling" = decreasing y
    const lift = t2 * 0.14;

    // Lift the entire top leg (hip stays as pivot, leg lifts)
    // Rotate top leg around hip upward
    const angle = t2 * -35;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], angle);

    return pose;
  },
};

/**
 * Fire hydrant: on hands and knees (quadruped). One knee lifts out to the side
 * while staying bent at 90°. Like a dog at a fire hydrant.
 * In quadruped side view, the knee lifts upward (away from ground).
 */
export const fireHydrant: MovementTemplate = {
  basePose: "quadruped",
  activeJoints: [24, 26],
  description: "Quadruped fire hydrant — knee lifts sideways while bent",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("quadruped"));
    const t2 = easeInOutSine(t);

    // Right leg (hip 24, knee 26, ankle 28)
    // In side view, lifting knee out to side appears as knee lifting upward
    // Rotate the bent leg around the hip
    const angle = t2 * -40;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], angle);

    return pose;
  },
};

/**
 * Hip flexor stretch: half-kneeling position (one knee on ground, other foot forward).
 * Push hips forward while keeping torso upright. Stretch in front of the back hip.
 * Side view.
 */
export const hipFlexorStretch: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [23, 24, 25, 26],
  description: "Half-kneeling hip flexor stretch — hips push forward",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    const t2 = easeInOutSine(t);

    // Set up half-kneeling position first:
    // Front leg (right, idx 26) — foot forward, knee bent ~90°
    pose[26] = { x: 0.58, y: 0.72, z: 0, visibility: 1 };
    pose[28] = { x: 0.58, y: 0.90, z: 0, visibility: 1 };
    pose[30] = { x: 0.57, y: 0.92, z: 0, visibility: 0.3 };
    pose[32] = { x: 0.59, y: 0.93, z: 0, visibility: 0.3 };

    // Back leg (left, idx 25) — knee on ground, shin back
    pose[25] = { x: 0.42, y: 0.90, z: 0, visibility: 1 };
    pose[27] = { x: 0.35, y: 0.90, z: 0, visibility: 1 };
    pose[29] = { x: 0.34, y: 0.88, z: 0, visibility: 0.3 };
    pose[31] = { x: 0.33, y: 0.90, z: 0, visibility: 0.3 };

    // Drop hips down to kneeling height
    pose[23] = { ...pose[23], y: 0.68 };
    pose[24] = { ...pose[24], y: 0.68 };

    // Drop upper body to match
    const dropAmount = 0.16;
    for (let i = 0; i <= 22; i++) {
      pose[i] = { ...pose[i], y: pose[i].y + dropAmount };
    }

    // Animation: push hips forward (increase x) while keeping torso upright
    const pushForward = t2 * 0.05;
    pose[23] = { ...pose[23], x: pose[23].x + pushForward };
    pose[24] = { ...pose[24], x: pose[24].x + pushForward };

    // Torso stays upright (slight lean back at full stretch)
    for (let i = 0; i <= 22; i++) {
      pose[i] = { ...pose[i], x: pose[i].x + pushForward * 0.3 };
    }

    return pose;
  },
};

/**
 * Hip hinge: standing, slight knee bend. Bend forward at the hips,
 * pushing butt backward. Back stays straight/flat. Similar to Romanian deadlift.
 * Side view.
 */
export const hipHinge: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [23, 24, 11, 12],
  description: "Standing hip hinge — bend forward at hips, back flat",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    const t2 = easeInOutSine(t);

    // Slight knee bend first
    const kneeBend = 0.02;
    pose[25] = { ...pose[25], x: pose[25].x + kneeBend, y: pose[25].y - kneeBend };
    pose[26] = { ...pose[26], x: pose[26].x + kneeBend, y: pose[26].y - kneeBend };

    // Rotate upper body forward around hips (clockwise = positive angle in screen coords)
    // ~60° of hip flexion
    const angle = t2 * 60;
    const upperBody = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    const hipMidX = (pose[23].x + pose[24].x) / 2;
    const hipMidY = (pose[23].y + pose[24].y) / 2;
    for (const idx of upperBody) {
      const rotated = rotatePoint(pose[idx].x, pose[idx].y, hipMidX, hipMidY, angle);
      pose[idx] = { ...pose[idx], x: rotated.x, y: rotated.y };
    }

    // Hips push backward slightly
    const hipShift = t2 * 0.03;
    pose[23] = { ...pose[23], x: pose[23].x - hipShift };
    pose[24] = { ...pose[24], x: pose[24].x - hipShift };

    return pose;
  },
};
