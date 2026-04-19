import type { MovementTemplate } from "../types";
import { clonePose, getBasePose } from "../basePoses";
import { easeInOutSine } from "../easing";

// Head and face landmark indices
const HEAD_LANDMARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Shifts a set of landmarks by dx, dy.
 */
function shiftLandmarks(
  pose: { x: number; y: number; z: number; visibility: number }[],
  indices: number[],
  dx: number,
  dy: number,
): void {
  for (const idx of indices) {
    pose[idx] = { ...pose[idx], x: pose[idx].x + dx, y: pose[idx].y + dy };
  }
}

/**
 * Chin tuck: head retracts straight backward.
 * Used for: chin_tuck, prone_cervical_retraction
 */
export const chinTuck: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head retracts backward (chin tuck)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);
    // Pull head backward (in front view, this is subtle z-axis, but we show as slight y drop)
    // In standing front view, show chin dropping slightly and head moving back
    const retract = t2 * 0.015;
    const drop = t2 * 0.01;
    // Nose moves back slightly
    shiftLandmarks(pose, [0, 9, 10], 0, drop);
    // Ears stay, giving the visual of retraction
    shiftLandmarks(pose, [1, 2, 3, 4, 5, 6], 0, drop * 0.5);
    return pose;
  },
};

/**
 * Neck rotation: head turns side to side.
 * Used for: cervical_rotation_rom
 */
export const neckRotation: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head turns side to side (neck rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    // Use sine to go left then right
    const phase = Math.sin(t * Math.PI * 2);
    const shift = phase * 0.04;
    // Nose shifts laterally
    pose[0] = { ...pose[0], x: pose[0].x + shift };
    // One ear becomes more visible, other less
    pose[7] = { ...pose[7], x: pose[7].x + shift * 0.5 };
    pose[8] = { ...pose[8], x: pose[8].x + shift * 0.5 };
    // Eyes follow
    for (const idx of [1, 2, 3, 4, 5, 6, 9, 10]) {
      pose[idx] = { ...pose[idx], x: pose[idx].x + shift * 0.8 };
    }
    return pose;
  },
};

/**
 * Neck lateral flexion: head tilts ear to shoulder.
 * Used for: cervical_lateral_flexion, levator_scapulae_stretch, upper_trap_stretch, scalene_stretch
 */
export const neckLateralFlex: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8, 11, 12],
  description: "Head tilts ear toward shoulder (lateral flexion)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);
    // Tilt head to the right: nose shifts right, right ear drops
    const tilt = t2 * 0.03;
    pose[0] = { ...pose[0], x: pose[0].x + tilt, y: pose[0].y + tilt * 0.5 };
    pose[7] = { ...pose[7], x: pose[7].x + tilt * 0.5, y: pose[7].y - tilt * 0.3 };
    pose[8] = { ...pose[8], x: pose[8].x + tilt * 0.5, y: pose[8].y + tilt };
    for (const idx of [1, 2, 3, 4, 5, 6, 9, 10]) {
      pose[idx] = {
        ...pose[idx],
        x: pose[idx].x + tilt * 0.7,
        y: pose[idx].y + tilt * 0.3,
      };
    }
    return pose;
  },
};

/**
 * Neck flexion: head nods forward (chin to chest).
 * Used for: cervical_flexion_rom, deep_neck_flexor_endurance
 */
export const neckFlexion: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head nods forward (neck flexion)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);
    // Head drops forward: nose moves down, ears shift forward
    const drop = t2 * 0.04;
    pose[0] = { ...pose[0], y: pose[0].y + drop };
    shiftLandmarks(pose, [1, 2, 3, 4, 5, 6, 9, 10], 0, drop * 0.7);
    shiftLandmarks(pose, [7, 8], 0, drop * 0.3);
    return pose;
  },
};
