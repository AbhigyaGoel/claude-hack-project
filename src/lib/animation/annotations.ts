import type { Landmark } from "@/types/landmark";

/**
 * Draws a pulsing glow circle on an active joint.
 */
export function drawJointGlow(
  ctx: CanvasRenderingContext2D,
  landmark: Landmark,
  canvasW: number,
  canvasH: number,
  color: string,
  pulseT: number = 0,
): void {
  const x = landmark.x * canvasW;
  const y = landmark.y * canvasH;
  const baseRadius = 12;
  const pulse = 1 + 0.3 * Math.sin(pulseT * Math.PI * 2);
  const radius = baseRadius * pulse;

  ctx.save();
  ctx.globalAlpha = 0.35;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a curved arrow showing the direction of movement between two landmarks.
 */
export function drawMovementArrow(
  ctx: CanvasRenderingContext2D,
  fromLm: Landmark,
  toLm: Landmark,
  canvasW: number,
  canvasH: number,
  color: string,
): void {
  const x1 = fromLm.x * canvasW;
  const y1 = fromLm.y * canvasH;
  const x2 = toLm.x * canvasW;
  const y2 = toLm.y * canvasH;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Control point offset perpendicular to line
  const cpx = mx - dy * 0.3;
  const cpy = my + dx * 0.3;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cpx, cpy, x2, y2);
  ctx.stroke();

  // Arrowhead
  const angle = Math.atan2(y2 - cpy, x2 - cpx);
  const headLen = 8;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws an exercise name label on the canvas.
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Background pill
  const metrics = ctx.measureText(text);
  const padX = 12;
  const padY = 6;
  const w = metrics.width + padX * 2;
  const h = 20 + padY * 2;
  const rx = x - w / 2;
  const ry = y - padY;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.roundRect(rx, ry, w, h, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draws a dark background with a subtle floor/ground line.
 */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Dark gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // Floor line
  const floorY = h * 0.95;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();

  // Subtle grid dots
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  const spacing = 40;
  for (let x = spacing; x < w; x += spacing) {
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
