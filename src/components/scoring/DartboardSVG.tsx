import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DartThrow, Segment, Multiplier } from '../../core/types';
import { throwLabel } from '../../core/types';

// ─────────────────────────────────────────────
// Dartboard geometry constants
// ─────────────────────────────────────────────

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;
const NUM_SEGMENTS = 20;
const ANGLE_PER_SEGMENT = (2 * Math.PI) / NUM_SEGMENTS;
const HALF_ANGLE = ANGLE_PER_SEGMENT / 2;

const R = {
  bullseye: 0.045,
  bull: 0.095,
  inner: 0.375,
  treble1: 0.425,
  outer: 0.72,
  double1: 0.79,
  board: 0.84,
};

interface DartboardSVGProps {
  onDartThrown: (dart: DartThrow) => void;
  thrownDarts?: DartThrow[];
  disabled?: boolean;
  size?: number;
  isBust?: boolean;
}

// ─────────────────────────────────────────────
// Math Helpers
// ─────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

function sectorPath(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number): string {
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

function getHitTarget(x: number, y: number, cx: number, cy: number, scale: number): DartThrow {
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

// ─────────────────────────────────────────────
// Colors (Premium Red/Green Theme)
// ─────────────────────────────────────────────

const SINGLE_COLORS = ['#2E332E', '#F8F5EC'] as const; // Ink / Cream
const DOUBLE_COLORS = ['#9E2A2B', '#1A5833'] as const; // Crimson / Forest
const TREBLE_COLORS = ['#9E2A2B', '#1A5833'] as const; // Crimson / Forest

// ─────────────────────────────────────────────
// Reusable Dartboard SVG Content
// ─────────────────────────────────────────────

const DartboardContent = React.memo(({ size, cx, cy, scale }: { size: number, cx: number, cy: number, scale: number }) => {
  const segments: React.ReactNode[] = [];

  BOARD_ORDER.forEach((number, i) => {
    const startAngle = i * ANGLE_PER_SEGMENT - HALF_ANGLE;
    const endAngle = startAngle + ANGLE_PER_SEGMENT;
    const colorIndex = i % 2;

    segments.push(
      <path key={`single-${number}`} d={sectorPath(cx, cy, R.treble1 * scale, R.outer * scale, startAngle, endAngle)} fill={SINGLE_COLORS[colorIndex]} />
    );
    segments.push(
      <path key={`treble-${number}`} d={sectorPath(cx, cy, R.inner * scale, R.treble1 * scale, startAngle, endAngle)} fill={TREBLE_COLORS[colorIndex]} />
    );
    segments.push(
      <path key={`single-outer-${number}`} d={sectorPath(cx, cy, R.bull * scale, R.inner * scale, startAngle, endAngle)} fill={SINGLE_COLORS[colorIndex]} />
    );
    segments.push(
      <path key={`double-${number}`} d={sectorPath(cx, cy, R.outer * scale, R.double1 * scale, startAngle, endAngle)} fill={DOUBLE_COLORS[colorIndex]} />
    );
  });

  return (
    <>
      <circle cx={cx} cy={cy} r={size / 2} fill="#EDE6D2" />
      <circle cx={cx} cy={cy} r={R.board * scale} fill="#1a1a1a" />
      {segments}
      {/* Wireframe */}
      <circle cx={cx} cy={cy} r={R.double1 * scale} fill="transparent" stroke="#E5DFCD" strokeWidth="0.5" opacity="0.4" />
      <circle cx={cx} cy={cy} r={R.treble1 * scale} fill="transparent" stroke="#E5DFCD" strokeWidth="0.5" opacity="0.4" />
      <circle cx={cx} cy={cy} r={R.inner * scale} fill="transparent" stroke="#E5DFCD" strokeWidth="0.5" opacity="0.4" />
      <circle cx={cx} cy={cy} r={R.bull * scale} fill="transparent" stroke="#E5DFCD" strokeWidth="0.5" opacity="0.4" />
      <circle cx={cx} cy={cy} r={R.bullseye * scale} fill="transparent" stroke="#E5DFCD" strokeWidth="0.5" opacity="0.4" />

      {/* Numbers */}
      {BOARD_ORDER.map((number, i) => {
        const angle = i * ANGLE_PER_SEGMENT;
        const pos = polarToCartesian(cx, cy, R.board * scale * 0.94, angle);
        return (
          <text key={`label-${number}`} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fill="#E5DFCD" fontSize={size * 0.05} fontFamily="Fraunces, serif" fontWeight="900" className="pointer-events-none">
            {number}
          </text>
        );
      })}
      {/* Bullseyes */}
      <circle cx={cx} cy={cy} r={R.bull * scale} fill="#1A5833" />
      <circle cx={cx} cy={cy} r={R.bullseye * scale} fill="#9E2A2B" />
      <circle cx={cx} cy={cy} r={R.bullseye * scale * 0.25} fill="#5C1415" />
    </>
  );
});

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function DartboardSVG({ onDartThrown, thrownDarts = [], disabled = false, size = 360, isBust = false }: DartboardSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });
  const [clientPos, setClientPos] = useState({ x: 0, y: 0 });
  const [hoveredDart, setHoveredDart] = useState<DartThrow | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 2;

  // Handle interacting with the board
  const handlePointerEvent = (e: React.PointerEvent<HTMLDivElement>, isEnd = false) => {
    if (disabled || !containerRef.current) return;

    // Keep the gesture with the board rather than allowing a tap to scroll or highlight it.
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();

    const { clientX, clientY } = e;

    // Coordinates relative to the SVG
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (!isEnd) {
      isDraggingRef.current = true;
      setTouchPos({ x, y });
      setClientPos({ x: clientX, y: clientY });
      setHoveredDart(getHitTarget(x, y, cx, cy, scale));
      setIsDragging(true);
    } else {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const finalTarget = getHitTarget(x, y, cx, cy, scale);
      setIsDragging(false);
      setHoveredDart(null);
      onDartThrown({
        ...finalTarget,
        boardPoint: {
          x: rect.width > 0 ? x / rect.width : 0.5,
          y: rect.height > 0 ? y / rect.height : 0.5,
        },
      });
    }
  };

  // Magnifier config
  const MAG_SIZE = 120;
  const MAG_SCALE = 2.5;
  const MAG_OFFSET_Y = 100; // Pixels above the finger
  const visibleDarts = thrownDarts.slice(0, 3);

  function getMarkerPosition(dart: DartThrow, index: number) {
    if (dart.segment === 0) return null;

    const point = dart.boardPoint;
    if (point) {
      const stableOffsets = [
        { x: 0, y: 0 },
        { x: 5, y: -5 },
        { x: -5, y: 5 },
      ] as const;
      const offset = stableOffsets[index] ?? stableOffsets[0];

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

  return (
    <div className="flex flex-col items-center justify-center w-full relative select-none">

      <div
        ref={containerRef}
        className="dartboard-surface relative touch-none mx-auto"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointerEvent(e);
        }}
        onPointerMove={(e) => isDraggingRef.current && handlePointerEvent(e)}
        onPointerUp={(e) => {
          handlePointerEvent(e, true);
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => handlePointerEvent(e, true)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={`drop-shadow-[0_4px_24px_rgba(15,58,34,0.15)] rounded-full bg-cream transition-opacity ${disabled ? 'opacity-50' : ''} ${isBust ? 'dartboard-bust' : ''}`}
        >
          <DartboardContent size={size} cx={cx} cy={cy} scale={scale} />
          {isBust && (
            <g className="dartboard-crack pointer-events-none" aria-hidden="true">
              <path d={`M ${cx + scale * 0.03} ${cy - scale * 0.72} L ${cx - scale * 0.06} ${cy - scale * 0.28} L ${cx + scale * 0.08} ${cy - scale * 0.02} L ${cx - scale * 0.03} ${cy + scale * 0.68}`} />
              <path d={`M ${cx - scale * 0.06} ${cy - scale * 0.28} L ${cx - scale * 0.32} ${cy - scale * 0.42}`} />
              <path d={`M ${cx + scale * 0.08} ${cy - scale * 0.02} L ${cx + scale * 0.37} ${cy + scale * 0.17}`} />
              <path d={`M ${cx - scale * 0.03} ${cy + scale * 0.38} L ${cx - scale * 0.29} ${cy + scale * 0.55}`} />
            </g>
          )}
          <g className="pointer-events-none">
            {visibleDarts.map((dart, index) => {
              const pos = getMarkerPosition(dart, index);
              if (!pos) return null;

              const markerFill =
                dart.segment === 25
                  ? dart.multiplier === 2
                    ? '#9E2A2B'
                    : '#1A5833'
                  : dart.multiplier === 3
                    ? '#F5E2A0'
                    : dart.multiplier === 2
                      ? '#E5DFCD'
                      : '#BFA464';

              const markerStroke = dart.multiplier === 3 ? '#1A5833' : '#2E332E';
              const markerRadius = dart.segment === 25 ? (dart.multiplier === 2 ? size * 0.017 : size * 0.014) : size * 0.012;

              return (
                <g key={`${dart.segment}-${dart.multiplier}-${index}`}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={markerRadius}
                    fill={markerFill}
                    stroke={markerStroke}
                    strokeWidth={Math.max(1, size * 0.0035)}
                    opacity="0.95"
                  />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={markerRadius * 0.35}
                    fill="#F8F5EC"
                    opacity="0.95"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + markerRadius * 0.15}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={size * 0.022}
                    fontFamily="Fraunces, serif"
                    fontWeight="900"
                    fill={markerStroke}
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Magnifying Glass Overlay via Portal */}
        {isDragging && createPortal(
          <div 
            className="fixed pointer-events-none bg-cream rounded-full overflow-hidden shadow-[0_8px_32px_rgba(15,58,34,0.3)] border-[3px] border-gold"
            style={{
              zIndex: 99999,
              width: MAG_SIZE,
              height: MAG_SIZE,
              left: clientPos.x - MAG_SIZE / 2,
              top: clientPos.y - MAG_OFFSET_Y - MAG_SIZE / 2,
            }}
          >
            {/* The scaled inner board */}
            <svg
              width={MAG_SIZE}
              height={MAG_SIZE}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
              }}
            >
              <g transform={`
                translate(${MAG_SIZE/2}, ${MAG_SIZE/2}) 
                scale(${MAG_SCALE}) 
                translate(${-touchPos.x}, ${-touchPos.y})
              `}>
                <DartboardContent size={size} cx={cx} cy={cy} scale={scale} />
              </g>
            </svg>

            {/* Crosshair indicator */}
            <div className="absolute inset-0 m-auto w-3 h-3 border-[1.5px] border-white rounded-full bg-white/20 shadow-[0_0_4px_rgba(0,0,0,0.5)] flex items-center justify-center">
              <div className="w-[1.5px] h-[1.5px] bg-red-500 rounded-full" />
            </div>

            {/* Target Label */}
            {hoveredDart && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                <div className="bg-forest px-2 py-0.5 rounded-md text-[10px] font-bold font-sans text-white shadow-sm border border-forest-deep">
                  {throwLabel(hoveredDart)}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
