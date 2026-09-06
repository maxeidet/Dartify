import type { DartThrow, Multiplier } from '../../core/types';

// ─────────────────────────────────────────────
// Dartboard geometry constants
// ─────────────────────────────────────────────

export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
export const NUM_SEGMENTS = 20;
export const ANGLE_PER_SEGMENT = (2 * Math.PI) / NUM_SEGMENTS;
export const HALF_ANGLE = ANGLE_PER_SEGMENT / 2;

export const R = {
  bullseye: 0.045,
  bull: 0.095,
  inner: 0.375,
  treble1: 0.425,
  outer: 0.72,
  double1: 0.79,
  board: 0.84,
};

// ─────────────────────────────────────────────
// Math Helpers
// ─────────────────────────────────────────────

export function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

export function sectorPath(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number): string {
  const p1 = polarToCartesian(cx, cy, r1, startAngle);
  const p2 = polarToCartesian(cx, cy, r2, startAngle);
  const p3 = polarToCartesian(cx, cy, r2, endAngle);
  const p4 = polarToCartesian(cx, cy, r1, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${r2} ${r2} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
    `L ${p4.x} ${p4.y}`,
    `A ${r1} ${r1} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
    'Z',
  ].join(' ');
}

export function getHitTarget(x: number, y: number, cx: number, cy: number, scale: number): DartThrow {
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const r = distance / scale;

  if (r <= R.bullseye) return { segment: 25, multiplier: 2 };
  if (r <= R.bull) return { segment: 25, multiplier: 1 };
  if (r > R.double1) return { segment: 0, multiplier: 1 }; // Miss

  let angle = Math.atan2(dx, -dy);
  if (angle < 0) angle += 2 * Math.PI;

  const index = Math.floor((angle + HALF_ANGLE) / ANGLE_PER_SEGMENT) % NUM_SEGMENTS;
  const segment = BOARD_ORDER[index];

  let multiplier: Multiplier = 1;
  if (r >= R.inner && r <= R.treble1) multiplier = 3;
  else if (r >= R.outer && r <= R.double1) multiplier = 2;

  return { segment, multiplier };
}

export function getMarkerPosition(dart: DartThrow, index: number, cx: number, cy: number, scale: number, size: number) {
  if (dart.segment === 0) return null;

  const point = dart.boardPoint;
  if (point) {
    const stableOffsets = [
      { x: 0, y: 0 },
      { x: 5, y: -5 },
      { x: -5, y: 5 },
    ] as const;
    // Allow for more than 3 darts when rendering stats, simply cycle the offsets
    const offset = stableOffsets[index % stableOffsets.length];

    return {
      x: point.x * size + offset.x,
      y: point.y * size + offset.y,
    };
  }

  const boardIndex = dart.segment === 25 ? 0 : BOARD_ORDER.indexOf(dart.segment as (typeof BOARD_ORDER)[number]);
  const angle = boardIndex >= 0 ? boardIndex * ANGLE_PER_SEGMENT : 0;

  let r: number;
  if (dart.segment === 25) {
    r = dart.multiplier === 2 ? R.bullseye * scale * 0.85 : R.bull * scale * 0.9;
  } else if (dart.multiplier === 3) {
    r = ((R.inner + R.treble1) / 2) * scale;
  } else if (dart.multiplier === 2) {
    r = ((R.outer + R.double1) / 2) * scale;
  } else {
    r = ((R.treble1 + R.outer) / 2) * scale;
  }

  return polarToCartesian(cx, cy, r, angle);
}
