/**
 * Sinusoidal ease-in-out: slow start, fast middle, slow end.
 * Input t in [0,1], output in [0,1].
 */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Maps t from [0,1] to a triangle wave: 0 -> 1 -> 0.
 * Useful for rep animations that go out and come back.
 */
export function pingPong(t: number): number {
  const clamped = t - Math.floor(t);
  return clamped <= 0.5 ? clamped * 2 : 2 - clamped * 2;
}

/**
 * Linear interpolation between a and b by factor t.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Rotates point (px, py) around center (cx, cy) by angleDeg degrees.
 * Positive angleDeg rotates clockwise in screen space (y-down).
 */
export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}
