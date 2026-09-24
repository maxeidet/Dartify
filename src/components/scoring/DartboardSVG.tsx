import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DartThrow } from '../../core/types';
import { throwLabel } from '../../core/types';
import dartboardImg from '../../assets/dartboard-board.webp';

import {
  getHitTarget,
  getMarkerPosition
} from './dartboardMath';

interface DartboardSVGProps {
  onDartThrown: (dart: DartThrow) => void;
  thrownDarts?: DartThrow[];
  disabled?: boolean;
  size?: number;
  isBust?: boolean;
}

// ─────────────────────────────────────────────
// Reusable Dartboard SVG Content — a real board photo, cropped tight
// to its circle. The R.* hit-testing fractions in dartboardMath.ts
// were measured directly off this same image, so they line up.
// ─────────────────────────────────────────────

export const DartboardContent = React.memo(({ cx, cy, scale }: { size: number, cx: number, cy: number, scale: number }) => {
  return (
    <image
      href={dartboardImg}
      x={cx - scale}
      y={cy - scale}
      width={scale * 2}
      height={scale * 2}
      preserveAspectRatio="xMidYMid slice"
    />
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

  // Handle interacting with the board. The dart is committed at the last
  // position shown in the magnifier, not where the finger happens to lift —
  // fingers drift a few pixels on release, which made markers land off-target.
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerEvent = (e: React.PointerEvent<HTMLDivElement>, isEnd = false) => {
    if (disabled || !containerRef.current) return;

    // Keep the gesture with the board rather than allowing a tap to scroll or highlight it.
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();

    const { clientX, clientY } = e;

    // Coordinates relative to the board, in the same units as `size`
    const x = ((clientX - rect.left) / rect.width) * size;
    const y = ((clientY - rect.top) / rect.height) * size;

    if (!isEnd) {
      isDraggingRef.current = true;
      lastPointRef.current = { x, y };
      setTouchPos({ x, y });
      setClientPos({ x: clientX, y: clientY });
      setHoveredDart(getHitTarget(x, y, cx, cy, scale));
      setIsDragging(true);
    } else {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const point = lastPointRef.current ?? { x, y };
      lastPointRef.current = null;
      const finalTarget = getHitTarget(point.x, point.y, cx, cy, scale);
      setIsDragging(false);
      setHoveredDart(null);
      onDartThrown({
        ...finalTarget,
        boardPoint: { x: point.x / size, y: point.y / size },
      });
    }
  };

  // Magnifier config
  const MAG_SIZE = 120;
  const MAG_SCALE = 2.5;
  const MAG_OFFSET_Y = 100; // Pixels above the finger
  const visibleDarts = thrownDarts.slice(0, 3);

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
        onPointerCancel={() => {
          isDraggingRef.current = false;
          lastPointRef.current = null;
          setIsDragging(false);
          setHoveredDart(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={`drop-shadow-[0_4px_24px_rgba(0, 0, 0, 0.15)] rounded-full bg-cream transition-opacity ${disabled ? 'opacity-50' : ''} ${isBust ? 'dartboard-bust' : ''}`}
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
              const pos = getMarkerPosition(dart, cx, cy, scale, size);
              if (!pos) return null;

              // A thin ring with a pinpoint centre marks the exact landing spot;
              // the dart number sits in a small tag beside it so it never covers the point.
              const ring = Math.max(5, size * 0.016);
              const stroke = Math.max(1.25, size * 0.004);
              const tagR = Math.max(6, size * 0.019);
              const tagX = pos.x + ring + tagR * 0.55;
              const tagY = pos.y - ring - tagR * 0.55;

              return (
                <g key={`${dart.segment}-${dart.multiplier}-${index}`}>
                  <circle cx={pos.x} cy={pos.y} r={ring} fill="none" stroke="#FFFFFF" strokeWidth={stroke * 2.6} opacity="0.9" />
                  <circle cx={pos.x} cy={pos.y} r={ring} fill="none" stroke="#1C1D20" strokeWidth={stroke} />
                  <circle cx={pos.x} cy={pos.y} r={Math.max(1.6, size * 0.0045)} fill="#1C1D20" stroke="#FFFFFF" strokeWidth={stroke * 0.8} />
                  <circle cx={tagX} cy={tagY} r={tagR} fill="#1C1D20" stroke="#FFFFFF" strokeWidth={stroke} />
                  <text
                    x={tagX}
                    y={tagY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={tagR * 1.15}
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="700"
                    fill="#FFFFFF"
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
            className="fixed pointer-events-none bg-canvas rounded-full overflow-hidden shadow-[0_12px_32px_rgba(20,24,32,0.3)] border-[3px] border-white"
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
                <div className="bg-charcoal px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm tabular-nums">
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
