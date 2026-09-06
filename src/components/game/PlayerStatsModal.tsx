import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { GameSummary } from '../../store/historyStore';
import type { DartThrow } from '../../core/types';
import { throwLabel } from '../../core/types';
import { DartboardContent } from '../scoring/DartboardSVG';
import { getMarkerPosition } from '../scoring/dartboardMath';

interface PlayerStatsModalProps {
  game: GameSummary;
  initialPlayerId: string;
  onClose: () => void;
}

type Tab = 'heatmap' | 'landings';

export function PlayerStatsModal({ game, initialPlayerId, onClose }: PlayerStatsModalProps) {
  const [activePlayerId, setActivePlayerId] = useState(initialPlayerId);
  const [activeTab, setActiveTab] = useState<Tab>('heatmap');

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-panel border border-line rounded-t-[28px] sm:rounded-[28px] p-5 w-full max-w-md shadow-2xl flex flex-col h-[85vh] sm:h-[80vh] slide-in-from-bottom-8 sm:slide-in-from-bottom-0">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-8" /> {/* Spacer */}
          <h2 className="font-display font-black text-xl text-forest-deep">Player Stats</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-muted hover:bg-line transition-colors"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Player Selector (if multiplayer) */}
        {game.players.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {game.players.map(p => (
              <button
                key={p.participantId}
                onClick={() => setActivePlayerId(p.participantId)}
                className={`
                  shrink-0 px-3.5 py-1.5 rounded-full border font-sans font-bold text-[10px] tracking-[1px] transition-all flex items-center gap-1.5
                  ${activePlayerId === p.participantId
                    ? 'bg-forest border-forest text-white'
                    : 'bg-cream border-line text-muted hover:border-gold'}
                `}
              >
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] ${activePlayerId === p.participantId ? 'bg-white text-forest' : 'bg-line text-muted'}`}>
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
                {p.displayName}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-cream rounded-[14px] border border-line mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`
              flex-1 py-2 rounded-[10px] text-[11px] font-sans font-bold tracking-[1.5px] uppercase transition-all duration-200
              ${activeTab === 'heatmap' ? 'bg-forest text-white shadow-md' : 'text-muted hover:text-forest-deep'}
            `}
          >
            Heat Map
          </button>
          <button
            onClick={() => setActiveTab('landings')}
            className={`
              flex-1 py-2 rounded-[10px] text-[11px] font-sans font-bold tracking-[1.5px] uppercase transition-all duration-200
              ${activeTab === 'landings' ? 'bg-forest text-white shadow-md' : 'text-muted hover:text-forest-deep'}
            `}
          >
            Landings
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col items-center">

          <div className="relative w-full aspect-square max-w-[320px] mb-4 shrink-0">
            {/* Base Dartboard SVG */}
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 320 320`}
              className={`drop-shadow-[0_4px_16px_rgba(15,58,34,0.1)] rounded-full bg-cream transition-opacity duration-300 ${activeTab === 'heatmap' ? 'opacity-70' : 'opacity-100'}`}
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

          {/* Additional info based on tab */}
          {activeTab === 'heatmap' ? (
            <div className="text-center px-4 w-full">
              <p className="text-xs text-muted font-medium mb-1">
                Based on {throwsWithPoints.length} throws with coordinates.
              </p>
              {allThrows.length > throwsWithPoints.length && (
                <p className="text-[10px] text-gold-deep/80">
                  ({allThrows.length - throwsWithPoints.length} quick-tap throws hidden)
                </p>
              )}
            </div>
          ) : (
            <div className="w-full px-1">
              <h3 className="font-sans font-bold text-xs tracking-wider uppercase text-muted mb-3 border-b border-line pb-1">
                Hit Breakdown ({allThrows.length} total)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {hitStats.map(([label, count]) => (
                  <div key={label} className="bg-cream border border-line rounded-lg p-2 flex flex-col items-center justify-center">
                    <span className="font-display font-bold text-forest-deep text-base leading-none mb-1">{label}</span>
                    <span className="text-[10px] text-muted font-medium uppercase tracking-wide">{count} {count === 1 ? 'hit' : 'hits'}</span>
                  </div>
                ))}
              </div>
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
