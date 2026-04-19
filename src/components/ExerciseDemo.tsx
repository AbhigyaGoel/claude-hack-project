"use client";

import { useRef, useEffect, useState } from "react";
import { getAnimationConfig } from "@/lib/animation/templateRegistry";
import { useAnimationLoop } from "@/lib/animation/useAnimationLoop";
import type { AnimationConfig } from "@/lib/animation/types";

interface ExerciseDemoProps {
  exerciseId: string;
  exerciseName?: string;
  targetAngles?: Record<string, number>;
  cues?: string[];
  tempoSeconds?: string;
}

/**
 * Animated exercise demonstration.
 *
 * Uses the template-based animation system to render a looping skeleton
 * animation that shows the exercise movement. Same drawSkeleton() renderer
 * as the live camera overlay — visual consistency between demo and tracking.
 *
 * Auto-plays on mount, loops continuously. No clicking required.
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
  const [config, setConfig] = useState<AnimationConfig | null>(null);
  const [ready, setReady] = useState(false);

  // Look up animation config for this exercise
  useEffect(() => {
    const primaryJoint = targetAngles ? Object.keys(targetAngles)[0] : undefined;
    const bodyRegion = exerciseId.includes("cervical") ? "cervical"
      : exerciseId.includes("lumbar") || exerciseId.includes("plank") || exerciseId.includes("dead_bug") || exerciseId.includes("bird_dog") || exerciseId.includes("cat_cow") || exerciseId.includes("press_up") ? "lumbar"
      : exerciseId.includes("ankle") || exerciseId.includes("calf") || exerciseId.includes("heel") || exerciseId.includes("dorsiflexion") || exerciseId.includes("balance") || exerciseId.includes("alfredson") ? "ankle"
      : exerciseId.includes("hip") || exerciseId.includes("bridge") || exerciseId.includes("clamshell_hip") || exerciseId.includes("fire_hydrant") || exerciseId.includes("abduction") ? "hip"
      : exerciseId.includes("knee") || exerciseId.includes("squat") || exerciseId.includes("quad") || exerciseId.includes("hamstring") || exerciseId.includes("step") ? "knee"
      : "shoulder";

    const c = getAnimationConfig(exerciseId, bodyRegion, primaryJoint);
    setConfig(c);
  }, [exerciseId, targetAngles]);

  // Size canvas on mount and resize
  useEffect(() => {
    function sizeCanvas() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = 220;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      setReady(true);
    }

    sizeCanvas();

    const observer = new ResizeObserver(sizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Drive animation loop
  useAnimationLoop(
    canvasRef,
    ready ? config : null,
    exerciseName || formatName(exerciseId),
  );

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden"
      style={{
        background: "#0a0e14",
        border: "1px solid var(--color-border)",
        minHeight: 220,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: 220 }}
      />
    </div>
  );
}

function formatName(id: string): string {
  return id
    .replace(/_\d+$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
