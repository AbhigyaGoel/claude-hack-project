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
 * Chin tuck: standing or seated. Pull chin straight backward (retract),
 * creating a "double chin." Don't flex the neck down — the movement is
 * purely posterior translation of the head. Shoulders stay still.
 */
export const chinTuck: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head retracts straight backward (chin tuck / cervical retraction)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);

    // Pure posterior translation — head moves backward, not downward
    // In front view, backward translation is subtle (mostly z-axis)
    // We represent it with a very slight upward shift of the chin (retraction
    // shortens the distance between chin and neck) and slight compression

    // Nose and mouth move very slightly backward (no y change — not flexion)
    // Ears stay, giving visual of retraction
    // The key visual cue: slight "double chin" effect = chin drops minimally
    // while head stays level
    const retract = t2 * 0.012;

    // Nose drops a tiny bit (chin tucks slightly)
    pose[0] = { ...pose[0], y: pose[0].y + retract * 0.5 };
    // Mouth drops slightly
    pose[9] = { ...pose[9], y: pose[9].y + retract * 0.6 };
    pose[10] = { ...pose[10], y: pose[10].y + retract * 0.6 };
    // Eyes stay relatively level (head stays level, not flexing)
    for (const idx of [1, 2, 3, 4, 5, 6]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + retract * 0.2 };
    }
    // Ears don't move (they represent the skull position)
    // Shoulders absolutely stay still

    return pose;
  },
};

/**
 * Neck rotation: turn head to look over one shoulder, then the other.
 * Keep shoulders still. ~70-80° rotation each way.
 * In front view: nose shifts laterally, one ear becomes more visible.
 */
export const neckRotation: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head turns side to side (cervical rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));

    // Use sine wave to go right then left (t goes 0->1 with pingPong)
    // At t=0.5 (peak of pingPong), head is fully turned to one side
    const t2 = easeInOutSine(t);
    const shift = t2 * 0.05;

    // Head turns to the right: nose shifts right
    pose[0] = { ...pose[0], x: pose[0].x + shift };

    // Right ear moves forward (more visible = closer to nose x)
    // Left ear moves behind (less visible)
    pose[7] = { ...pose[7], x: pose[7].x + shift * 1.2 }; // left ear swings right
    pose[8] = { ...pose[8], x: pose[8].x + shift * 0.3 }; // right ear stays closer

    // Eyes and mouth follow the nose
    for (const idx of [1, 2, 3, 4, 5, 6, 9, 10]) {
      pose[idx] = { ...pose[idx], x: pose[idx].x + shift * 0.9 };
    }

    // Shoulders stay absolutely still
    return pose;
  },
};

/**
 * Neck lateral flexion: tilt ear toward shoulder on one side.
 * Keep shoulders level. ~40-45° each way.
 * In front view: head tilts, ear approaches shoulder.
 */
export const neckLateralFlex: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head tilts ear toward shoulder (cervical lateral flexion)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);

    // Tilt head to the right: right ear drops toward right shoulder
    // The head pivots roughly at the base of the neck
    const tiltAngle = t2 * 0.04;

    // Nose shifts right and down slightly
    pose[0] = { ...pose[0], x: pose[0].x + tiltAngle * 0.7, y: pose[0].y + tiltAngle * 0.3 };

    // Right ear drops (moves down and right)
    pose[8] = { ...pose[8], x: pose[8].x + tiltAngle * 0.4, y: pose[8].y + tiltAngle * 1.2 };
    // Left ear lifts (moves up and right)
    pose[7] = { ...pose[7], x: pose[7].x + tiltAngle * 0.6, y: pose[7].y - tiltAngle * 0.5 };

    // Eyes tilt with the head
    for (const idx of [1, 2, 3]) {
      // Left eyes: shift right and up relative to tilt
      pose[idx] = {
        ...pose[idx],
        x: pose[idx].x + tiltAngle * 0.6,
        y: pose[idx].y - tiltAngle * 0.2,
      };
    }
    for (const idx of [4, 5, 6]) {
      // Right eyes: shift right and down relative to tilt
      pose[idx] = {
        ...pose[idx],
        x: pose[idx].x + tiltAngle * 0.6,
        y: pose[idx].y + tiltAngle * 0.4,
      };
    }

    // Mouth follows
    pose[9] = { ...pose[9], x: pose[9].x + tiltAngle * 0.6, y: pose[9].y + tiltAngle * 0.3 };
    pose[10] = { ...pose[10], x: pose[10].x + tiltAngle * 0.6, y: pose[10].y + tiltAngle * 0.5 };

    // Shoulders stay absolutely level
    return pose;
  },
};

/**
 * Neck flexion: nod chin down toward chest. Keep shoulders still.
 * ~50-60° of flexion. Head tips forward and down.
 */
export const neckFlexion: MovementTemplate = {
  basePose: "standing",
  activeJoints: [0, 7, 8],
  description: "Head nods forward, chin toward chest (cervical flexion)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);

    // Head drops forward: nose moves down significantly
    const drop = t2 * 0.05;

    // Nose drops toward chest
    pose[0] = { ...pose[0], y: pose[0].y + drop };
    // Mouth drops
    pose[9] = { ...pose[9], y: pose[9].y + drop * 0.9 };
    pose[10] = { ...pose[10], y: pose[10].y + drop * 0.9 };
    // Eyes drop and shift forward slightly
    for (const idx of [1, 2, 3, 4, 5, 6]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + drop * 0.75 };
    }
    // Ears shift forward and slightly down (skull rotates forward)
    pose[7] = { ...pose[7], y: pose[7].y + drop * 0.4 };
    pose[8] = { ...pose[8], y: pose[8].y + drop * 0.4 };

    // Shoulders stay absolutely still
    return pose;
  },
};
