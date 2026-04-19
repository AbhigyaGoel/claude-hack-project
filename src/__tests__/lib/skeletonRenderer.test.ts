import { describe, it, expect, vi } from "vitest";
import { drawSkeleton, drawAngleLabel } from "@/lib/skeletonRenderer";
import type { Landmark } from "@/types/landmark";

function makeLandmarks33(visibility = 1): Landmark[] {
  return Array.from({ length: 33 }, (_, i) => ({
    x: (i % 10) * 0.1,
    y: Math.floor(i / 10) * 0.3,
    z: 0,
    visibility,
  }));
}

function mockCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe("skeletonRenderer", () => {
  describe("drawSkeleton", () => {
    it("imports without error", () => {
      expect(drawSkeleton).toBeDefined();
    });

    it("renders without crashing with visible landmarks", () => {
      const ctx = mockCtx();
      const landmarks = makeLandmarks33(1);
      expect(() => drawSkeleton(ctx, landmarks, 640, 480)).not.toThrow();
    });

    it("renders without crashing with invisible landmarks", () => {
      const ctx = mockCtx();
      const landmarks = makeLandmarks33(0);
      expect(() => drawSkeleton(ctx, landmarks, 640, 480)).not.toThrow();
    });

    it("clears the canvas", () => {
      const ctx = mockCtx();
      drawSkeleton(ctx, makeLandmarks33(), 640, 480);
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    });

    it("accepts joint colors", () => {
      const ctx = mockCtx();
      const landmarks = makeLandmarks33();
      const colors = { 11: "red" as const, 12: "yellow" as const };
      expect(() => drawSkeleton(ctx, landmarks, 640, 480, colors)).not.toThrow();
    });

    it("handles empty landmarks array", () => {
      const ctx = mockCtx();
      expect(() => drawSkeleton(ctx, [], 640, 480)).not.toThrow();
    });
  });

  describe("drawAngleLabel", () => {
    it("imports without error", () => {
      expect(drawAngleLabel).toBeDefined();
    });

    it("renders without crashing", () => {
      const ctx = mockCtx();
      const landmark: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 1 };
      expect(() => drawAngleLabel(ctx, landmark, 90, 640, 480)).not.toThrow();
    });

    it("calls fillText with angle", () => {
      const ctx = mockCtx();
      const landmark: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 1 };
      drawAngleLabel(ctx, landmark, 45.7, 640, 480);
      expect(ctx.fillText).toHaveBeenCalledWith("46\u00B0", expect.any(Number), expect.any(Number));
    });
  });
});
