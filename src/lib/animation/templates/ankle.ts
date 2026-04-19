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
 * Calf raise: standing, rise up on toes (plantarflexion), lifting heels
 * as high as possible. Then lower back down slowly. Whole body shifts up.
 * Toes stay planted on the ground.
 */
export const calfRaise: MovementTemplate = {
  basePose: "standing",
  activeJoints: [27, 28, 29, 30],
  description: "Standing calf raise — rise up on toes",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const lift = easeInOutSine(t) * 0.05;

    // Everything from head to ankles lifts upward (toes stay planted)
    for (let i = 0; i <= 28; i++) {
      pose[i] = { ...pose[i], y: pose[i].y - lift };
    }

    // Heels lift significantly (they come off the ground)
    pose[29] = { ...pose[29], y: pose[29].y - lift * 0.7 };
    pose[30] = { ...pose[30], y: pose[30].y - lift * 0.7 };

    // Toe/foot index landmarks stay mostly on the ground
    pose[31] = { ...pose[31], y: pose[31].y - lift * 0.15 };
    pose[32] = { ...pose[32], y: pose[32].y - lift * 0.15 };

    return pose;
  },
};

/**
 * Dorsiflexion stretch: standing facing wall, one foot back. Lean into wall,
 * bending front ankle to stretch the calf. The front knee moves forward over the toes.
 * Side view.
 */
export const dorsiflexion: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [26, 28, 30, 32],
  description: "Wall dorsiflexion stretch — front knee moves forward over toes",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));
    const t2 = easeInOutSine(t);

    // Set up staggered stance: front foot (right) forward, back foot (left) behind
    // Front ankle stays planted, knee drives forward
    // Back leg is extended behind for the stretch position

    // Back leg (left) steps back
    pose[25] = { ...pose[25], x: pose[25].x - 0.08 };
    pose[27] = { ...pose[27], x: pose[27].x - 0.12 };
    pose[29] = { ...pose[29], x: pose[29].x - 0.12 };
    pose[31] = { ...pose[31], x: pose[31].x - 0.10 };

    // Animation: front knee drives forward (ankle dorsiflexion)
    // Knee moves forward (increasing x) over the toes
    const kneeDrive = t2 * 0.06;
    pose[26] = { ...pose[26], x: pose[26].x + kneeDrive, y: pose[26].y + kneeDrive * 0.3 };

    // Whole body leans forward slightly
    const lean = t2 * 0.02;
    for (let i = 0; i <= 24; i++) {
      pose[i] = { ...pose[i], x: pose[i].x + lean };
    }

    // Arms reach forward to the wall
    pose[14] = { ...pose[14], x: pose[14].x + 0.08, y: pose[14].y - 0.05 };
    pose[16] = { ...pose[16], x: pose[16].x + 0.12, y: pose[16].y - 0.10 };

    return pose;
  },
};

/**
 * Ankle circle: seated or lying. Foot traces circles in the air —
 * point, rotate outward, flex up, rotate inward. Continuous circular motion.
 */
export const ankleCircle: MovementTemplate = {
  basePose: "seated",
  activeJoints: [27, 29, 31],
  description: "Seated ankle circles — foot traces a circle",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("seated"));

    // Left foot circles around the ankle joint
    // t goes 0->1 continuously, creating a full circle
    const angle = t * Math.PI * 2;
    const radius = 0.035;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    // Move heel and toe landmarks in a circle
    pose[29] = { ...pose[29], x: pose[29].x + dx, y: pose[29].y + dy };
    pose[31] = { ...pose[31], x: pose[31].x + dx, y: pose[31].y + dy };

    // Ankle shifts slightly to show foot movement
    pose[27] = { ...pose[27], x: pose[27].x + dx * 0.3, y: pose[27].y + dy * 0.3 };

    return pose;
  },
};

/**
 * Single leg balance: standing on one foot. Other foot lifts off ground.
 * Gentle sway is natural. Arms can be out for balance.
 */
export const singleLegBalance: MovementTemplate = {
  basePose: "standing",
  activeJoints: [25, 26, 27, 28],
  description: "Single leg balance — stand on one foot with gentle sway",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));

    // Lift right leg off the ground — knee bends, foot lifts
    // Static lift position
    const liftAmount = 0.08;
    pose[26] = { ...pose[26], y: pose[26].y - liftAmount, x: pose[26].x + 0.02 };
    pose[28] = { ...pose[28], y: pose[28].y - liftAmount, x: pose[28].x + 0.03 };
    pose[30] = { ...pose[30], y: pose[30].y - liftAmount, x: pose[30].x + 0.03 };
    pose[32] = { ...pose[32], y: pose[32].y - liftAmount, x: pose[32].x + 0.03 };

    // Bend the lifted knee slightly
    rotateJointsAround(pose, 26, [28, 30, 32], -25);

    // Arms out slightly for balance
    pose[13] = { ...pose[13], x: pose[13].x - 0.03 };
    pose[15] = { ...pose[15], x: pose[15].x - 0.04 };
    pose[14] = { ...pose[14], x: pose[14].x + 0.03 };
    pose[16] = { ...pose[16], x: pose[16].x + 0.04 };

    // Gentle body sway (natural balance challenge)
    const sway = Math.sin(t * Math.PI * 4) * 0.006;
    for (let i = 0; i <= 24; i++) {
      pose[i] = { ...pose[i], x: pose[i].x + sway };
    }

    return pose;
  },
};
