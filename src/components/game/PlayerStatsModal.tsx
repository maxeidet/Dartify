import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Crosshair, X } from 'lucide-react';
import type { GameSummary } from '../../store/historyStore';
import type { DartThrow } from '../../core/types';
import { throwLabel } from '../../core/types';
import { DartboardContent } from '../scoring/DartboardSVG';
import { getMarkerPosition } from '../scoring/dartboardMath';
import { Segmented } from '../shared/SoftUI';

interface PlayerStatsModalProps {
  game: GameSummary;
  initialPlayerId: string;
  onClose: () => void;
}

type Tab = 'heatmap' | 'landings';

export function PlayerStatsModal({ game, initialPlayerId, onClose }: PlayerStatsModalProps) {
  const [activePlayerId, setActivePlayerId] = useState(initialPlayerId);
  const [activeTab, setActiveTab] = useState<Tab>('heatmap');
  const [closing, setClosing] = useState(false);

  // Extract all throws for the active player
  const allThrows = useMemo(() => {
    const throws: DartThrow[] = [];
    game.roundHistory.forEach(round => {
      if (round.participantId === activePlayerId) {
        // Exclude bust throws if we only want actual scored hits, 
        // but for heatmap it's nice to see where the bust dart landed too.
        // Let's include all actual throws recorded in the round.
        throws.push(...round.throws.slice(0, round.actualThrows));
      }
    });
    return throws;
  }, [game, activePlayerId]);

  const throwsWithPoints = useMemo(() => allThrows.filter(t => t.boardPoint), [allThrows]);

  // Aggregated hits for Landings tab
  const hitStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allThrows.forEach(t => {
      const label = throwLabel(t);
      stats[label] = (stats[label] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [allThrows]);

  const activePlayer = game.players.find(p => p.participantId === activePlayerId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-[rgba(20,24,32,0.32)] backdrop-blur-[6px] ${closing ? 'soft-scrim-out' : 'soft-scrim'}`}
        onClick={() => setClosing(true)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Player stats"
        onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) onClose(); }}
        className={`relative w-full max-w-md mx-auto h-[90dvh] flex flex-col bg-shell rounded-t-[32px] shadow-[0_-12px_40px_rgba(20,24,32,0.18)] ${closing ? 'soft-sheet-out' : 'soft-sheet'}`}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2.5">
          <span className="w-9 h-[5px] rounded-full bg-[#D5D6DA]" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-soft">
            <Crosshair size={20} strokeWidth={2.2} />
            <h2 className="text-[21px] font-semibold tracking-display leading-none">Player stats</h2>
          </div>
          <button
            onClick={() => setClosing(true)}
            aria-label="Close"
            className="w-9 h-9 rounded-full soft-float soft-press flex items-center justify-center text-slate-soft"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="px-6 pt-5 pb-4">
          <p className="text-[28px] leading-[1.15] font-semibold tracking-display text-slate truncate">
            {activePlayer?.displayName ?? 'Player'}
          </p>
          <p className="mt-1.5 text-[15px] text-subtle font-medium tabular-nums">
            {allThrows.length} {allThrows.length === 1 ? 'dart' : 'darts'} this game
          </p>
        </div>

        <div className="px-4 flex flex-col gap-2 shrink-0">
          {/* Player selector (if multiplayer) */}
          {game.players.length > 1 && (
            <Segmented
              ariaLabel="Player"
              value={activePlayerId}
              onChange={setActivePlayerId}
              options={game.players.map(p => ({ value: p.participantId, label: <span className="block truncate px-2">{p.displayName}</span> }))}
            />
          )}

          <Segmented
            ariaLabel="View"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'heatmap', label: 'Heat map' },
              { value: 'landings', label: 'Landings' },
            ]}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] flex flex-col gap-3">

          <div className="soft-card p-4 flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[320px] shrink-0">
              {/* Base Dartboard SVG */}
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 320 320`}
                className={`rounded-full transition-opacity duration-300 ${activeTab === 'heatmap' ? 'opacity-70' : 'opacity-100'}`}
              >
                <DartboardContent size={320} cx={160} cy={160} scale={160} />

                {/* Landings Markers */}
                {activeTab === 'landings' && (
                  <g className="pointer-events-none">
                    {allThrows.map((dart, index) => {
                      const pos = getMarkerPosition(dart, index, 160, 160, 160, 320);
                      if (!pos) return null;

                      const markerFill =
                        dart.segment === 25
                          ? dart.multiplier === 2 ? '#9E2A2B' : '#1A5833'
                          : dart.multiplier === 3 ? '#F5E2A0'
                            : dart.multiplier === 2 ? '#E5DFCD' : '#BFA464';

                      const markerStroke = dart.multiplier === 3 ? '#1A5833' : '#2E332E';
                      const markerRadius = dart.segment === 25 ? (dart.multiplier === 2 ? 320 * 0.015 : 320 * 0.012) : 320 * 0.01;

                      return (
                        <g key={`landing-${index}`}>
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={markerRadius}
                            fill={markerFill}
                            stroke={markerStroke}
                            strokeWidth={1.5}
                            opacity="0.9"
                          />
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>

              {/* Heatmap Canvas Overlay */}
              {activeTab === 'heatmap' && (
                <HeatmapCanvas throws={throwsWithPoints} size={320} />
              )}
            </div>

            {activeTab === 'heatmap' && (
              <div className="mt-3 text-center">
                <p className="text-[13px] text-subtle font-medium">
                  Based on {throwsWithPoints.length} throws with coordinates
                </p>
                {allThrows.length > throwsWithPoints.length && (
                  <p className="mt-0.5 text-[12px] text-subtle/80">
                    {allThrows.length - throwsWithPoints.length} quick-tap throws have no position
                  </p>
                )}
              </div>
            )}
          </div>

          {activeTab === 'landings' && (
            <div className="soft-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-semibold text-slate">Hit breakdown</span>
                <span className="text-[15px] font-medium text-subtle tabular-nums">{allThrows.length} total</span>
              </div>
              {hitStats.length === 0 ? (
                <p className="mt-3 text-[14px] text-subtle">No darts recorded.</p>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {hitStats.map(([label, count]) => (
                    <div key={label} className="rounded-2xl bg-track/70 py-3 flex flex-col items-center justify-center">
                      <span className="text-[17px] font-semibold text-slate leading-none tabular-nums">{label}</span>
                      <span className="mt-1.5 text-[12px] text-subtle font-medium tabular-nums">{count} {count === 1 ? 'hit' : 'hits'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Heatmap Canvas Component
// ─────────────────────────────────────────────

function HeatmapCanvas({ throws, size }: { throws: DartThrow[], size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Reset
    ctx.clearRect(0, 0, size, size);

    if (throws.length === 0) return;

    // 1. Create color palette (blue -> cyan -> green -> yellow -> red)
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext('2d')!;
    const grad = pCtx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.1, "blue");
    grad.addColorStop(0.3, "cyan");
    grad.addColorStop(0.5, "lime");
    grad.addColorStop(0.7, "yellow");
    grad.addColorStop(1.0, "red");
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 256, 1);
    const palette = pCtx.getImageData(0, 0, 256, 1).data;

    // 2. Draw black spots with alpha
    const radius = size * 0.06; // Adjust spread size
    // Lower alpha per point if there are many throws to prevent instantly hitting red
    const pointAlpha = Math.max(0.1, 1 - (throws.length * 0.005));

    throws.forEach(t => {
      const x = t.boardPoint!.x * size;
      const y = t.boardPoint!.y * size;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, radius);
      rg.addColorStop(0, `rgba(0,0,0,${pointAlpha})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Map alpha to color
    const imgData = ctx.getImageData(0, 0, size, size);
    const pixels = imgData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha > 0) {
        // Ensure alpha stays within bounds
        const colorIndex = Math.min(255, Math.floor(alpha)) * 4;
        pixels[i] = palette[colorIndex];
        pixels[i + 1] = palette[colorIndex + 1];
        pixels[i + 2] = palette[colorIndex + 2];
        // Make less intense colors more transparent
        pixels[i + 3] = alpha;
      }
    }
    ctx.putImageData(imgData, 0, 0);

  }, [throws, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-80"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
