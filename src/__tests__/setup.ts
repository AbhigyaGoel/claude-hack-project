import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// Mock next/link - render as an anchor so getByText can find nested text
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return React.createElement("a", { href, ...props }, children);
  },
}));

// Mock next/dynamic
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>, options?: { loading?: () => React.ReactNode }) => {
    const LoadingComponent = options?.loading || (() => null);
    return LoadingComponent;
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock MediaPipe
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detectForVideo: vi.fn().mockReturnValue({ landmarks: [] }),
      close: vi.fn(),
    }),
  },
}));

// Mock Tone.js - use class-like constructors
vi.mock("tone", () => {
  function MockReverb() {
    return {
      toDestination: vi.fn().mockReturnThis(),
      wet: { value: 0 },
      dispose: vi.fn(),
    };
  }

  function MockPolySynth() {
    return {
      connect: vi.fn().mockReturnThis(),
      triggerAttackRelease: vi.fn(),
      dispose: vi.fn(),
    };
  }

  function MockLoop(_callback: unknown, _interval: unknown) {
    return {
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
    };
  }

  return {
    start: vi.fn().mockResolvedValue(undefined),
    getTransport: vi.fn(() => ({
      bpm: { value: 120 },
      start: vi.fn(),
      stop: vi.fn(),
    })),
    PolySynth: MockPolySynth,
    FMSynth: vi.fn(),
    Reverb: MockReverb,
    Loop: MockLoop,
  };
});

// Mock child_process
vi.mock("child_process", () => ({
  execFile: vi.fn(),
  default: { execFile: vi.fn() },
}));

// Mock util
vi.mock("util", () => ({
  promisify: vi.fn(() => vi.fn().mockResolvedValue({ stdout: "{}", stderr: "" })),
  default: { promisify: vi.fn(() => vi.fn().mockResolvedValue({ stdout: "{}", stderr: "" })) },
}));

// Mock D3
vi.mock("d3", () => {
  const mockSelection = {
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    datum: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  };

  const makeAxisFn = () => {
    const axisFn = vi.fn().mockReturnValue(null);
    axisFn.ticks = vi.fn().mockReturnValue(axisFn);
    axisFn.tickFormat = vi.fn().mockReturnValue(axisFn);
    return axisFn;
  };

  return {
    select: vi.fn(() => mockSelection),
    scaleLinear: vi.fn(() => {
      const scale = ((v: number) => v) as unknown as Record<string, unknown>;
      scale.domain = vi.fn().mockReturnValue(scale);
      scale.range = vi.fn().mockReturnValue(scale);
      scale.ticks = vi.fn().mockReturnValue([0, 25, 50, 75, 100]);
      return scale;
    }),
    axisBottom: vi.fn(() => makeAxisFn()),
    axisLeft: vi.fn(() => makeAxisFn()),
    line: vi.fn(() => {
      const l = vi.fn().mockReturnValue("M0,0") as unknown as Record<string, unknown>;
      l.x = vi.fn().mockReturnValue(l);
      l.y = vi.fn().mockReturnValue(l);
      l.curve = vi.fn().mockReturnValue(l);
      return l;
    }),
    curveMonotoneX: vi.fn(),
    format: vi.fn(() => (v: number) => String(v)),
  };
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError")),
  },
  writable: true,
});

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
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
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0) as unknown as number);
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));
