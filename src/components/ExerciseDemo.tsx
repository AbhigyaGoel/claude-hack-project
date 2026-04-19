"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { drawSkeleton, drawAngleLabel } from "@/lib/skeletonRenderer";
import { calculateAllAngles } from "@/lib/angleCalculator";
import type { Landmark } from "@/types/landmark";

interface ReferencePoseData {
  fps: number;
  exercise_id: string;
  frame_count: number;
  landmarks: number[][][]; // [frame][landmark][x,y,z,visibility]
}

interface ExerciseDemoProps {
  exerciseId: string;
  targetAngles?: Record<string, number>;
  primaryJointAngle?: string;
}

/**
 * Reference pose playback renderer.
 *
 * Loads a pre-recorded MediaPipe keypoint timeseries from
 * /public/reference-poses/{exercise_id}.json and loops it
 * using the same drawSkeleton code as the live user overlay.
 *
 * Demo and live tracker render identically — same skeleton,
 * same styling, same coordinate system.
 */
export default function ExerciseDemo({
  exerciseId,
  targetAngles,
  primaryJointAngle,
}: ExerciseDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseDataRef = useRef<ReferencePoseData | null>(null);
  const frameIndexRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const [status, setStatus] = useState<"loading" | "playing" | "missing">("loading");

  // Convert raw landmark array to Landmark objects
  const toLandmarks = useCallback((raw: number[][]): Landmark[] => {
    return raw.map(([x, y, z, visibility]) => ({
      // Transform from root-normalized coords back to canvas-relative (0-1)
      // Root-normalized: hip center at origin, unit torso length
      // We re-center to canvas: shift origin to center-bottom area
      x: x * 0.25 + 0.5,    // scale down + center horizontally
      y: y * 0.25 + 0.55,   // scale down + place in upper-center
      z: z || 0,
      visibility: visibility ?? 1,
    }));
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const data = poseDataRef.current;
    if (!canvas || !data || data.landmarks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    const frameDuration = 1000 / data.fps;

    if (now - lastFrameTimeRef.current >= frameDuration) {
      lastFrameTimeRef.current = now;

      const rawFrame = data.landmarks[frameIndexRef.current];
      const landmarks = toLandmarks(rawFrame);

      // Clear with dark background
      ctx.fillStyle = "rgba(6, 10, 14, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw skeleton using the same renderer as live pose
      drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

      // Show primary joint angle if target angles provided
      if (targetAngles && primaryJointAngle) {
        const angles = calculateAllAngles(landmarks);
        const angleKey = primaryJointAngle.includes("shoulder")
          ? "left_shoulder_flexion"
          : primaryJointAngle.includes("knee")
            ? "left_knee_flexion"
            : primaryJointAngle.includes("hip")
              ? "left_hip_flexion"
              : "left_shoulder_flexion";

        const currentAngle = angles[angleKey] || 0;
        if (currentAngle > 5) {
          // Find the joint landmark to label
          const jointIndex = angleKey.includes("shoulder") ? 11
            : angleKey.includes("knee") ? 25
              : angleKey.includes("hip") ? 23 : 11;

          if (landmarks[jointIndex]) {
            drawAngleLabel(ctx, landmarks[jointIndex], currentAngle, canvas.width, canvas.height);
          }
        }
      }

      // Draw "DEMO" badge
      ctx.font = "bold 10px system-ui";
      ctx.fillStyle = "rgba(56, 189, 195, 0.8)";
      ctx.fillText("DEMO", 8, 16);

      // Advance frame (loop)
      frameIndexRef.current = (frameIndexRef.current + 1) % data.frame_count;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [toLandmarks, targetAngles, primaryJointAngle]);

  // Load reference pose data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/reference-poses/${exerciseId}.json`);
        if (!res.ok) {
          setStatus("missing");
          return;
        }

        const data: ReferencePoseData = await res.json();
        if (cancelled) return;

        if (!data.landmarks || data.landmarks.length === 0) {
          setStatus("missing");
          return;
        }

        poseDataRef.current = data;
        frameIndexRef.current = 0;
        lastFrameTimeRef.current = 0;
        setStatus("playing");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [exerciseId]);

  // Start/stop animation loop
  useEffect(() => {
    if (status === "playing") {
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [status, animate]);

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Match the container size at 2x for retina
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    }
  }, [status]);

  if (status === "missing") {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl gap-2"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          padding: "16px",
          minHeight: 160,
        }}
      >
        <svg viewBox="0 0 40 40" width={28} height={28}>
          <circle cx="20" cy="12" r="5" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="20" y1="17" x2="20" y2="28" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="20" y1="21" x2="13" y2="26" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="20" y1="21" x2="27" y2="26" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="20" y1="28" x2="14" y2="36" stroke="var(--color-text-muted)" strokeWidth="1.5" />
          <line x1="20" y1="28" x2="26" y2="36" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        </svg>
        <span className="text-[10px] leading-tight text-center" style={{ color: "var(--color-text-muted)" }}>
          Demo coming soon
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "#060a0e",
        border: "1px solid var(--color-border)",
        minHeight: 160,
      }}
    >
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="spinner" style={{ width: 20, height: 20 }} />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: 160, display: "block" }}
      />
    </div>
  );
}
