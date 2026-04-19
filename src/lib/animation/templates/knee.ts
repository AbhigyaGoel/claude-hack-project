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
 * Squat: standing, feet shoulder-width. Hips drop back and down, knees bend.
 * Torso leans forward slightly to maintain balance. Knees track over toes.
 * Front view — both sides move symmetrically.
 */
export const squat: MovementTemplate = {
  basePose: "standing",
  activeJoints: [23, 24, 25, 26, 27, 28],
  description: "Squat — hips drop back and down, knees bend over toes",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const depth = easeInOutSine(t);

    // How far hips drop (0.15 for a good squat depth)
    const hipDrop = depth * 0.15;

    // Upper body leans forward slightly for balance
    const torsoLean = depth * 0.03;

    // Drop everything from head to hips
    for (let i = 0; i <= 22; i++) {
      pose[i] = { ...pose[i], y: pose[i].y + hipDrop * 0.7, x: pose[i].x + torsoLean * 0.3 };
    }
    // Hips drop down
    pose[23] = { ...pose[23], y: pose[23].y + hipDrop };
    pose[24] = { ...pose[24], y: pose[24].y + hipDrop };

    // Knees push forward and slightly outward (tracking over toes)
    const kneeSpread = depth * 0.03;
    // Knees move down less than hips (they're between hip and ankle)
    pose[25] = { ...pose[25], x: pose[25].x - kneeSpread, y: pose[25].y + hipDrop * 0.3 };
    pose[26] = { ...pose[26], x: pose[26].x + kneeSpread, y: pose[26].y + hipDrop * 0.3 };

    // Ankles stay planted on the ground
    // Arms extend forward for balance
    const armForward = depth * 0.08;
    for (const idx of [13, 15, 17, 19, 21]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - armForward * 0.5 };
    }
    for (const idx of [14, 16, 18, 20, 22]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - armForward * 0.5 };
    }

    return pose;
  },
};

/**
 * Straight leg raise (SLR): lying on back, one leg lifts to ~45-60°
 * while staying completely straight (knee locked). Other leg stays flat.
 */
export const legRaise: MovementTemplate = {
  basePose: "supine",
  activeJoints: [23, 25, 27],
  description: "Supine straight leg raise — leg lifts with knee locked",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));

    // First straighten the left leg (supine base has bent knees)
    pose[25] = { x: 0.65, y: 0.62, z: 0, visibility: 1 };
    pose[27] = { x: 0.80, y: 0.62, z: 0, visibility: 1 };
    pose[29] = { x: 0.81, y: 0.62, z: 0, visibility: 0.3 };
    pose[31] = { x: 0.82, y: 0.62, z: 0, visibility: 0.3 };

    // Raise the straight leg by rotating around the hip
    // In supine side view, lifting leg = counter-clockwise = negative angle
    // ~45° of elevation
    const angle = easeInOutSine(t) * -45;
    rotateJointsAround(pose, 23, [25, 27, 29, 31], angle);

    return pose;
  },
};

/**
 * Heel slide: lying on back, leg starts extended. Heel slides along the surface
 * toward the buttock (knee bends), then slides back out.
 */
export const heelSlide: MovementTemplate = {
  basePose: "supine",
  activeJoints: [25, 27],
  description: "Supine heel slide — heel slides toward buttock and back",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));
    const t2 = easeInOutSine(t);

    // Start with left leg extended straight
    pose[25] = { x: 0.65, y: 0.62, z: 0, visibility: 1 };
    pose[27] = { x: 0.80, y: 0.62, z: 0, visibility: 1 };
    pose[29] = { x: 0.81, y: 0.62, z: 0, visibility: 0.3 };
    pose[31] = { x: 0.82, y: 0.62, z: 0, visibility: 0.3 };

    // Heel slides toward buttock: ankle moves left (toward hip), knee rises up
    const slideAmount = t2 * 0.25;
    const kneeRise = t2 * 0.18;

    // Ankle slides back toward hip (leftward in supine view)
    pose[27] = { ...pose[27], x: pose[27].x - slideAmount, y: pose[27].y - kneeRise * 0.15 };
    pose[29] = { ...pose[29], x: pose[29].x - slideAmount, y: pose[29].y - kneeRise * 0.15 };
    pose[31] = { ...pose[31], x: pose[31].x - slideAmount, y: pose[31].y - kneeRise * 0.15 };

    // Knee rises upward as it bends
    pose[25] = { ...pose[25], y: pose[25].y - kneeRise };

    return pose;
  },
};

/**
 * Hamstring curl: standing (side view), one foot curls back toward buttock
 * by bending the knee. The thigh stays vertical.
 */
export const hamstringCurl: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [26, 28],
  description: "Standing hamstring curl — foot curls toward buttock",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));

    // Curl right lower leg behind by rotating around knee
    // Negative angle = counter-clockwise = foot swings backward and up
    const angle = easeInOutSine(t) * -110;
    rotateJointsAround(pose, 26, RIGHT_LOWER_LEG, angle);

    return pose;
  },
};

/**
 * Knee extension: seated, lower leg straightens from ~90° bent to fully extended.
 * Upper leg stays horizontal on the seat. Small movement.
 */
export const kneeExtension: MovementTemplate = {
  basePose: "seated",
  activeJoints: [25, 27],
  description: "Seated knee extension — lower leg straightens",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("seated"));

    // In seated pose, lower leg hangs down. Extend it outward.
    // Rotate lower leg around knee to straighten
    // From hanging (~90° flexion) toward horizontal (~0°)
    // Negative angle = counter-clockwise = foot swings forward/up
    const angle = easeInOutSine(t) * -70;
    rotateJointsAround(pose, 25, LEFT_LOWER_LEG, angle);

    return pose;
  },
};

/**
 * Clamshell: sidelying, hips and knees bent ~45°. Feet stay together.
 * Top knee opens upward (hip external rotation) like opening a clamshell.
 * Keep feet touching throughout the movement.
 */
export const clamshell: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [24, 26],
  description: "Sidelying clamshell — top knee opens with feet together",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));

    // Bend both legs at hips and knees ~45° for the starting position
    // Sidelying base already has legs somewhat positioned

    // Top knee (right, index 26) lifts upward (decreasing y)
    // Rotate only the knee around the hip, NOT the ankle
    // Feet stay together, so ankle position doesn't change
    const openAngle = easeInOutSine(t) * -35;

    // Only move the knee — the ankle stays put (feet together)
    const hip = pose[24];
    const knee = pose[26];
    const rotatedKnee = rotatePoint(knee.x, knee.y, hip.x, hip.y, openAngle);
    pose[26] = { ...knee, x: rotatedKnee.x, y: rotatedKnee.y };

    // Ankle and foot stay in place (feet touching)

    return pose;
  },
};
