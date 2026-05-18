import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleDeg(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

// Snap an angle to the nearest of [0, 45, 90, 135, ...] within threshold (deg).
export function snapAngle(angleRad: number, stepDeg = 45, thresholdDeg = 7) {
  const angleDeg = (angleRad * 180) / Math.PI;
  const snapped = Math.round(angleDeg / stepDeg) * stepDeg;
  if (Math.abs(angleDeg - snapped) <= thresholdDeg) {
    return (snapped * Math.PI) / 180;
  }
  return angleRad;
}

// Perpendicular-corrected endpoint: keep start, force angle to multiples of 90°
// when the actual angle is close enough; otherwise return raw end.
export function perpendicularCorrect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  thresholdDeg = 10,
): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return end;
  const ang = Math.atan2(dy, dx);
  const snappedAng = snapAngle(ang, 90, thresholdDeg);
  if (snappedAng === ang) return end;
  return {
    x: start.x + Math.cos(snappedAng) * len,
    y: start.y + Math.sin(snappedAng) * len,
  };
}

// Shoelace area for polygon (mm^2)
export function polygonArea(points: { x: number; y: number }[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

// Centroid for polygon
export function polygonCentroid(points: { x: number; y: number }[]): {
  x: number;
  y: number;
} {
  if (points.length === 0) return { x: 0, y: 0 };
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
    a += cross;
  }
  a /= 2;
  if (a === 0) {
    // fallback: average
    const ax = points.reduce((s, p) => s + p.x, 0) / points.length;
    const ay = points.reduce((s, p) => s + p.y, 0) / points.length;
    return { x: ax, y: ay };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

// mm² -> 畳 (1畳 ≒ 1.62 m² = 1,620,000 mm²)
export function mm2ToTatami(mm2: number): number {
  return mm2 / 1_620_000;
}

// mm² -> m²
export function mm2ToM2(mm2: number): number {
  return mm2 / 1_000_000;
}

export function formatArea(mm2: number): string {
  const m2 = mm2ToM2(mm2);
  const jo = mm2ToTatami(mm2);
  return `${m2.toFixed(2)}㎡ (${jo.toFixed(1)}畳)`;
}
