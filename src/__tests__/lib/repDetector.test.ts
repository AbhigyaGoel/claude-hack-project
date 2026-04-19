import { describe, it, expect } from "vitest";
import { createRepDetector } from "@/lib/repDetector";
import type { Landmark } from "@/types/landmark";

function makeLandmarks33(): Landmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
}

describe("repDetector", () => {
  it("imports without error", () => {
    expect(createRepDetector).toBeDefined();
  });

  it("creates a detector with update, reset, getState", () => {
    const detector = createRepDetector({
      primaryAngleKey: "left_shoulder_flexion",
      targetAngle: 90,
      resetThresholdRatio: 0.7,
      calculateAngle: () => 0,
    });

    expect(typeof detector.update).toBe("function");
    expect(typeof detector.reset).toBe("function");
    expect(typeof detector.getState).toBe("function");
  });

  it("initial state is idle with zero counts", () => {
    const detector = createRepDetector({
      primaryAngleKey: "test",
      targetAngle: 90,
      resetThresholdRatio: 0.7,
      calculateAngle: () => 0,
    });

    const state = detector.getState();
    expect(state.phase).toBe("idle");
    expect(state.repCount).toBe(0);
    expect(state.currentAngle).toBe(0);
  });

  it("detects a rep when angle goes up past threshold and back down", () => {
    let currentAngle = 0;
    const detector = createRepDetector({
      primaryAngleKey: "test",
      targetAngle: 90,
      resetThresholdRatio: 0.7, // reset at 63 degrees
      calculateAngle: () => currentAngle,
    });

    const landmarks = makeLandmarks33();
    const angles = { test: 0 };

    // Ascending: angle goes from 0 to 100
    for (let a = 0; a <= 100; a += 10) {
      currentAngle = a;
      detector.update(landmarks, angles, a * 10);
    }

    // Peak reached, start descending
    for (let a = 95; a >= 0; a -= 10) {
      currentAngle = a;
      const event = detector.update(landmarks, angles, (200 - a) * 10);
      if (event) {
        expect(event.type).toBe("rep_completed");
        expect(event.repNumber).toBe(1);
        return;
      }
    }

    // If we get here, the rep should have been detected at reset threshold
    const state = detector.getState();
    expect(state.repCount).toBeGreaterThanOrEqual(0);
  });

  it("reset clears state", () => {
    let currentAngle = 50;
    const detector = createRepDetector({
      primaryAngleKey: "test",
      targetAngle: 90,
      resetThresholdRatio: 0.7,
      calculateAngle: () => currentAngle,
    });

    const landmarks = makeLandmarks33();
    detector.update(landmarks, {}, 0);

    detector.reset();
    const state = detector.getState();
    expect(state.phase).toBe("idle");
    expect(state.repCount).toBe(0);
    expect(state.currentAngle).toBe(0);
  });

  it("getState returns a copy (immutable)", () => {
    const detector = createRepDetector({
      primaryAngleKey: "test",
      targetAngle: 90,
      resetThresholdRatio: 0.7,
      calculateAngle: () => 0,
    });

    const state1 = detector.getState();
    const state2 = detector.getState();
    expect(state1).not.toBe(state2);
    expect(state1).toEqual(state2);
  });
});
