export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type SkeletonColor = "green" | "yellow" | "red";

export interface JointAngle {
  joint: string;
  degrees: number;
  side: "left" | "right";
}

export interface JointColorMap {
  [landmarkIndex: number]: SkeletonColor;
}

// MediaPipe Pose landmark indices
export const LANDMARK = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;
