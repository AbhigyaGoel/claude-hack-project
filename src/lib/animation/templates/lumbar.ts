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
 * Dead bug: lying on back, arms pointing toward ceiling, hips and knees at 90° (tabletop).
 * Simultaneously extend opposite arm overhead and opposite leg straight.
 * Return to start, then switch sides.
 *
 * Since the hook applies pingPong (t goes 0->1->0), we animate one side per cycle:
 * left arm + right leg extend simultaneously.
 */
export const deadBug: MovementTemplate = {
  basePose: "supine",
  activeJoints: [11, 13, 15, 24, 26, 28],
  description: "Supine dead bug — opposite arm and leg extend from tabletop",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);

    // Set up tabletop position: arms pointing up (toward ceiling), legs in tabletop
    // In supine side view: "toward ceiling" = upward = decreasing y

    // Left arm points toward ceiling (straight up from shoulder)
    pose[13] = { x: 0.25, y: 0.50, z: 0, visibility: 1 };
    pose[15] = { x: 0.25, y: 0.40, z: 0, visibility: 1 };
    pose[17] = { x: 0.24, y: 0.39, z: 0, visibility: 0.3 };
    pose[19] = { x: 0.25, y: 0.39, z: 0, visibility: 0.3 };
    pose[21] = { x: 0.26, y: 0.39, z: 0, visibility: 0.3 };

    // Right arm points toward ceiling
    pose[14] = { x: 0.25, y: 0.56, z: 0, visibility: 1 };
    pose[16] = { x: 0.25, y: 0.46, z: 0, visibility: 1 };
    pose[18] = { x: 0.24, y: 0.45, z: 0, visibility: 0.3 };
    pose[20] = { x: 0.25, y: 0.45, z: 0, visibility: 0.3 };
    pose[22] = { x: 0.26, y: 0.45, z: 0, visibility: 0.3 };

    // Left leg in tabletop (hip 90°, knee 90°) — already roughly correct in supine base
    // Right leg in tabletop
    // Keep base knee positions

    // Animation: extend left arm overhead and right leg straight simultaneously
    // Left arm rotates overhead (counter-clockwise around shoulder = negative)
    const armAngle = t2 * -80; // from vertical toward head
    rotateJointsAround(pose, 11, [13, 15, 17, 19, 21], armAngle);

    // Right leg extends straight (rotate around hip, clockwise = positive = extending)
    const legAngle = t2 * 40;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], legAngle);

    return pose;
  },
};

/**
 * Bird dog: on hands and knees. Extend opposite arm forward and opposite leg backward
 * simultaneously, creating a straight line. Return to start, switch sides.
 */
export const birdDog: MovementTemplate = {
  basePose: "quadruped",
  activeJoints: [11, 13, 15, 24, 26, 28],
  description: "Quadruped bird dog — opposite arm forward, opposite leg back",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("quadruped"));
    const t2 = easeInOutSine(t);

    // Left arm extends forward (rotate around shoulder, counter-clockwise = negative)
    // From ground position up and forward to horizontal
    const armAngle = t2 * -70;
    rotateJointsAround(pose, 11, [13, 15, 17, 19, 21], armAngle);

    // Right leg extends backward (rotate around hip, counter-clockwise = negative)
    // From ground position up and backward to horizontal
    const legAngle = t2 * -55;
    rotateJointsAround(pose, 24, [26, 28, 30, 32], legAngle);

    return pose;
  },
};

/**
 * Press-up (McKenzie extension): lying face down, hands under shoulders.
 * Push upper body up by straightening arms while hips stay on the ground.
 * Like a cobra pose.
 */
export const pressUp: MovementTemplate = {
  basePose: "prone",
  activeJoints: [11, 12, 13, 14, 15, 16],
  description: "Prone press-up — upper body lifts while hips stay down (McKenzie)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("prone"));
    const t2 = easeInOutSine(t);

    // Rotate upper body upward around the hip area (extension)
    // Hips stay on the ground, upper body peels up
    const hipMidX = (pose[23].x + pose[24].x) / 2;
    const hipMidY = (pose[23].y + pose[24].y) / 2;

    // ~30° of extension
    const angle = t2 * -30;
    rotateAroundPoint(pose, hipMidX, hipMidY, UPPER_BODY, angle);

    // Arms push down (elbows straighten) to support the press-up
    // Move elbows closer to body and wrists under shoulders
    const armExtend = t2;
    pose[13] = {
      ...pose[13],
      x: pose[13].x + armExtend * 0.05,
      y: pose[13].y + armExtend * 0.08,
    };
    pose[14] = {
      ...pose[14],
      x: pose[14].x + armExtend * 0.05,
      y: pose[14].y - armExtend * 0.04,
    };

    return pose;
  },
};

/**
 * Cat-cow: on hands and knees. Cat: round back upward (flex spine, tuck chin).
 * Cow: arch back downward (extend spine, look up). Alternate smoothly.
 *
 * Uses full sine wave so t=0 is neutral, first half = cow (belly drops),
 * second half = cat (back rounds).
 */
export const catCow: MovementTemplate = {
  basePose: "quadruped",
  activeJoints: [0, 11, 12, 23, 24],
  description: "Quadruped cat-cow — alternate arching and rounding spine",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("quadruped"));

    // Full sine wave: 0->0.5 = cow (extension), 0.5->1 = cat (flexion)
    const phase = Math.sin(t * Math.PI * 2);
    // Positive phase = cow (belly drops, head up), negative = cat (back rounds, head down)
    const sag = phase * 0.06;

    // Mid-spine approximation: shift shoulders and hips vertically
    // Cow: shoulders drop (increase y), head lifts (decrease y)
    // Cat: shoulders rise (decrease y), head drops (increase y)
    pose[11] = { ...pose[11], y: pose[11].y + sag };
    pose[12] = { ...pose[12], y: pose[12].y + sag };
    pose[23] = { ...pose[23], y: pose[23].y + sag * 0.8 };
    pose[24] = { ...pose[24], y: pose[24].y + sag * 0.8 };

    // Head: cow = look up (decrease y), cat = tuck chin (increase y)
    pose[0] = { ...pose[0], y: pose[0].y - sag * 1.2 };
    // Eyes and face follow head
    for (const idx of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - sag * 1.0 };
    }

    return pose;
  },
};

/**
 * Pelvic tilt: lying on back, knees bent. Flatten the low back against the floor
 * by tilting the pelvis posteriorly. Very small movement — just the low back pressing down.
 */
export const pelvicTilt: MovementTemplate = {
  basePose: "supine",
  activeJoints: [23, 24],
  description: "Supine pelvic tilt — flatten low back against floor",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);

    // Very subtle posterior tilt: pelvis rotates so top tilts backward
    // In supine side view, hips shift very slightly upward and knees draw in slightly
    const tilt = t2 * 0.025;

    // Hips tilt posteriorly (subtle upward shift)
    pose[23] = { ...pose[23], y: pose[23].y - tilt };
    pose[24] = { ...pose[24], y: pose[24].y - tilt };

    // Knees draw very slightly toward chest
    pose[25] = { ...pose[25], x: pose[25].x - tilt * 0.3, y: pose[25].y - tilt * 0.4 };
    pose[26] = { ...pose[26], x: pose[26].x - tilt * 0.3, y: pose[26].y - tilt * 0.4 };

    return pose;
  },
};

/**
 * Plank: forearm plank — forearms on ground, body in a straight line from head to heels.
 * Shows slight engagement/tension via subtle breathing motion.
 * Uses prone base and adjusts to elevated plank position.
 */
export const plank: MovementTemplate = {
  basePose: "prone",
  activeJoints: [11, 12, 13, 14, 23, 24],
  description: "Forearm plank — straight line from head to heels",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("prone"));

    // Elevate body into plank position: supported on forearms and toes
    // Body lifts to create straight line

    // Head slightly forward and up
    pose[0] = { ...pose[0], x: 0.18, y: 0.52 };
    // Shoulders elevated
    pose[11] = { ...pose[11], x: 0.25, y: 0.55 };
    pose[12] = { ...pose[12], x: 0.25, y: 0.60 };
    // Elbows on ground directly under shoulders
    pose[13] = { ...pose[13], x: 0.22, y: 0.65 };
    pose[14] = { ...pose[14], x: 0.22, y: 0.70 };
    // Forearms flat on ground, pointing forward
    pose[15] = { ...pose[15], x: 0.16, y: 0.65 };
    pose[16] = { ...pose[16], x: 0.16, y: 0.70 };
    // Hips in line with shoulders (straight line)
    pose[23] = { ...pose[23], x: 0.52, y: 0.55 };
    pose[24] = { ...pose[24], x: 0.52, y: 0.60 };
    // Knees straight and elevated
    pose[25] = { ...pose[25], x: 0.72, y: 0.57 };
    pose[26] = { ...pose[26], x: 0.72, y: 0.62 };
    // Toes on ground
    pose[27] = { ...pose[27], x: 0.85, y: 0.60 };
    pose[28] = { ...pose[28], x: 0.85, y: 0.65 };

    // Subtle breathing: hips rise and fall very slightly
    const breath = Math.sin(t * Math.PI * 2) * 0.008;
    pose[23] = { ...pose[23], y: pose[23].y + breath };
    pose[24] = { ...pose[24], y: pose[24].y + breath };

    return pose;
  },
};

/**
 * Side plank: lying on side, support on forearm. Lift hips off ground so body
 * forms a straight line from head to feet. Top arm can rest on hip.
 */
export const sidePlank: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [11, 23, 24],
  description: "Side plank — hips lift to form straight body line",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));
    const t2 = easeInOutSine(t);

    // Bottom arm (left, idx 11/13/15) acts as support — elbow under shoulder
    pose[13] = { x: 0.22, y: 0.72, z: 0, visibility: 1 };
    pose[15] = { x: 0.17, y: 0.70, z: 0, visibility: 1 };

    // Lift hips upward from sidelying rest position
    const lift = t2 * 0.12;

    // Lift hips and torso
    for (const idx of [23, 24]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - lift };
    }
    // Shoulders and head lift too
    for (const idx of [11, 12, 0, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - lift };
    }

    // Top arm (right) rests on hip
    pose[14] = { ...pose[14], y: pose[14].y - lift, x: 0.40 };
    pose[16] = { ...pose[16], y: pose[16].y - lift, x: 0.48 };

    // Legs stay on ground, ankles stacked
    // Knees lift slightly to maintain the straight line
    pose[25] = { ...pose[25], y: pose[25].y - lift * 0.3 };
    pose[26] = { ...pose[26], y: pose[26].y - lift * 0.5 };

    // Subtle breathing
    const breath = Math.sin(t * Math.PI * 4) * 0.004;
    pose[23] = { ...pose[23], y: pose[23].y + breath };
    pose[24] = { ...pose[24], y: pose[24].y + breath };

    return pose;
  },
};
