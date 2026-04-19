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

function rotateAroundPoint(
  pose: { x: number; y: number; z: number; visibility: number }[],
  cx: number,
  cy: number,
  indices: number[],
  angleDeg: number,
): void {
  for (const idx of indices) {
    const child = pose[idx];
    const rotated = rotatePoint(child.x, child.y, cx, cy, angleDeg);
    pose[idx] = { ...child, x: rotated.x, y: rotated.y };
  }
}

const UPPER_BODY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const LEFT_ARM = [13, 15, 17, 19, 21];
const RIGHT_ARM = [14, 16, 18, 20, 22];
const LEFT_LEG = [25, 27, 29, 31];
const RIGHT_LEG = [26, 28, 30, 32];

/**
 * Dead bug: supine, opposite arm/leg extend.
 * Used for: dead_bug
 */
export const deadBug: MovementTemplate = {
  basePose: "supine",
  activeJoints: [11, 13, 24, 26],
  description: "Supine dead bug (opposite arm and leg extend)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);
    // Left arm reaches overhead (rotate around left shoulder)
    const armAngle = t2 * 40;
    rotateJointsAround(pose, 11, [13, 15, 17, 19, 21], -armAngle);
    // Right leg extends out (rotate around right hip)
    const legAngle = t2 * 30;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], legAngle);
    return pose;
  },
};

/**
 * Bird dog: quadruped, opposite arm/leg extend.
 * Used for: bird_dog
 */
export const birdDog: MovementTemplate = {
  basePose: "quadruped",
  activeJoints: [11, 13, 24, 26],
  description: "Quadruped bird dog (opposite arm and leg extend)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("quadruped"));
    const t2 = easeInOutSine(t);
    // Left arm extends forward (rotate around shoulder)
    const armAngle = t2 * -60;
    rotateJointsAround(pose, 11, [13, 15, 17, 19, 21], armAngle);
    // Right leg extends back (rotate around hip)
    const legAngle = t2 * -50;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], legAngle);
    return pose;
  },
};

/**
 * Press-up: prone, push upper body upward (McKenzie extension).
 * Used for: prone_press_up
 */
export const pressUp: MovementTemplate = {
  basePose: "prone",
  activeJoints: [11, 12, 23, 24],
  description: "Prone press-up (cobra/McKenzie extension)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("prone"));
    const t2 = easeInOutSine(t);
    // Rotate upper body upward around the hips (extension)
    const hipMidX = (pose[23].x + pose[24].x) / 2;
    const hipMidY = (pose[23].y + pose[24].y) / 2;
    const angle = t2 * -30;
    rotateAroundPoint(pose, hipMidX, hipMidY, UPPER_BODY, angle);
    return pose;
  },
};

/**
 * Cat-cow: quadruped, alternating arch and round of the spine.
 * Used for: cat_cow
 */
export const catCow: MovementTemplate = {
  basePose: "quadruped",
  activeJoints: [11, 12, 23, 24],
  description: "Quadruped cat-cow (arch and round spine)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("quadruped"));
    // Use a full sine wave: 0-0.5 = cow (extension), 0.5-1.0 = cat (flexion)
    const phase = Math.sin(t * Math.PI * 2);
    const sag = phase * 0.06; // positive = belly drops (cow), negative = back rounds (cat)
    // Move mid-spine (approximated by shifting shoulders/hips y)
    const midX = (pose[11].x + pose[23].x) / 2;
    // Head follows
    pose[0] = { ...pose[0], y: pose[0].y - sag * 0.5 };
    // Shoulders
    pose[11] = { ...pose[11], y: pose[11].y + sag };
    pose[12] = { ...pose[12], y: pose[12].y + sag };
    // Hips
    pose[23] = { ...pose[23], y: pose[23].y + sag };
    pose[24] = { ...pose[24], y: pose[24].y + sag };
    return pose;
  },
};

/**
 * Pelvic tilt: supine, flatten low back by tilting pelvis.
 * Used for: pelvic_tilt_supine
 */
export const pelvicTilt: MovementTemplate = {
  basePose: "supine",
  activeJoints: [23, 24],
  description: "Supine pelvic tilt (flatten low back)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);
    // Subtle posterior tilt: hips rotate slightly
    const tilt = t2 * 0.03;
    pose[23] = { ...pose[23], y: pose[23].y - tilt };
    pose[24] = { ...pose[24], y: pose[24].y - tilt };
    // Knees shift slightly toward chest
    pose[25] = { ...pose[25], y: pose[25].y - tilt * 0.5 };
    pose[26] = { ...pose[26], y: pose[26].y - tilt * 0.5 };
    return pose;
  },
};

/**
 * Plank: forearm plank hold with subtle breathing motion.
 * Used for: plank_forearm
 */
export const plank: MovementTemplate = {
  basePose: "prone",
  activeJoints: [11, 12, 23, 24],
  description: "Forearm plank hold with breathing",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("prone"));
    // Set up plank position: body elevated, on forearms and toes
    // Shoulders above elbows
    pose[11] = { ...pose[11], y: 0.55 };
    pose[12] = { ...pose[12], y: 0.60 };
    pose[13] = { ...pose[13], x: 0.22, y: 0.65 };
    pose[14] = { ...pose[14], x: 0.22, y: 0.70 };
    pose[15] = { ...pose[15], x: 0.18, y: 0.65 };
    pose[16] = { ...pose[16], x: 0.18, y: 0.70 };
    // Hips in line
    pose[23] = { ...pose[23], x: 0.52, y: 0.55 };
    pose[24] = { ...pose[24], x: 0.52, y: 0.60 };
    // Head
    pose[0] = { ...pose[0], x: 0.18, y: 0.50 };

    // Subtle breathing motion
    const breath = Math.sin(t * Math.PI * 2) * 0.01;
    pose[23] = { ...pose[23], y: pose[23].y + breath };
    pose[24] = { ...pose[24], y: pose[24].y + breath };
    return pose;
  },
};

/**
 * Side plank: lateral plank hold.
 * Used for: side_plank
 */
export const sidePlank: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [11, 23, 27],
  description: "Side plank hold",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));
    const t2 = easeInOutSine(t);
    // Lift hips upward from sidelying position
    const lift = t2 * 0.10;
    // Lift hips and upper body
    for (const idx of [23, 24, 11, 12, 0, 7, 8, 9, 10]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - lift };
    }
    // Bottom arm acts as support (elbow stays)
    pose[13] = { ...pose[13], y: 0.70 };
    pose[15] = { ...pose[15], y: 0.68, x: 0.18 };
    // Top arm on hip or extended
    pose[14] = { ...pose[14], y: pose[14].y - lift };
    pose[16] = { ...pose[16], y: pose[16].y - lift };
    // Slight breathing
    const breath = Math.sin(t * Math.PI * 4) * 0.005;
    pose[23] = { ...pose[23], y: pose[23].y + breath };
    pose[24] = { ...pose[24], y: pose[24].y + breath };
    return pose;
  },
};
