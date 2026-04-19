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
  exerciseName?: string;
  targetAngles?: Record<string, number>;
  cues?: string[];
  tempoSeconds?: string;
}

/**
 * Exercise demonstration component.
 *
 * Two modes:
 * 1. Reference pose playback — loads pre-recorded keypoints, renders with
 *    the same drawSkeleton as the live camera overlay. Identical visual.
 * 2. Instruction card fallback — clean text-based guide with target angle,
 *    tempo breakdown, and step-by-step cues. Actually useful.
 */
export default function ExerciseDemo({
  exerciseId,
  exerciseName,
  targetAngles,
  cues,
  tempoSeconds,
}: ExerciseDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const poseDataRef = useRef<ReferencePoseData | null>(null);
  const frameIndexRef = useRef(0);
  const rafRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const [status, setStatus] = useState<"loading" | "playing" | "instruction">("loading");

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

      // DEMO badge
      ctx.font = "bold 10px system-ui";
      ctx.fillStyle = "rgba(56, 189, 195, 0.7)";
      ctx.fillText("DEMO", 8, 16);

      frameIndexRef.current = (frameIndexRef.current + 1) % data.frame_count;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [toLandmarks]);

  // Try loading reference pose, fall back to instruction card
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/reference-poses/${exerciseId}.json`);
        if (!res.ok) {
          if (!cancelled) setStatus("instruction");
          return;
        }
        const data: ReferencePoseData = await res.json();
        if (cancelled) return;
        if (!data.landmarks?.length) {
          setStatus("instruction");
          return;
        }
        poseDataRef.current = data;
        frameIndexRef.current = 0;
        lastFrameTimeRef.current = 0;
        setStatus("playing");
      } catch {
        if (!cancelled) setStatus("instruction");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [exerciseId]);

  // Canvas setup + animation start
  useEffect(() => {
    if (status !== "playing") return;

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

  // --- Instruction card fallback ---
  if (status === "instruction") {
    const primaryKey = targetAngles ? Object.keys(targetAngles)[0] : null;
    const targetVal = primaryKey ? targetAngles?.[primaryKey] : null;

    // Parse tempo
    const tempoParts = tempoSeconds?.split("-").map(Number) || [];
    const tempoLabels = ["Up", "Hold", "Down", "Rest"];

    return (
      <div
        className="rounded-xl flex flex-col gap-3 p-4"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Exercise name + target */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
            {exerciseName || exerciseId.replace(/_/g, " ").replace(/\d+$/, "").trim()}
          </span>
          {targetVal != null && primaryKey && (
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
              {formatAngleKey(primaryKey)}: {targetVal}{primaryKey.includes("cm") ? " cm" : "°"}
            </span>
          )}
        </div>

        {/* Step-by-step cues */}
        {cues && cues.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {cues.map((cue, i) => (
              <div key={i} className="flex gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <span
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[9px] font-mono font-bold"
                  style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed">{cue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tempo */}
        {tempoParts.length >= 3 && (
          <div className="flex gap-1.5 pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
            {tempoParts.map((t, i) => (
              <div key={i} className="flex-1 text-center py-1 rounded" style={{ background: "var(--color-surface)" }}>
                <div className="text-xs font-mono font-semibold" style={{ color: "var(--color-accent)" }}>{t}s</div>
                <div className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>{tempoLabels[i]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Reference pose playback ---
  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden"
      style={{ background: "#060a0e", border: "1px solid var(--color-border)", minHeight: 180 }}
    >
      {status === "loading" && (
        <div className="flex items-center justify-center" style={{ minHeight: 180 }}>
          <div className="spinner" style={{ width: 20, height: 20 }} />
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: status === "playing" ? "block" : "none" }} />
    </div>
  );
}

function formatAngleKey(key: string): string {
  return key
    .replace(/_degrees$/, "")
    .replace(/_cm$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
