import type { Landmark, JointColorMap, SkeletonColor } from "@/types/landmark";

const COLORS: Record<SkeletonColor, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

// Key joints get larger dots
const KEY_JOINTS = new Set([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]);

// BlazePose 33-landmark skeleton connections
const POSE_CONNECTIONS: readonly [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15],
  // Right arm
  [12, 14], [14, 16],
  // Left leg
  [23, 25], [25, 27],
  // Right leg
  [24, 26], [26, 28],
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  // Hands
  [15, 17], [15, 19], [15, 21], [17, 19],
  [16, 18], [16, 20], [16, 22], [18, 20],
  // Feet
  [27, 29], [27, 31], [29, 31],
  [28, 30], [28, 32], [30, 32],
];

function getColor(
  index: number,
  colors?: JointColorMap,
): string {
  const key = colors?.[index] ?? "green";
  return COLORS[key];
}

function worseColor(a: SkeletonColor, b: SkeletonColor): SkeletonColor {
  const severity: Record<SkeletonColor, number> = { green: 0, yellow: 1, red: 2 };
  return severity[a] >= severity[b] ? a : b;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  canvasWidth: number,
  canvasHeight: number,
  jointColors?: JointColorMap,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw connections first (behind landmarks)
  ctx.lineWidth = 3;
  for (const [i, j] of POSE_CONNECTIONS) {
    if (i >= landmarks.length || j >= landmarks.length) continue;
    const a = landmarks[i];
    const b = landmarks[j];
    if (a.visibility < 0.5 || b.visibility < 0.5) continue;

    const colorA = jointColors?.[i] ?? "green";
    const colorB = jointColors?.[j] ?? "green";
    const lineColor = COLORS[worseColor(colorA, colorB)];

    ctx.strokeStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(a.x * canvasWidth, a.y * canvasHeight);
    ctx.lineTo(b.x * canvasWidth, b.y * canvasHeight);
    ctx.stroke();
  }

  // Draw landmarks on top
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (lm.visibility < 0.5) continue;

    const x = lm.x * canvasWidth;
    const y = lm.y * canvasHeight;
    const radius = KEY_JOINTS.has(i) ? 6 : 4;

    ctx.fillStyle = getColor(i, jointColors);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // White border for visibility
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  landmark: Landmark,
  angleDegrees: number,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const x = landmark.x * canvasWidth + 10;
  const y = landmark.y * canvasHeight - 10;
  const text = `${Math.round(angleDegrees)}°`;

  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}
