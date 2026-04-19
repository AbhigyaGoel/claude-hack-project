#!/usr/bin/env npx tsx
/**
 * Seed synthetic reference poses for development.
 * These are placeholder animations until real video-sourced poses are committed.
 *
 * Run: npx tsx scripts/seed-reference-poses.ts
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";

const OUTPUT_DIR = resolve(__dirname, "../public/reference-poses");
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const FPS = 30;
const REP_DURATION = 2.5; // seconds per rep
const FRAME_COUNT = Math.round(FPS * REP_DURATION);

interface Lm { x: number; y: number; z: number; v: number }

function lm(x: number, y: number, z: number = 0, v: number = 1): Lm {
  return { x, y, z, v };
}

function basePose(): Lm[] {
  const p: Lm[] = new Array(33).fill(null).map(() => lm(0.5, 0.5, 0, 0.2));
  p[0] = lm(0.50, 0.14); // nose
  p[1] = lm(0.49, 0.12); p[2] = lm(0.48, 0.12); p[3] = lm(0.47, 0.13);
  p[4] = lm(0.51, 0.12); p[5] = lm(0.52, 0.12); p[6] = lm(0.53, 0.13);
  p[7] = lm(0.45, 0.14); p[8] = lm(0.55, 0.14);
  p[9] = lm(0.49, 0.17); p[10] = lm(0.51, 0.17); // mouth
  p[11] = lm(0.40, 0.27); p[12] = lm(0.60, 0.27); // shoulders
  p[13] = lm(0.37, 0.40); p[14] = lm(0.63, 0.40); // elbows
  p[15] = lm(0.35, 0.52); p[16] = lm(0.65, 0.52); // wrists
  p[17] = lm(0.34, 0.54); p[18] = lm(0.66, 0.54);
  p[19] = lm(0.33, 0.53); p[20] = lm(0.67, 0.53);
  p[21] = lm(0.34, 0.55); p[22] = lm(0.66, 0.55);
  p[23] = lm(0.44, 0.54); p[24] = lm(0.56, 0.54); // hips
  p[25] = lm(0.43, 0.72); p[26] = lm(0.57, 0.72); // knees
  p[27] = lm(0.42, 0.90); p[28] = lm(0.58, 0.90); // ankles
  p[29] = lm(0.40, 0.92); p[30] = lm(0.60, 0.92);
  p[31] = lm(0.43, 0.93); p[32] = lm(0.57, 0.93);
  return p;
}

function clone(p: Lm[]): Lm[] {
  return p.map((l) => ({ ...l }));
}

function normalize(frames: Lm[][]): number[][][] {
  return frames.map((frame) => {
    const hx = (frame[23].x + frame[24].x) / 2;
    const hy = (frame[23].y + frame[24].y) / 2;
    const hz = (frame[23].z + frame[24].z) / 2;
    const sx = (frame[11].x + frame[12].x) / 2;
    const sy = (frame[11].y + frame[12].y) / 2;
    const torso = Math.sqrt((sx - hx) ** 2 + (sy - hy) ** 2) || 0.27;
    return frame.map((l) => [
      (l.x - hx) / torso,
      (l.y - hy) / torso,
      (l.z - hz) / torso,
      l.v,
    ]);
  });
}

function smoothPhase(f: number, total: number): number {
  return Math.sin((f / total) * Math.PI) ** 2; // smooth 0→1→0
}

type Animator = (p: Lm[], t: number) => void;

function generateExercise(id: string, animate: Animator, frames: number = FRAME_COUNT) {
  const allFrames: Lm[][] = [];
  for (let f = 0; f < frames; f++) {
    const p = clone(basePose());
    const t = smoothPhase(f, frames);
    animate(p, t);
    allFrames.push(p);
  }
  const normalized = normalize(allFrames);
  const output = { fps: FPS, exercise_id: id, frame_count: frames, landmarks: normalized };
  const path = join(OUTPUT_DIR, `${id}.json`);
  writeFileSync(path, JSON.stringify(output));
  console.log(`  ✓ ${id} (${frames} frames)`);
}

// --- Exercise animations ---

const exercises: [string, Animator][] = [
  ["wall_slide_01", (p, t) => {
    // Arms slide up wall
    const angle = t * 2.6; // ~150°
    p[13].x = 0.40 - Math.sin(angle) * 0.08; p[13].y = 0.27 - Math.sin(angle) * 0.14;
    p[15].x = 0.40 - Math.sin(angle) * 0.12; p[15].y = 0.27 - Math.sin(angle) * 0.24;
    p[14].x = 0.60 + Math.sin(angle) * 0.08; p[14].y = 0.27 - Math.sin(angle) * 0.14;
    p[16].x = 0.60 + Math.sin(angle) * 0.12; p[16].y = 0.27 - Math.sin(angle) * 0.24;
  }],

  ["bodyweight_squat_01", (p, t) => {
    const d = t * 0.14;
    p[23].y += d; p[24].y += d;
    p[25].y += d * 0.4; p[26].y += d * 0.4;
    p[25].x -= t * 0.02; p[26].x += t * 0.02;
    p[11].y += d * 0.4; p[12].y += d * 0.4;
    p[0].y += d * 0.4;
    p[13].y -= t * 0.05; p[14].y -= t * 0.05;
    p[15].y -= t * 0.1; p[15].x -= t * 0.04;
    p[16].y -= t * 0.1; p[16].x += t * 0.04;
  }],

  ["glute_bridge_01", (p, t) => {
    // Side view, supine
    p[0] = lm(0.18, 0.60); p[11] = lm(0.28, 0.58); p[12] = lm(0.28, 0.58);
    p[13] = lm(0.25, 0.65); p[14] = lm(0.25, 0.65);
    p[15] = lm(0.24, 0.70); p[16] = lm(0.24, 0.70);
    const lift = t * 0.10;
    p[23] = lm(0.50, 0.54 - lift); p[24] = lm(0.50, 0.54 - lift);
    p[25] = lm(0.65, 0.65); p[26] = lm(0.65, 0.65);
    p[27] = lm(0.75, 0.72); p[28] = lm(0.75, 0.72);
  }],

  ["clamshell_01", (p, t) => {
    // Side-lying
    p[0] = lm(0.18, 0.48);
    p[11] = lm(0.28, 0.47); p[12] = lm(0.28, 0.53);
    p[13] = lm(0.25, 0.55); p[14] = lm(0.25, 0.55);
    p[15] = lm(0.23, 0.60); p[16] = lm(0.23, 0.60);
    p[23] = lm(0.52, 0.47); p[24] = lm(0.52, 0.53);
    const open = t * 0.12;
    p[25] = lm(0.68, 0.47 - open); p[26] = lm(0.68, 0.55);
    p[27] = lm(0.78, 0.50); p[28] = lm(0.78, 0.57);
  }],

  ["dead_bug_01", (p, t) => {
    p[0] = lm(0.18, 0.55);
    p[11] = lm(0.28, 0.53); p[12] = lm(0.28, 0.57);
    p[23] = lm(0.52, 0.53); p[24] = lm(0.52, 0.57);
    // Left arm extends overhead
    p[13] = lm(0.22 - t * 0.08, 0.48); p[15] = lm(0.18 - t * 0.12, 0.42);
    // Right leg extends
    p[26] = lm(0.68 + t * 0.08, 0.55); p[28] = lm(0.82 + t * 0.06, 0.56);
    // Others stay tabletop
    p[14] = lm(0.30, 0.60); p[16] = lm(0.32, 0.65);
    p[25] = lm(0.62, 0.42); p[27] = lm(0.68, 0.42);
  }],

  ["forearm_plank_01", (p, _t) => {
    p[0] = lm(0.18, 0.47);
    p[11] = lm(0.26, 0.49); p[12] = lm(0.26, 0.51);
    p[13] = lm(0.20, 0.58); p[14] = lm(0.20, 0.58);
    p[15] = lm(0.18, 0.60); p[16] = lm(0.18, 0.60);
    p[23] = lm(0.58, 0.49); p[24] = lm(0.58, 0.51);
    p[25] = lm(0.72, 0.51); p[26] = lm(0.72, 0.51);
    p[27] = lm(0.84, 0.56); p[28] = lm(0.84, 0.56);
  }],

  ["calf_raise_standing_01", (p, t) => {
    const lift = t * 0.04;
    // Rise on toes
    for (let i = 0; i <= 26; i++) { if (p[i]) p[i].y -= lift; }
    // Ankles/feet stay
  }],

  ["chin_tuck_01", (p, t) => {
    // Side view
    p[0].x -= t * 0.04;
    p[7].x -= t * 0.03; p[8].x -= t * 0.03;
    p[1].x -= t * 0.03; p[4].x -= t * 0.03;
  }],

  ["single_leg_balance_01", (p, t) => {
    // Lift left leg
    p[25].y -= 0.15; p[25].x -= 0.04;
    p[27].y -= 0.12; p[27].x -= 0.06;
    // Subtle sway
    const sway = Math.sin(t * Math.PI * 6) * 0.008;
    for (const l of p) l.x += sway;
  }],

  ["mini_squat_01", (p, t) => {
    const d = t * 0.08;
    p[23].y += d; p[24].y += d;
    p[25].y += d * 0.3; p[26].y += d * 0.3;
    p[11].y += d * 0.3; p[12].y += d * 0.3;
    p[0].y += d * 0.3;
  }],
];

console.log("\nSeeding reference poses:\n");
for (const [id, anim] of exercises) {
  generateExercise(id, anim);
}
console.log(`\nDone. ${exercises.length} poses written to ${OUTPUT_DIR}\n`);
