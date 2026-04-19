"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { drawSkeleton } from "@/lib/skeletonRenderer";
import type { Landmark } from "@/types/landmark";

interface ReferencePoseData {
  fps: number;
  exercise_id: string;
  frame_count: number;
  landmarks: number[][][];
}

interface ExerciseDemoProps {
  exerciseId: string;
  targetAngles?: Record<string, number>;
  primaryJointAngle?: string;
}

/**
 * Reference pose playback renderer.
 *
 * Loads a pre-recorded keypoint timeseries from /reference-poses/{id}.json
 * and loops it using the same drawSkeleton renderer as the live user overlay.
 *
 * Falls back to a clean text-based instruction card when no reference data exists.
 */
export default function ExerciseDemo({
  exerciseId,
  targetAngles,
}: ExerciseDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poseDataRef = useRef<ReferencePoseData | null>(null);
  const frameIndexRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const [status, setStatus] = useState<"loading" | "playing" | "missing">("loading");

  const toLandmarks = useCallback((raw: number[][]): Landmark[] => {
    return raw.map(([x, y, z, visibility]) => ({
      x: x * 0.28 + 0.5,
      y: y * 0.28 + 0.5,
      z: z || 0,
      visibility: visibility ?? 1,
    }));
  }, []);

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

      ctx.fillStyle = "#060a0e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

      // "DEMO" badge
      ctx.font = "bold 10px system-ui";
      ctx.fillStyle = "rgba(56, 189, 195, 0.7)";
      ctx.fillText("DEMO", 8, 16);

      // Target angle readout
      if (targetAngles) {
        const primaryKey = Object.keys(targetAngles)[0];
        const targetVal = targetAngles[primaryKey];
        if (primaryKey && targetVal) {
          const label = primaryKey.replace(/_/g, " ").replace(" degrees", "°").replace(" cm", " cm");
          ctx.font = "11px system-ui";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillText(`Target: ${label} ${targetVal}`, 8, canvas.height - 8);
        }
      }

      frameIndexRef.current = (frameIndexRef.current + 1) % data.frame_count;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [toLandmarks, targetAngles]);

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
        if (cancelled || !data.landmarks?.length) {
          if (!cancelled) setStatus("missing");
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

  useEffect(() => {
    if (status !== "playing") return;

    // Size canvas for container
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = 180;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, animate]);

  // "Demo coming soon" — clean instructional fallback
  if (status === "missing") {
    const targetKey = targetAngles ? Object.keys(targetAngles)[0] : null;
    const targetVal = targetKey ? targetAngles?.[targetKey] : null;

    return (
      <div
        className="rounded-xl flex flex-col items-center justify-center gap-3 py-6 px-4"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
          minHeight: 140,
        }}
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="5" r="3" />
            <path d="M12 8v8M8 12h8M12 16l-3 5M12 16l3 5" />
          </svg>
          <span className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
            Follow the cues below
          </span>
        </div>
        {targetVal && targetKey && (
          <div className="text-center">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Target: {targetKey.replace(/_/g, " ").replace("degrees", "").trim()}
            </span>
            <span className="text-sm font-mono font-semibold ml-1" style={{ color: "var(--color-accent)" }}>
              {targetVal}{targetKey.includes("cm") ? " cm" : "°"}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "#060a0e",
        border: "1px solid var(--color-border)",
        minHeight: 180,
      }}
    >
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="spinner" style={{ width: 20, height: 20 }} />
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
