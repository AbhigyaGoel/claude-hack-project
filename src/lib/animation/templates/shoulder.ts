import type { MovementTemplate } from "../types";
import { clonePose, getBasePose } from "../basePoses";
import { easeInOutSine, rotatePoint } from "../easing";

/**
 * Rotates a set of child landmark indices around a pivot landmark by the given angle.
 * Mutates the pose array in place (caller must clone first).
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

// Left arm chain indices from shoulder (elbow, wrist, hand landmarks)
const LEFT_ARM = [13, 15, 17, 19, 21];
// Right arm chain indices from shoulder
const RIGHT_ARM = [14, 16, 18, 20, 22];
// Left forearm + hand from elbow
const LEFT_FOREARM = [15, 17, 19, 21];
// Right forearm + hand from elbow
const RIGHT_FOREARM = [16, 18, 20, 22];

/**
 * Wall slide: back against wall, arms in W position sliding to Y position.
 * Start: elbows at shoulder height, bent 90° (W shape) — arms abducted in coronal plane.
 * End: arms extended overhead along wall (Y shape).
 * Arms stay in the coronal plane (abduction), not sagittal flexion.
 */
export const overheadReach: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12, 13, 14, 15, 16],
  description: "Wall Slide — W to Y",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const p = easeInOutSine(t);

    // Wall slide: arms go from W position (elbows at sides bent 90°) to Y (overhead)
    // This is abduction in the coronal plane — arms stay in the plane of the body

    // Start position (W): elbows abducted ~80°, bent 90° so forearms point up
    // End position (Y): arms abducted ~150°, elbows nearly straight

    // Left arm: rotate whole chain to abducted position, then animate further up
    const lAbduct = -80 - p * 70; // -80° to -150°
    rotateJointsAround(pose, 11, LEFT_ARM, lAbduct);
    // Unbend elbow as arms go up (bent 90° in W → straight in Y)
    const elbowBend = (1 - p) * 80; // 80° bent at start → 0° at end
    rotateJointsAround(pose, 13, LEFT_FOREARM, elbowBend);

    // Right arm: mirror
    const rAbduct = 80 + p * 70; // 80° to 150°
    rotateJointsAround(pose, 12, RIGHT_ARM, rAbduct);
    rotateJointsAround(pose, 14, RIGHT_FOREARM, -elbowBend);

    return pose;
  },
};

/**
 * Lateral raise: both arms raise from sides to shoulder height (90° abduction).
 * Arms stay straight throughout. Coronal plane abduction.
 */
export const lateralRaise: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12, 13, 14, 15, 16],
  description: "Both arms raise sideways to shoulder height (lateral raise)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const angle = easeInOutSine(t) * 90;
    // Left arm: negative angle = counter-clockwise = raises up-left
    rotateJointsAround(pose, 11, LEFT_ARM, -angle);
    // Right arm: positive angle = clockwise = raises up-right
    rotateJointsAround(pose, 12, RIGHT_ARM, angle);
    return pose;
  },
};

/**
 * External rotation: standing, right elbow pinned to side at 90° bend.
 * Forearm rotates outward (away from belly).
 * Only the forearm moves — upper arm stays at side.
 */
export const externalRotation: MovementTemplate = {
  basePose: "standing",
  activeJoints: [14, 16],
  description: "Forearm rotates outward with elbow at side (external rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));

    // Right elbow pinned at side, at the level of the waist
    // Elbow at right shoulder x, midway between shoulder and hip y
    pose[14] = { x: 0.59, y: 0.38, z: 0, visibility: 1 };
    // Forearm starts pointing forward/across belly (medial), pointing toward center
    pose[16] = { x: 0.50, y: 0.38, z: 0, visibility: 1 };
    // Hand landmarks follow wrist
    pose[18] = { x: 0.49, y: 0.40, z: 0, visibility: 0.3 };
    pose[20] = { x: 0.50, y: 0.40, z: 0, visibility: 0.3 };
    pose[22] = { x: 0.51, y: 0.40, z: 0, visibility: 0.3 };

    // Rotate forearm outward (away from belly) around elbow
    // From belly-pointing to outward = counter-clockwise in screen coords = negative angle
    // ~45° of external rotation
    const angle = easeInOutSine(t) * -45;
    rotateJointsAround(pose, 14, RIGHT_FOREARM, angle);
    return pose;
  },
};

/**
 * Internal rotation: standing, right elbow pinned to side at 90° bend.
 * Forearm rotates inward (toward belly).
 * Only the forearm moves — upper arm stays at side.
 */
export const internalRotation: MovementTemplate = {
  basePose: "standing",
  activeJoints: [14, 16],
  description: "Forearm rotates inward with elbow at side (internal rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));

    // Right elbow pinned at side
    pose[14] = { x: 0.59, y: 0.38, z: 0, visibility: 1 };
    // Forearm starts pointing forward (neutral, perpendicular to body)
    pose[16] = { x: 0.68, y: 0.38, z: 0, visibility: 1 };
    pose[18] = { x: 0.69, y: 0.40, z: 0, visibility: 0.3 };
    pose[20] = { x: 0.68, y: 0.40, z: 0, visibility: 0.3 };
    pose[22] = { x: 0.67, y: 0.40, z: 0, visibility: 0.3 };

    // Rotate forearm inward (toward belly) = clockwise in screen coords = positive angle
    // ~45° of internal rotation
    const angle = easeInOutSine(t) * 45;
    rotateJointsAround(pose, 14, RIGHT_FOREARM, angle);
    return pose;
  },
};

/**
 * Scapular squeeze: standing, shoulder blades squeeze together.
 * Very subtle movement — shoulders pull back ~2-3cm, chest puffs forward slightly.
 * Arms stay mostly at sides, elbows may bend slightly back.
 */
export const scapularSqueeze: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12],
  description: "Shoulder blades squeeze together (scapular retraction)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);

    // Shoulders pull back (widen laterally by ~0.02-0.03)
    const dx = t2 * 0.025;
    pose[11] = { ...pose[11], x: pose[11].x - dx };
    pose[12] = { ...pose[12], x: pose[12].x + dx };

    // Elbows and wrists follow shoulders back
    pose[13] = { ...pose[13], x: pose[13].x - dx * 1.2 };
    pose[14] = { ...pose[14], x: pose[14].x + dx * 1.2 };
    pose[15] = { ...pose[15], x: pose[15].x - dx };
    pose[16] = { ...pose[16], x: pose[16].x + dx };

    // Chest puffs forward very subtly (in front view, this is barely visible)
    // Nose/head stays still — only shoulder girdle moves
    return pose;
  },
};

/**
 * Pendulum: patient bends forward at waist ~45-60°, supporting with one hand on table.
 * Other arm hangs straight down and swings gently in small circles.
 * Side view using standingSide pose.
 */
export const pendulum: MovementTemplate = {
  basePose: "standingSide",
  activeJoints: [12, 14, 16],
  description: "Bent over, dangling arm swings like a pendulum",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standingSide"));

    // Bend torso forward ~50° around hips
    const hipMidX = (pose[23].x + pose[24].x) / 2;
    const hipMidY = (pose[23].y + pose[24].y) / 2;
    const upperBody = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    for (const idx of upperBody) {
      const rotated = rotatePoint(pose[idx].x, pose[idx].y, hipMidX, hipMidY, 50);
      pose[idx] = { ...pose[idx], x: rotated.x, y: rotated.y };
    }

    // Left arm supports on table (fixed position)
    pose[13] = { ...pose[13], x: pose[13].x - 0.02, y: pose[13].y + 0.05 };
    pose[15] = { ...pose[15], x: pose[15].x - 0.05, y: pose[15].y + 0.10 };

    // Right arm hangs straight down from shoulder
    const rShoulder = pose[12];
    pose[14] = { ...pose[14], x: rShoulder.x, y: rShoulder.y + 0.12 };
    pose[16] = { ...pose[16], x: rShoulder.x, y: rShoulder.y + 0.24 };
    pose[18] = { ...pose[18], x: rShoulder.x + 0.01, y: rShoulder.y + 0.26 };
    pose[20] = { ...pose[20], x: rShoulder.x, y: rShoulder.y + 0.26 };
    pose[22] = { ...pose[22], x: rShoulder.x - 0.01, y: rShoulder.y + 0.26 };

    // Swing the hanging arm in a gentle circle
    const swingAngle = easeInOutSine(t) * Math.PI * 2;
    const radius = 0.03;
    const swingDx = Math.cos(swingAngle) * radius;
    const swingDy = Math.sin(swingAngle) * radius;
    for (const idx of [14, 16, 18, 20, 22]) {
      pose[idx] = { ...pose[idx], x: pose[idx].x + swingDx, y: pose[idx].y + swingDy };
    }

    return pose;
  },
};

/**
 * Shrug: shoulders elevate straight up toward ears, then drop back down.
 * Arms stay at sides. Only shoulder girdle moves vertically.
 */
export const shrug: MovementTemplate = {
  basePose: "standing",
  activeJoints: [11, 12],
  description: "Shoulders elevate toward ears (shrug)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    // Lift amount: negative y = upward in screen coords
    const lift = easeInOutSine(t) * -0.04;

    // Lift shoulders and entire arm chains
    for (const idx of [11, 13, 15, 17, 19, 21]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + lift };
    }
    for (const idx of [12, 14, 16, 18, 20, 22]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y + lift };
    }
    return pose;
  },
};

/**
 * Cross-body stretch: right arm reaches straight across the chest
 * toward the left shoulder. The arm stays at about shoulder height.
 */
export const crossBody: MovementTemplate = {
  basePose: "standing",
  activeJoints: [12, 14, 16],
  description: "Arm reaches across chest toward opposite shoulder",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("standing"));
    const t2 = easeInOutSine(t);

    // Right arm lifts to shoulder height and sweeps across
    // First, raise right arm to horizontal (~90° abduction)
    // Then swing it across the body (adduction past midline)
    // Combined motion: arm goes from hanging at side to across chest

    // Position right arm at shoulder height, extended across body
    const crossAmount = t2;
    // Right elbow moves from hanging position to shoulder height and across
    pose[14] = {
      ...pose[14],
      x: 0.62 - crossAmount * 0.20, // moves from right toward center/left
      y: 0.38 - crossAmount * 0.13, // rises to shoulder height (0.25)
    };
    pose[16] = {
      ...pose[16],
      x: 0.64 - crossAmount * 0.30, // wrist crosses past midline
      y: 0.50 - crossAmount * 0.25, // rises to shoulder height
    };
    pose[18] = {
      ...pose[18],
      x: 0.65 - crossAmount * 0.32,
      y: 0.52 - crossAmount * 0.26,
    };
    pose[20] = {
      ...pose[20],
      x: 0.64 - crossAmount * 0.30,
      y: 0.53 - crossAmount * 0.27,
    };
    pose[22] = {
      ...pose[22],
      x: 0.63 - crossAmount * 0.28,
      y: 0.52 - crossAmount * 0.26,
    };

    return pose;
  },
};

/**
 * Supine arm raise: lying on back, one arm raises from alongside body to overhead.
 * Arm stays straight (elbow locked). Movement in the sagittal plane.
 * In supine side view: arm rotates from along the body to overhead (toward head).
 */
export const supineArmRaise: MovementTemplate = {
  basePose: "supine",
  activeJoints: [11, 13, 15],
  description: "Lying on back, arm raises overhead keeping elbow straight",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("supine"));

    // Straighten left arm first (it starts slightly bent in supine base)
    // In supine view, arm is along the body pointing toward feet
    // Arm should rotate from alongside body (pointing right/feet) to overhead (pointing left/head)
    // That's a counter-clockwise rotation around the shoulder

    // Straighten left arm along the body first
    pose[13] = { x: 0.30, y: 0.62, z: 0, visibility: 1 };
    pose[15] = { x: 0.35, y: 0.62, z: 0, visibility: 1 };
    pose[17] = { x: 0.36, y: 0.61, z: 0, visibility: 0.3 };
    pose[19] = { x: 0.36, y: 0.62, z: 0, visibility: 0.3 };
    pose[21] = { x: 0.36, y: 0.63, z: 0, visibility: 0.3 };

    // Rotate entire arm around left shoulder (index 11) overhead
    // In supine side view, overhead = toward head (left) = counter-clockwise = negative angle
    // Full range: ~150° from alongside body to overhead
    const angle = easeInOutSine(t) * -150;
    rotateJointsAround(pose, 11, [13, 15, 17, 19, 21], angle);

    return pose;
  },
};

/**
 * Sidelying external rotation: lying on side, bottom arm under head.
 * Top arm: elbow bent 90° and pinned to side. Forearm rotates upward (ER).
 * Only the forearm moves — upper arm stays at side.
 */
export const sidelyingER: MovementTemplate = {
  basePose: "sidelying",
  activeJoints: [14, 16],
  description: "Lying on side, top forearm rotates upward (external rotation)",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("sidelying"));

    // Top arm (right side, indices 12/14/16) — elbow bent 90°, pinned to side
    // In sidelying view: upper arm along the torso, forearm hanging down
    // Elbow at right hip level, forearm pointing downward
    pose[14] = { x: 0.38, y: 0.55, z: 0, visibility: 1 };
    // Forearm starts pointing downward (toward ground)
    pose[16] = { x: 0.38, y: 0.65, z: 0, visibility: 1 };
    pose[18] = { x: 0.37, y: 0.66, z: 0, visibility: 0.3 };
    pose[20] = { x: 0.38, y: 0.66, z: 0, visibility: 0.3 };
    pose[22] = { x: 0.39, y: 0.66, z: 0, visibility: 0.3 };

    // External rotation: forearm rotates upward (away from ground)
    // In sidelying view, upward rotation around elbow = counter-clockwise = negative angle
    // ~90° of rotation (from pointing down to pointing up)
    const angle = easeInOutSine(t) * -90;
    rotateJointsAround(pose, 14, RIGHT_FOREARM, angle);

    return pose;
  },
};

/**
 * Prone arm raise: lying face down, both arms lift off the surface slightly (~15-20°).
 * Head stays down. Arms are extended.
 */
export const proneArmRaise: MovementTemplate = {
  basePose: "prone",
  activeJoints: [11, 12, 13, 14, 15, 16],
  description: "Lying face down, both arms lift slightly off the surface",
  animate: (_basePose, t) => {
    const pose = clonePose(getBasePose("prone"));
    const lift = easeInOutSine(t) * 0.06;

    // Both arms lift upward (decrease y in screen coords)
    // Left arm (top side in prone)
    for (const idx of [13, 15, 17, 19, 21]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - lift };
    }
    // Right arm (bottom side in prone)
    for (const idx of [14, 16, 18, 20, 22]) {
      pose[idx] = { ...pose[idx], y: pose[idx].y - lift };
    }

    // Shoulders lift slightly too
    pose[11] = { ...pose[11], y: pose[11].y - lift * 0.5 };
    pose[12] = { ...pose[12], y: pose[12].y - lift * 0.5 };

    // Head stays down (no change to landmark 0)
    return pose;
  },
};
