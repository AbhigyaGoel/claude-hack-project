import { useEffect, useRef, type RefObject } from "react";
import type { AnimationConfig } from "./types";
import { pingPong } from "./easing";
import { getBasePose } from "./basePoses";
import { drawSkeleton } from "@/lib/skeletonRenderer";
import {
  drawBackground,
  drawJointGlow,
  drawLabel,
} from "./annotations";

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

/**
 * React hook that drives the exercise animation loop.
 *
 * Renders at ~30fps using requestAnimationFrame. Calculates a normalized
 * time value t, applies pingPong for rep cycling, then calls the template's
 * animate() function and renders using drawSkeleton().
 */
export function useAnimationLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  config: AnimationConfig | null,
  exerciseName?: string,
): void {
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!config) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { template, repDurationMs } = config;

    startTimeRef.current = performance.now();
    lastFrameRef.current = 0;

    function render(now: number): void {
      rafRef.current = requestAnimationFrame(render);

      // Throttle to target FPS
      const delta = now - lastFrameRef.current;
      if (delta < FRAME_INTERVAL) return;
      lastFrameRef.current = now - (delta % FRAME_INTERVAL);

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const context = canvasEl.getContext("2d");
      if (!context) return;

      const w = canvasEl.width;
      const h = canvasEl.height;

      // Calculate normalized time for rep cycle
      const elapsed = now - startTimeRef.current;
      const rawT = (elapsed % repDurationMs) / repDurationMs;
      const t = pingPong(rawT);

      // Get animated pose
      const basePose = getBasePose(template.basePose);
      const animatedPose = template.animate(basePose, t);

      // Draw background
      drawBackground(context, w, h);

      // Draw skeleton using existing renderer
      drawSkeleton(context, animatedPose, w, h);

      // Draw joint glows on active joints
      const pulseT = (elapsed % 1000) / 1000;
      for (const jointIdx of template.activeJoints) {
        if (jointIdx < animatedPose.length) {
          drawJointGlow(
            context,
            animatedPose[jointIdx],
            w,
            h,
            "#22c55e",
            pulseT,
          );
        }
      }

      // Draw exercise label
      if (exerciseName) {
        drawLabel(context, exerciseName, w / 2, h * 0.04);
      }
    }

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, config, exerciseName]);
}
