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

const LEFT_FOOT = [29, 31];
const RIGHT_FOOT = [30, 32];

/**
 * Calf raise: standing, whole body rises on toes.
 * Used for: calf_raise_standing, single_leg_calf_raise, calf_raise_seated
 */
export const calfRaise: MovementTemplate = {
  basePose: "standing",
  activeJoints: [27, 28],
  description: "Standing calf raise (rise on toes)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const lift = easeInOutSine(t) * 0.05;
    // Lift everything except feet (heels lift, toes stay)
    for (let i = 0; i <= 28; i++) {
      // Skip foot index landmarks (29-32)
      pose[i] = { ...pose[i], y: pose[i].y - lift };
    }
    // Heels lift more than toes
    pose[29] = { ...pose[29], y: pose[29].y - lift * 0.8 };
    pose[30] = { ...pose[30], y: pose[30].y - lift * 0.8 };
    // Toe landmarks stay mostly planted
    pose[31] = { ...pose[31], y: pose[31].y - lift * 0.2 };
    pose[32] = { ...pose[32], y: pose[32].y - lift * 0.2 };
    return pose;
  },
};

/**
 * Dorsiflexion: foot flexes upward (ankle angle decreases).
 * Used for: dorsiflexion_stretch_wall, dorsiflexion_band, ankle_dorsiflexion_active
 */
export const dorsiflexion: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [28, 30, 32],
  description: "Foot flexes upward (dorsiflexion)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    const t2 = easeInOutSine(t);
    // Rotate foot landmarks upward around ankle
    const angle = t2 * -20;
    rotateJointsAround(pose, 28, [30, 32], angle);
    rotateJointsAround(pose, 27, [29, 31], angle);
    return pose;
  },
};

/**
 * Ankle circle: foot traces a circle pattern.
 * Used for: ankle_alphabet, ankle_circle, baps_board
 */
export const ankleCircle: MovementTemplate = {
  basePose: "seated",
  activeJoints: [27, 29, 31],
  description: "Foot traces a circle (ankle circles)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("seated"));
    // Circle the left foot around the ankle
    const angle = t * Math.PI * 2;
    const radius = 0.03;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    // Move foot tips in a circle
    pose[29] = { ...pose[29], x: pose[29].x + dx, y: pose[29].y + dy };
    pose[31] = { ...pose[31], x: pose[31].x + dx, y: pose[31].y + dy };
    return pose;
  },
};

/**
 * Single leg balance: standing on one leg with gentle sway.
 * Used for: single_leg_balance, single_leg_balance_eyes_closed
 */
export const singleLegBalance: MovementTemplate = {
  basePose: "standing",
  activeJoints: [27, 25, 23],
  description: "Single leg balance with gentle sway",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);
    // Lift right leg slightly off the ground
    const liftLeg = 0.08;
    pose[26] = { ...pose[26], y: pose[26].y - liftLeg, x: pose[26].x + 0.02 };
    pose[28] = { ...pose[28], y: pose[28].y - liftLeg, x: pose[28].x + 0.03 };
    pose[30] = { ...pose[30], y: pose[30].y - liftLeg, x: pose[30].x + 0.03 };
    pose[32] = { ...pose[32], y: pose[32].y - liftLeg, x: pose[32].x + 0.03 };
    // Bend right knee
    const kneeAngle = -30;
    rotateJointsAround(pose, 26, [28, 30, 32], kneeAngle);

    // Gentle body sway
    const sway = Math.sin(t * Math.PI * 4) * 0.008;
    for (let i = 0; i <= 24; i++) {
      pose[i] = { ...pose[i], x: pose[i].x + sway };
    }
    return pose;
  },
};
