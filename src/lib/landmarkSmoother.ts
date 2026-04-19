import type { Landmark } from "@/types/landmark";

const SMOOTHING_FACTOR = 0.6; // 0 = no smoothing, 1 = full lag

export function createLandmarkSmoother() {
  let previous: Landmark[] | null = null;

  function smooth(landmarks: Landmark[]): Landmark[] {
    if (!previous || previous.length !== landmarks.length) {
      previous = landmarks.map((lm) => ({ ...lm }));
      return landmarks;
    }

    const smoothed = landmarks.map((lm, i) => {
      const prev = previous![i];
      // Only smooth if visibility is decent
      if (lm.visibility < 0.3) return lm;

      return {
        x: prev.x * SMOOTHING_FACTOR + lm.x * (1 - SMOOTHING_FACTOR),
        y: prev.y * SMOOTHING_FACTOR + lm.y * (1 - SMOOTHING_FACTOR),
        z: prev.z * SMOOTHING_FACTOR + lm.z * (1 - SMOOTHING_FACTOR),
        visibility: lm.visibility,
      };
    });

    previous = smoothed.map((lm) => ({ ...lm }));
    return smoothed;
  }

  function reset() {
    previous = null;
  }

  return { smooth, reset };
}
