import type { Landmark } from "@/types/landmark";
import { LANDMARK } from "@/types/landmark";

export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180.0) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function calculateShoulderFlexion(
  landmarks: Landmark[],
  side: "left" | "right",
): number {
  const hip = landmarks[side === "left" ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP];
  const shoulder = landmarks[side === "left" ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER];
  const elbow = landmarks[side === "left" ? LANDMARK.LEFT_ELBOW : LANDMARK.RIGHT_ELBOW];
  return calculateAngle(hip, shoulder, elbow);
}

export function calculateElbowFlexion(
  landmarks: Landmark[],
  side: "left" | "right",
): number {
  const shoulder = landmarks[side === "left" ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER];
  const elbow = landmarks[side === "left" ? LANDMARK.LEFT_ELBOW : LANDMARK.RIGHT_ELBOW];
  const wrist = landmarks[side === "left" ? LANDMARK.LEFT_WRIST : LANDMARK.RIGHT_WRIST];
  return calculateAngle(shoulder, elbow, wrist);
}

export function calculateHipFlexion(
  landmarks: Landmark[],
  side: "left" | "right",
): number {
  const shoulder = landmarks[side === "left" ? LANDMARK.LEFT_SHOULDER : LANDMARK.RIGHT_SHOULDER];
  const hip = landmarks[side === "left" ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP];
  const knee = landmarks[side === "left" ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE];
  return calculateAngle(shoulder, hip, knee);
}

export function calculateKneeFlexion(
  landmarks: Landmark[],
  side: "left" | "right",
): number {
  const hip = landmarks[side === "left" ? LANDMARK.LEFT_HIP : LANDMARK.RIGHT_HIP];
  const knee = landmarks[side === "left" ? LANDMARK.LEFT_KNEE : LANDMARK.RIGHT_KNEE];
  const ankle = landmarks[side === "left" ? LANDMARK.LEFT_ANKLE : LANDMARK.RIGHT_ANKLE];
  return calculateAngle(hip, knee, ankle);
}

export function calculateAllAngles(
  landmarks: Landmark[],
): Record<string, number> {
  return {
    left_shoulder_flexion: calculateShoulderFlexion(landmarks, "left"),
    right_shoulder_flexion: calculateShoulderFlexion(landmarks, "right"),
    left_elbow_flexion: calculateElbowFlexion(landmarks, "left"),
    right_elbow_flexion: calculateElbowFlexion(landmarks, "right"),
    left_hip_flexion: calculateHipFlexion(landmarks, "left"),
    right_hip_flexion: calculateHipFlexion(landmarks, "right"),
    left_knee_flexion: calculateKneeFlexion(landmarks, "left"),
    right_knee_flexion: calculateKneeFlexion(landmarks, "right"),
  };
}
