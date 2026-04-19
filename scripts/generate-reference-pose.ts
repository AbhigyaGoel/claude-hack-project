#!/usr/bin/env npx tsx
/**
 * Generate reference pose JSON from a demo video.
 *
 * Usage:
 *   npx tsx scripts/generate-reference-pose.ts \
 *     --video path/to/demo.mp4 \
 *     --exercise-id squat_bodyweight \
 *     --start-frame 42 \
 *     --end-frame 98 \
 *     [--preview]
 *
 * Prerequisites:
 *   - ffmpeg installed and on PATH
 *   - @mediapipe/tasks-vision installed (already in project)
 *
 * Output:
 *   public/reference-poses/{exercise_id}.json
 *   { fps: 30, landmarks: number[][][] }
 *   33 keypoints per frame, each [x, y, z, visibility]
 *   Root-normalized (hip center at origin, scaled to unit torso length)
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { join, resolve } from "path";

// Parse args
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
const hasFlag = (name: string) => args.includes(`--${name}`);

const videoPath = getArg("video");
const exerciseId = getArg("exercise-id");
const startFrame = parseInt(getArg("start-frame") || "0", 10);
const endFrame = parseInt(getArg("end-frame") || "0", 10);
const preview = hasFlag("preview");

if (!videoPath || !exerciseId) {
  console.error("Usage: npx tsx scripts/generate-reference-pose.ts --video <path> --exercise-id <id> --start-frame <n> --end-frame <n> [--preview]");
  process.exit(1);
}

if (!existsSync(videoPath)) {
  console.error(`Video not found: ${videoPath}`);
  process.exit(1);
}

const FPS = 30;
const OUTPUT_DIR = resolve(__dirname, "../public/reference-poses");
const FRAMES_DIR = resolve(__dirname, "../.tmp-frames");

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });

console.log(`\n  Exercise: ${exerciseId}`);
console.log(`  Video: ${videoPath}`);
console.log(`  Frames: ${startFrame} → ${endFrame}`);
console.log(`  Preview: ${preview}\n`);

// Step 1: Extract frames from video using ffmpeg
console.log("  [1/4] Extracting frames via ffmpeg...");

// Calculate time range
const startTime = startFrame / FPS;
const duration = (endFrame - startFrame) / FPS;

execFileSync("ffmpeg", [
  "-y",
  "-i", videoPath,
  "-ss", startTime.toString(),
  "-t", duration.toString(),
  "-vf", `fps=${FPS},scale=512:-1`,
  "-q:v", "2",
  join(FRAMES_DIR, "frame_%04d.jpg"),
], { stdio: "pipe" });

const frameFiles = readdirSync(FRAMES_DIR)
  .filter((f) => f.endsWith(".jpg"))
  .sort();

console.log(`  [1/4] Extracted ${frameFiles.length} frames`);

// Step 2: Run MediaPipe Pose Landmarker on each frame
console.log("  [2/4] Running MediaPipe pose detection...");

// Note: Node.js MediaPipe requires the tasks-vision WASM files.
// For server-side batch processing, we use the @mediapipe/tasks-vision package
// with a canvas-based approach. In practice, this script requires a browser
// environment or a Node canvas polyfill.
//
// For hackathon purposes, we provide a simplified extraction that works
// with pre-processed landmark data or manual annotation.

interface RawLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

// Placeholder: In production, this would use MediaPipe's Node.js API
// or shell out to a Python script with mediapipe installed.
// For now, we document the expected flow and provide a manual data format.
console.log("  [2/4] Note: Full MediaPipe extraction requires Python mediapipe or browser environment.");
console.log("  [2/4] Use the companion script: python3 scripts/extract_landmarks.py --frames-dir .tmp-frames");
console.log("  [2/4] Or manually provide landmarks via --landmarks-json <path>");

const landmarksJsonPath = getArg("landmarks-json");
let allFrameLandmarks: RawLandmark[][] = [];

if (landmarksJsonPath && existsSync(landmarksJsonPath)) {
  const raw = JSON.parse(require("fs").readFileSync(landmarksJsonPath, "utf-8"));
  allFrameLandmarks = raw.landmarks || raw;
  console.log(`  [2/4] Loaded ${allFrameLandmarks.length} frames from ${landmarksJsonPath}`);
} else {
  console.log("  [2/4] No landmarks provided. Generating synthetic reference pose for development...");
  // Generate a synthetic smooth movement for development/testing
  allFrameLandmarks = generateSyntheticPose(exerciseId, frameFiles.length || 60);
}

// Step 3: Normalize landmarks (hip center at origin, unit torso length)
console.log("  [3/4] Normalizing to root coordinate system...");

function normalize(frames: RawLandmark[][]): number[][][] {
  return frames.map((frame) => {
    // Hip center = midpoint of landmarks 23 (left hip) and 24 (right hip)
    const lHip = frame[23] || { x: 0.5, y: 0.7, z: 0, visibility: 1 };
    const rHip = frame[24] || { x: 0.5, y: 0.7, z: 0, visibility: 1 };
    const hipCenter = {
      x: (lHip.x + rHip.x) / 2,
      y: (lHip.y + rHip.y) / 2,
      z: (lHip.z + rHip.z) / 2,
    };

    // Torso length = hip center to shoulder center
    const lShoulder = frame[11] || { x: 0.4, y: 0.4, z: 0, visibility: 1 };
    const rShoulder = frame[12] || { x: 0.6, y: 0.4, z: 0, visibility: 1 };
    const shoulderCenter = {
      x: (lShoulder.x + rShoulder.x) / 2,
      y: (lShoulder.y + rShoulder.y) / 2,
    };

    const torsoLength = Math.sqrt(
      (shoulderCenter.x - hipCenter.x) ** 2 +
      (shoulderCenter.y - hipCenter.y) ** 2,
    ) || 0.3; // fallback to prevent division by zero

    // Normalize: translate to hip center, scale by torso length
    return frame.map((lm) => [
      (lm.x - hipCenter.x) / torsoLength,
      (lm.y - hipCenter.y) / torsoLength,
      lm.z / torsoLength,
      lm.visibility,
    ]);
  });
}

const normalizedLandmarks = normalize(allFrameLandmarks);

// Step 4: Write output
const outputPath = join(OUTPUT_DIR, `${exerciseId}.json`);
const output = {
  fps: FPS,
  exercise_id: exerciseId,
  frame_count: normalizedLandmarks.length,
  landmarks: normalizedLandmarks,
};

writeFileSync(outputPath, JSON.stringify(output));
console.log(`  [4/4] Written to ${outputPath} (${normalizedLandmarks.length} frames)\n`);

// Preview
if (preview) {
  console.log("  [preview] To preview, open the app and navigate to a session with this exercise.");
  console.log("  [preview] The reference pose will render in the ExerciseDemo component.\n");
}

// Cleanup temp frames
for (const f of readdirSync(FRAMES_DIR)) {
  unlinkSync(join(FRAMES_DIR, f));
}

// --- Synthetic pose generators for development ---

function generateSyntheticPose(id: string, frameCount: number): RawLandmark[][] {
  const frames: RawLandmark[][] = [];
  const numFrames = Math.max(frameCount, 30);

  for (let f = 0; f < numFrames; f++) {
    const t = f / numFrames; // 0 to 1 over one rep
    const phase = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // smooth 0→1→0

    const landmarks = generateBaseStandingPose();

    // Animate based on exercise type
    if (id.includes("squat")) {
      animateSquat(landmarks, phase);
    } else if (id.includes("bridge")) {
      animateBridge(landmarks, phase);
    } else if (id.includes("wall_slide") || id.includes("shoulder_flexion")) {
      animateShoulderFlexion(landmarks, phase);
    } else if (id.includes("clamshell")) {
      animateClamshell(landmarks, phase);
    } else if (id.includes("dead_bug")) {
      animateDeadBug(landmarks, phase);
    } else if (id.includes("plank")) {
      animatePlank(landmarks, phase);
    } else if (id.includes("calf_raise") || id.includes("heel")) {
      animateCalfRaise(landmarks, phase);
    } else if (id.includes("chin_tuck")) {
      animateChinTuck(landmarks, phase);
    } else if (id.includes("balance")) {
      animateBalance(landmarks, phase);
    } else {
      // Default: gentle shoulder flexion
      animateShoulderFlexion(landmarks, phase * 0.5);
    }

    frames.push(landmarks);
  }

  return frames;
}

function lm(x: number, y: number, z: number = 0, v: number = 1): RawLandmark {
  return { x, y, z, visibility: v };
}

function generateBaseStandingPose(): RawLandmark[] {
  // 33 MediaPipe landmarks for a standing person (front view, normalized 0-1)
  const pose: RawLandmark[] = new Array(33).fill(null).map(() => lm(0.5, 0.5, 0, 0.3));

  // Face
  pose[0] = lm(0.50, 0.15); // nose
  pose[1] = lm(0.49, 0.13); pose[2] = lm(0.48, 0.13); pose[3] = lm(0.47, 0.14); // left eye
  pose[4] = lm(0.51, 0.13); pose[5] = lm(0.52, 0.13); pose[6] = lm(0.53, 0.14); // right eye
  pose[7] = lm(0.45, 0.15); pose[8] = lm(0.55, 0.15); // ears

  // Upper body
  pose[11] = lm(0.42, 0.28); // left shoulder
  pose[12] = lm(0.58, 0.28); // right shoulder
  pose[13] = lm(0.38, 0.42); // left elbow
  pose[14] = lm(0.62, 0.42); // right elbow
  pose[15] = lm(0.36, 0.55); // left wrist
  pose[16] = lm(0.64, 0.55); // right wrist

  // Hands
  pose[17] = lm(0.35, 0.57); pose[19] = lm(0.34, 0.56); pose[21] = lm(0.35, 0.58);
  pose[18] = lm(0.65, 0.57); pose[20] = lm(0.66, 0.56); pose[22] = lm(0.65, 0.58);

  // Lower body
  pose[23] = lm(0.45, 0.55); // left hip
  pose[24] = lm(0.55, 0.55); // right hip
  pose[25] = lm(0.44, 0.72); // left knee
  pose[26] = lm(0.56, 0.72); // right knee
  pose[27] = lm(0.43, 0.90); // left ankle
  pose[28] = lm(0.57, 0.90); // right ankle

  // Feet
  pose[29] = lm(0.41, 0.92); pose[31] = lm(0.44, 0.93);
  pose[30] = lm(0.59, 0.92); pose[32] = lm(0.56, 0.93);

  return pose;
}

function animateSquat(p: RawLandmark[], t: number) {
  const depth = t * 0.15;
  // Drop hips
  p[23].y += depth; p[24].y += depth;
  // Bend knees forward
  p[25].x -= t * 0.03; p[25].y += depth * 0.3;
  p[26].x += t * 0.03; p[26].y += depth * 0.3;
  // Lean torso slightly forward
  p[11].y += depth * 0.3; p[12].y += depth * 0.3;
  p[0].y += depth * 0.3;
  // Arms forward for balance
  p[15].y -= t * 0.1; p[15].x -= t * 0.05;
  p[16].y -= t * 0.1; p[16].x += t * 0.05;
}

function animateBridge(p: RawLandmark[], t: number) {
  // Lying supine — rearrange to side view
  const lift = t * 0.08;
  p[0].x = 0.2; p[0].y = 0.6; // head on ground
  p[11].x = 0.3; p[11].y = 0.58; p[12].x = 0.3; p[12].y = 0.58;
  p[23].x = 0.5; p[23].y = 0.55 - lift; p[24].x = 0.5; p[24].y = 0.55 - lift;
  p[25].x = 0.65; p[25].y = 0.65; p[26].x = 0.65; p[26].y = 0.65;
  p[27].x = 0.75; p[27].y = 0.72; p[28].x = 0.75; p[28].y = 0.72;
  p[13].x = 0.28; p[13].y = 0.65; p[14].x = 0.28; p[14].y = 0.65;
  p[15].x = 0.28; p[15].y = 0.72; p[16].x = 0.28; p[16].y = 0.72;
}

function animateShoulderFlexion(p: RawLandmark[], t: number) {
  // Raise left arm overhead
  const angle = t * Math.PI * 0.85; // ~150 degrees
  p[13].x = 0.42 - Math.sin(angle) * 0.15;
  p[13].y = 0.28 - Math.sin(angle) * 0.12;
  p[15].x = 0.42 - Math.sin(angle) * 0.22;
  p[15].y = 0.28 - Math.sin(angle) * 0.22;
}

function animateClamshell(p: RawLandmark[], t: number) {
  // Side-lying
  p[0].x = 0.2; p[0].y = 0.5;
  p[11].x = 0.3; p[11].y = 0.48; p[12].x = 0.3; p[12].y = 0.52;
  p[23].x = 0.55; p[23].y = 0.48; p[24].x = 0.55; p[24].y = 0.52;
  p[25].x = 0.7; p[25].y = 0.48 - t * 0.1; // top knee opens
  p[26].x = 0.7; p[26].y = 0.55;
  p[27].x = 0.8; p[27].y = 0.52; p[28].x = 0.8; p[28].y = 0.55;
}

function animateDeadBug(p: RawLandmark[], t: number) {
  // Supine, arm/leg extending
  p[0].x = 0.2; p[0].y = 0.55;
  p[11].x = 0.3; p[11].y = 0.53; p[12].x = 0.3; p[12].y = 0.57;
  p[23].x = 0.55; p[23].y = 0.53; p[24].x = 0.55; p[24].y = 0.57;
  // Left arm extends overhead
  p[13].x = 0.25 - t * 0.1; p[13].y = 0.45;
  p[15].x = 0.2 - t * 0.15; p[15].y = 0.40;
  // Right leg extends
  p[26].x = 0.7 + t * 0.08; p[26].y = 0.55;
  p[28].x = 0.85 + t * 0.05; p[28].y = 0.55;
  // Other limbs stay in tabletop
  p[25].x = 0.65; p[25].y = 0.42;
  p[27].x = 0.7; p[27].y = 0.42;
}

function animatePlank(p: RawLandmark[], _t: number) {
  // Prone, straight body
  p[0].x = 0.2; p[0].y = 0.48;
  p[11].x = 0.28; p[11].y = 0.5; p[12].x = 0.28; p[12].y = 0.5;
  p[13].x = 0.22; p[13].y = 0.6; p[14].x = 0.22; p[14].y = 0.6;
  p[15].x = 0.2; p[15].y = 0.62; p[16].x = 0.2; p[16].y = 0.62;
  p[23].x = 0.6; p[23].y = 0.5; p[24].x = 0.6; p[24].y = 0.5;
  p[25].x = 0.75; p[25].y = 0.52; p[26].x = 0.75; p[26].y = 0.52;
  p[27].x = 0.85; p[27].y = 0.58; p[28].x = 0.85; p[28].y = 0.58;
}

function animateCalfRaise(p: RawLandmark[], t: number) {
  const lift = t * 0.05;
  // Whole body shifts up
  for (const lm of p) {
    lm.y -= lift;
  }
  // Ankles stay planted
  p[27].y += lift; p[28].y += lift;
  p[29].y += lift; p[30].y += lift;
  p[31].y += lift; p[32].y += lift;
}

function animateChinTuck(p: RawLandmark[], t: number) {
  // Head retracts posteriorly
  p[0].x -= t * 0.03;
  p[7].x -= t * 0.03;
  p[8].x -= t * 0.03;
}

function animateBalance(p: RawLandmark[], t: number) {
  // Lift one leg, gentle sway
  p[25].x -= 0.05; p[25].y -= 0.15;
  p[27].x -= 0.08; p[27].y -= 0.1;
  // Subtle sway
  const sway = Math.sin(t * Math.PI * 4) * 0.01;
  for (const lm of p) {
    lm.x += sway;
  }
}

console.log("  Done.\n");
