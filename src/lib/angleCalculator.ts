import type { Landmark } from "@/types/landmark";
import { LANDMARK } from "@/types/landmark";

/**
 * Calculate the angle at vertex B formed by points A-B-C.
 * Returns degrees in [0, 180].
 */
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180.0) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

/**
 * Calculate the angle of a line segment relative to vertical (positive Y-down).
 * Returns degrees. 0° = straight down, 90° = horizontal.
 */
function angleFromVertical(a: Landmark, b: Landmark): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angleRad = Math.atan2(dx, dy); // atan2(x,y) gives angle from vertical
  return Math.abs((angleRad * 180) / Math.PI);
}

/**
 * Calculate the lateral tilt between two landmarks relative to horizontal.
 * Returns degrees. 0° = level, positive = right side higher.
 */
function lateralTilt(left: Landmark, right: Landmark): number {
  const dy = right.y - left.y;
  const dx = right.x - left.x;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// --- Joint-specific calculations ---

export function calculateShoulderFlexion(landmarks: Landmark[], side: "left" | "right"): number {
  const hip = landmarks[side === "left" ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP];
  const shoulder = landmarks[side === "left" ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER];
  const elbow = landmarks[side === "left" ? LANDMARK.LEFT_ELBOW : LANDMARK.RIGHT_ELBOW];
  return calculateAngle(hip, shoulder, elbow);
}

export function calculateElbowFlexion(landmarks: Landmark[], side: "left" | "right"): number {
  const shoulder = landmarks[side === "left" ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER];
  const elbow = landmarks[side === "left" ? LANDMARK.LEFT_ELBOW : LANDMARK.RIGHT_ELBOW];
  const wrist = landmarks[side === "left" ? LANDMARK.LEFT_WRIST : LANDMARK.RIGHT_WRIST];
  return calculateAngle(shoulder, elbow, wrist);
}

export function calculateHipFlexion(landmarks: Landmark[], side: "left" | "right"): number {
  const shoulder = landmarks[side === "left" ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER];
  const hip = landmarks[side === "left" ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP];
  const knee = landmarks[side === "left" ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE];
  return calculateAngle(shoulder, hip, knee);
}

export function calculateKneeFlexion(landmarks: Landmark[], side: "left" | "right"): number {
  const hip = landmarks[side === "left" ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP];
  const knee = landmarks[side === "left" ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE];
  const ankle = landmarks[side === "left" ? LANDMARK.LEFT_ANKLE : LANDMARK.RIGHT_ANKLE];
  return calculateAngle(hip, knee, ankle);
}

/**
 * Cervical flexion/extension — angle of the head-to-shoulder line
 * relative to the torso vertical. Forward head = positive flexion.
 */
export function calculateCervicalFlexion(landmarks: Landmark[]): number {
  const nose = landmarks[LANDMARK.NOSE];
  const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
  const lHip = landmarks[LANDMARK.LEFT_HIP];
  const rHip = landmarks[LANDMARK.RIGHT_HIP];

  // Midpoints
  const shoulderMid: Landmark = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
    z: 0, visibility: 1,
  };
  const hipMid: Landmark = {
    x: (lHip.x + rHip.x) / 2,
    y: (lHip.y + rHip.y) / 2,
    z: 0, visibility: 1,
  };

  // Angle of nose relative to shoulder center, compared to trunk vertical
  const headAngle = angleFromVertical(shoulderMid, nose);
  const trunkAngle = angleFromVertical(hipMid, shoulderMid);

  // Cervical flexion = how far head deviates forward from trunk line
  return Math.abs(headAngle - trunkAngle);
}

/**
 * Cervical rotation — estimated from ear-to-ear horizontal offset
 * relative to shoulder width. Returns degrees (0 = facing camera).
 */
export function calculateCervicalRotation(landmarks: Landmark[]): number {
  const lEar = landmarks[LANDMARK.LEFT_EAR];
  const rEar = landmarks[LANDMARK.RIGHT_EAR];
  const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];

  const earWidth = Math.abs(rEar.x - lEar.x);
  const shoulderWidth = Math.abs(rShoulder.x - lShoulder.x);

  if (shoulderWidth < 0.01) return 0;

  // When facing camera, ear width ≈ 0.3 * shoulder width
  // When rotated 90°, ear width ≈ 0 (one ear hidden)
  const ratio = earWidth / shoulderWidth;
  const maxRatio = 0.35; // approximate frontal ear-to-shoulder ratio

  const normalized = Math.min(ratio / maxRatio, 1);
  return Math.round((1 - normalized) * 90);
}

/**
 * Cervical lateral flexion — tilt of head relative to shoulders.
 */
export function calculateCervicalLateralFlexion(landmarks: Landmark[]): number {
  const shoulderTilt = lateralTilt(landmarks[LANDMARK.LEFT_SHOULDER], landmarks[LANDMARK.RIGHT_SHOULDER]);
  const earTilt = lateralTilt(landmarks[LANDMARK.LEFT_EAR], landmarks[LANDMARK.RIGHT_EAR]);
  return Math.abs(earTilt - shoulderTilt);
}

/**
 * Trunk flexion — angle of the torso from vertical.
 * 0° = upright, 90° = bent forward.
 */
export function calculateTrunkFlexion(landmarks: Landmark[]): number {
  const lShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
  const lHip = landmarks[LANDMARK.LEFT_HIP];
  const rHip = landmarks[LANDMARK.RIGHT_HIP];

  const shoulderMid: Landmark = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
    z: 0, visibility: 1,
  };
  const hipMid: Landmark = {
    x: (lHip.x + rHip.x) / 2,
    y: (lHip.y + rHip.y) / 2,
    z: 0, visibility: 1,
  };

  return angleFromVertical(hipMid, shoulderMid);
}

/**
 * Ankle dorsiflexion — estimated from knee-ankle-toe angle.
 * Lower angle = more dorsiflexion. Neutral ≈ 90°.
 */
export function calculateAnkleDorsiflexion(landmarks: Landmark[], side: "left" | "right"): number {
  const knee = landmarks[side === "left" ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE];
  const ankle = landmarks[side === "left" ? LANDMARK.LEFT_ANKLE : LANDMARK.RIGHT_ANKLE];
  // Use heel (29/30) and toe (31/32) landmarks
  const toe = landmarks[side === "left" ? 31 : 32];
  if (!toe || toe.visibility < 0.3) return 90;
  const fullAngle = calculateAngle(knee, ankle, toe);
  return 180 - fullAngle; // Convert to dorsiflexion degrees from neutral
}

/**
 * Calculate all available angles.
 * Returns a comprehensive map including cervical, trunk, and ankle angles.
 */
export function calculateAllAngles(landmarks: Landmark[]): Record<string, number> {
  return {
    // Shoulder
    left_shoulder_flexion: calculateShoulderFlexion(landmarks, "left"),
    right_shoulder_flexion: calculateShoulderFlexion(landmarks, "right"),
    // Elbow
    left_elbow_flexion: calculateElbowFlexion(landmarks, "left"),
    right_elbow_flexion: calculateElbowFlexion(landmarks, "right"),
    // Hip
    left_hip_flexion: calculateHipFlexion(landmarks, "left"),
    right_hip_flexion: calculateHipFlexion(landmarks, "right"),
    // Knee
    left_knee_flexion: calculateKneeFlexion(landmarks, "left"),
    right_knee_flexion: calculateKneeFlexion(landmarks, "right"),
    // Cervical
    cervical_flexion: calculateCervicalFlexion(landmarks),
    cervical_rotation: calculateCervicalRotation(landmarks),
    cervical_lateral_flexion: calculateCervicalLateralFlexion(landmarks),
    // Trunk
    trunk_flexion: calculateTrunkFlexion(landmarks),
    // Ankle
    left_ankle_dorsiflexion: calculateAnkleDorsiflexion(landmarks, "left"),
    right_ankle_dorsiflexion: calculateAnkleDorsiflexion(landmarks, "right"),
  };
}

/**
 * Given an exercise's primary_joint_angle key, return the best matching
 * calculated angle key from our available measurements.
 */
export function mapExerciseAngleKey(primaryJointAngle: string, side: "left" | "right" = "left"): string {
  const key = primaryJointAngle.toLowerCase();

  // Direct matches
  if (key.includes("cervical_flexion") || key.includes("cervical_retraction")) return "cervical_flexion";
  if (key.includes("cervical_rotation")) return "cervical_rotation";
  if (key.includes("cervical_lateral")) return "cervical_lateral_flexion";
  if (key.includes("cervical_neutral")) return "cervical_flexion";
  if (key.includes("trunk") || key.includes("thoracic")) return "trunk_flexion";
  if (key.includes("ankle") || key.includes("dorsiflexion")) return `${side}_ankle_dorsiflexion`;
  if (key.includes("knee")) return `${side}_knee_flexion`;
  if (key.includes("hip")) return `${side}_hip_flexion`;
  if (key.includes("elbow")) return `${side}_elbow_flexion`;
  if (key.includes("shoulder")) return `${side}_shoulder_flexion`;

  // Fallback by body region patterns
  if (key.includes("flexion") || key.includes("extension")) {
    return `${side}_shoulder_flexion`;
  }

  return `${side}_shoulder_flexion`;
}
