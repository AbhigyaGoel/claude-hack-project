import { describe, it, expect } from "vitest";
import {
  calculateAngle,
  calculateShoulderFlexion,
  calculateElbowFlexion,
  calculateHipFlexion,
  calculateKneeFlexion,
  calculateAllAngles,
} from "@/lib/angleCalculator";
import type { Landmark } from "@/types/landmark";

function makeLandmark(x: number, y: number, z = 0, visibility = 1): Landmark {
  return { x, y, z, visibility };
}

function makeLandmarks33(): Landmark[] {
  return Array.from({ length: 33 }, () => makeLandmark(0.5, 0.5, 0, 1));
}

describe("angleCalculator", () => {
  describe("calculateAngle", () => {
    it("returns 90 degrees for a right angle", () => {
      const a = makeLandmark(0, 1);
      const b = makeLandmark(0, 0);
      const c = makeLandmark(1, 0);
      const angle = calculateAngle(a, b, c);
      expect(angle).toBeCloseTo(90, 0);
    });

    it("returns 180 degrees for a straight line", () => {
      const a = makeLandmark(0, 0);
      const b = makeLandmark(1, 0);
      const c = makeLandmark(2, 0);
      const angle = calculateAngle(a, b, c);
      expect(angle).toBeCloseTo(180, 0);
    });

    it("returns 0 degrees for overlapping points", () => {
      const a = makeLandmark(1, 0);
      const b = makeLandmark(0, 0);
      const c = makeLandmark(1, 0);
      const angle = calculateAngle(a, b, c);
      expect(angle).toBeCloseTo(0, 0);
    });

    it("handles negative coordinates", () => {
      const a = makeLandmark(-1, 0);
      const b = makeLandmark(0, 0);
      const c = makeLandmark(0, 1);
      const angle = calculateAngle(a, b, c);
      expect(angle).toBeCloseTo(90, 0);
    });
  });

  describe("calculateShoulderFlexion", () => {
    it("returns a number for left side", () => {
      const landmarks = makeLandmarks33();
      // Place hip below shoulder, elbow above
      landmarks[23] = makeLandmark(0.4, 0.7); // left hip
      landmarks[11] = makeLandmark(0.4, 0.4); // left shoulder
      landmarks[13] = makeLandmark(0.4, 0.1); // left elbow
      const angle = calculateShoulderFlexion(landmarks, "left");
      expect(typeof angle).toBe("number");
      expect(angle).toBeGreaterThanOrEqual(0);
    });

    it("returns a number for right side", () => {
      const landmarks = makeLandmarks33();
      landmarks[24] = makeLandmark(0.6, 0.7); // right hip
      landmarks[12] = makeLandmark(0.6, 0.4); // right shoulder
      landmarks[14] = makeLandmark(0.6, 0.1); // right elbow
      const angle = calculateShoulderFlexion(landmarks, "right");
      expect(typeof angle).toBe("number");
      expect(angle).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateElbowFlexion", () => {
    it("returns a number for left side", () => {
      const landmarks = makeLandmarks33();
      const angle = calculateElbowFlexion(landmarks, "left");
      expect(typeof angle).toBe("number");
    });

    it("returns a number for right side", () => {
      const landmarks = makeLandmarks33();
      const angle = calculateElbowFlexion(landmarks, "right");
      expect(typeof angle).toBe("number");
    });
  });

  describe("calculateHipFlexion", () => {
    it("returns a number for both sides", () => {
      const landmarks = makeLandmarks33();
      expect(typeof calculateHipFlexion(landmarks, "left")).toBe("number");
      expect(typeof calculateHipFlexion(landmarks, "right")).toBe("number");
    });
  });

  describe("calculateKneeFlexion", () => {
    it("returns a number for both sides", () => {
      const landmarks = makeLandmarks33();
      expect(typeof calculateKneeFlexion(landmarks, "left")).toBe("number");
      expect(typeof calculateKneeFlexion(landmarks, "right")).toBe("number");
    });
  });

  describe("calculateAllAngles", () => {
    it("returns all 8 expected angle keys", () => {
      const landmarks = makeLandmarks33();
      const angles = calculateAllAngles(landmarks);
      expect(angles).toHaveProperty("left_shoulder_flexion");
      expect(angles).toHaveProperty("right_shoulder_flexion");
      expect(angles).toHaveProperty("left_elbow_flexion");
      expect(angles).toHaveProperty("right_elbow_flexion");
      expect(angles).toHaveProperty("left_hip_flexion");
      expect(angles).toHaveProperty("right_hip_flexion");
      expect(angles).toHaveProperty("left_knee_flexion");
      expect(angles).toHaveProperty("right_knee_flexion");
    });

    it("all values are numbers", () => {
      const landmarks = makeLandmarks33();
      const angles = calculateAllAngles(landmarks);
      for (const value of Object.values(angles)) {
        expect(typeof value).toBe("number");
        expect(Number.isFinite(value)).toBe(true);
      }
    });
  });
});
