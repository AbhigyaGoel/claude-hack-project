import type { Landmark } from "@/types/landmark";

export interface RepDetectorConfig {
  primaryAngleKey: string;
  targetAngle: number;
  resetThresholdRatio: number; // e.g., 0.7 = rep completes when angle crosses target and returns past 70% of target
  calculateAngle: (landmarks: Landmark[]) => number;
}

export type RepPhase = "idle" | "ascending" | "peak" | "descending";

export interface RepState {
  phase: RepPhase;
  currentAngle: number;
  peakAngle: number;
  repCount: number;
  repStartTime: number;
  lastRepDuration: number;
  peakAngles: Record<string, number>;
}

export interface RepEvent {
  type: "rep_completed";
  repNumber: number;
  peakAngle: number;
  durationMs: number;
  timestamp: number;
}

export function createRepDetector(config: RepDetectorConfig) {
  const state: RepState = {
    phase: "idle",
    currentAngle: 0,
    peakAngle: 0,
    repCount: 0,
    repStartTime: 0,
    lastRepDuration: 0,
    peakAngles: {},
  };

  const resetThreshold = config.targetAngle * config.resetThresholdRatio;

  function update(
    landmarks: Landmark[],
    allAngles: Record<string, number>,
    timestamp: number,
  ): RepEvent | null {
    const angle = config.calculateAngle(landmarks);
    state.currentAngle = angle;

    switch (state.phase) {
      case "idle":
        if (angle > resetThreshold * 0.5) {
          state.phase = "ascending";
          state.repStartTime = timestamp;
          state.peakAngle = angle;
        }
        break;

      case "ascending":
        if (angle > state.peakAngle) {
          state.peakAngle = angle;
        }
        // Detect peak: angle starts decreasing significantly
        if (angle < state.peakAngle - 5) {
          state.phase = "descending";
          state.peakAngles = { ...allAngles };
        }
        break;

      case "descending":
        if (angle <= resetThreshold) {
          // Rep completed
          state.repCount++;
          const duration = timestamp - state.repStartTime;
          state.lastRepDuration = duration;

          const event: RepEvent = {
            type: "rep_completed",
            repNumber: state.repCount,
            peakAngle: state.peakAngle,
            durationMs: duration,
            timestamp,
          };

          state.phase = "idle";
          state.peakAngle = 0;

          return event;
        }
        break;
    }

    return null;
  }

  function reset(): void {
    state.phase = "idle";
    state.currentAngle = 0;
    state.peakAngle = 0;
    state.repCount = 0;
    state.repStartTime = 0;
    state.lastRepDuration = 0;
    state.peakAngles = {};
  }

  function getState(): Readonly<RepState> {
    return { ...state, peakAngles: { ...state.peakAngles } };
  }

  return { update, reset, getState };
}
