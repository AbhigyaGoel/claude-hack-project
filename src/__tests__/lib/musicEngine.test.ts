import { describe, it, expect } from "vitest";
import { createMusicEngine } from "@/lib/musicEngine";
import type { MusicEngine } from "@/lib/musicEngine";

describe("musicEngine", () => {
  it("imports without error", () => {
    expect(createMusicEngine).toBeDefined();
  });

  it("creates an engine with the expected interface", () => {
    const engine = createMusicEngine();
    expect(typeof engine.start).toBe("function");
    expect(typeof engine.stop).toBe("function");
    expect(typeof engine.setPhase).toBe("function");
    expect(typeof engine.setBpm).toBe("function");
    expect(typeof engine.setParams).toBe("function");
    expect(typeof engine.isPlaying).toBe("function");
  });

  it("initially is not playing", () => {
    const engine = createMusicEngine();
    expect(engine.isPlaying()).toBe(false);
  });

  it("accepts a custom baseBpm", () => {
    const engine = createMusicEngine(120);
    expect(engine.isPlaying()).toBe(false);
  });

  it("start sets playing to true", async () => {
    const engine = createMusicEngine();
    await engine.start();
    expect(engine.isPlaying()).toBe(true);
  });

  it("stop after start sets playing to false", async () => {
    const engine = createMusicEngine();
    await engine.start();
    engine.stop();
    expect(engine.isPlaying()).toBe(false);
  });

  it("stop when not playing does not throw", () => {
    const engine = createMusicEngine();
    expect(() => engine.stop()).not.toThrow();
  });

  it("setPhase does not throw for all phases", async () => {
    const engine = createMusicEngine();
    await engine.start();
    expect(() => engine.setPhase("warmup")).not.toThrow();
    expect(() => engine.setPhase("working")).not.toThrow();
    expect(() => engine.setPhase("rest")).not.toThrow();
    expect(() => engine.setPhase("cooldown")).not.toThrow();
    engine.stop();
  });

  it("setBpm does not throw", async () => {
    const engine = createMusicEngine();
    await engine.start();
    expect(() => engine.setBpm(100)).not.toThrow();
    engine.stop();
  });

  it("setParams does not throw", async () => {
    const engine = createMusicEngine();
    await engine.start();
    expect(() => engine.setParams({ density: 0.5 })).not.toThrow();
    engine.stop();
  });

  it("double start is idempotent", async () => {
    const engine = createMusicEngine();
    await engine.start();
    await engine.start();
    expect(engine.isPlaying()).toBe(true);
    engine.stop();
  });
});
