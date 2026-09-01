import React, { useCallback, useState } from 'react';
import type { DartThrow, Segment, Multiplier } from '../../core/types';
import { throwScore, throwLabel } from '../../core/types';
import { Undo2 } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface TapGridProps {
  onDartThrown: (dart: DartThrow) => void;
  onUndo: () => void;
  onNextRound: () => void;
  dartsInRound: DartThrow[];
  canUndo: boolean;
  disabled?: boolean;
  /** Around the Clock limits quick scoring to this player's next target. */
  currentTarget?: Segment;
}

interface CellConfig {
  segment: Segment;
  multiplier: Multiplier;
  label: string;
  dots?: string;
  className: string;
}

// ─────────────────────────────────────────────
// Flash state hook
// ─────────────────────────────────────────────

function useFlash() {
  const [flashKey, setFlashKey] = useState<string | null>(null);

  const flash = useCallback((key: string) => {
    setFlashKey(key);
    setTimeout(() => setFlashKey(null), 300);
  }, []);

  return { flashKey, flash };
}

// ─────────────────────────────────────────────
// Individual Grid Cell
// ─────────────────────────────────────────────

interface GridCellProps extends CellConfig {
  isFlashing: boolean;
  onClick: () => void;
}

const GridCell = React.memo(function GridCell({
  label,
  dots,
  className,
  isFlashing,
  onClick,
}: GridCellProps) {
  return (
    <button
      className={`dart-cell ${className} ${isFlashing ? 'score-flash' : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      <span className="font-display text-sm font-bold leading-none">{label}</span>
      {dots && (
        <span className="text-[10px] leading-none mt-0.5 opacity-70 tracking-widest">
          {dots}
        </span>
      )}
    </button>
  );
});

// ─────────────────────────────────────────────
// The 1-Tap Grid
// ─────────────────────────────────────────────

export function TapGrid({ onDartThrown, onUndo, onNextRound, dartsInRound, canUndo, disabled = false, currentTarget }: TapGridProps) {
  const { flashKey, flash } = useFlash();

  // Segments ordered for display (20 down to 11, then 10 down to 1)
  const topRow = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11] as Segment[];
  const bottomRow = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as Segment[];

  const handleDart = useCallback(
    (dart: DartThrow) => {
      if (disabled) return;
      const key = `${dart.segment}-${dart.multiplier}`;
      flash(key);
      onDartThrown(dart);
    },
    [disabled, flash, onDartThrown],
  );

  // Build a cell and handle click
  const makeCell = (segment: Segment, multiplier: Multiplier, extraClass: string, dots?: string) => {
    const dart: DartThrow = { segment, multiplier };
    const key = `${segment}-${multiplier}`;
    const label =
      segment === 0 ? 'MISS' :
        segment === 25 && multiplier === 1 ? 'BULL' :
          segment === 25 && multiplier === 2 ? 'BULL' :
            String(segment);

    return (
      <GridCell
        key={key}
        segment={segment}
        multiplier={multiplier}
        label={label}
        dots={dots}
        className={extraClass}
        isFlashing={flashKey === key}
        onClick={() => handleDart(dart)}
      />
    );
  };

  // ── Current round dart slots ─────────────────
  const dartSlots = Array.from({ length: 3 }, (_, i) => {
    const dart = dartsInRound[i];
    return (
      <div
        key={i}
        className={`
          flex-1 flex items-center justify-center rounded-lg border text-sm font-bold font-display tracking-wide
          transition-all duration-200
          ${dart
            ? 'bg-forest/10 border-forest/30 text-forest-deep'
            : 'bg-panel border-line text-muted'
          }
        `}
      >
        {dart ? throwLabel(dart) : `—`}
      </div>
    );
  });

  const targetLabel = currentTarget === 25 ? 'BULL' : String(currentTarget);
  const targetThrows: Array<{ label: string; multiplier: Multiplier; className: string }> = currentTarget === 25
    ? [
        { label: 'BULL', multiplier: 1, className: 'dart-cell-bull' },
        { label: 'D-BULL', multiplier: 2, className: 'dart-cell-bullseye' },
      ]
    : [
        { label: `S-${targetLabel}`, multiplier: 1, className: 'dart-cell-single' },
        { label: `D-${targetLabel}`, multiplier: 2, className: 'dart-cell-double' },
        { label: `T-${targetLabel}`, multiplier: 3, className: 'dart-cell-treble' },
      ];

  return (
    <div className="flex flex-col h-full select-none" style={{ userSelect: 'none' }}>

      {/* ── Dart slots tracker ─────────────────── */}
      <div className="flex gap-2 px-3 py-2 z-10 relative">
        <span className="text-[10px] text-muted font-bold self-center mr-1 uppercase tracking-[2px]">Round</span>
        {dartSlots}
      </div>

      {currentTarget !== undefined ? (
        <div className="flex flex-1 flex-col px-3 pb-3">
          <div className="mb-3 rounded-[18px] border border-line border-t-[3px] border-t-forest bg-panel px-5 py-4 text-center shadow-[0_4px_14px_rgba(15,58,34,0.05)]">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[2.4px] text-gold-deep">Current target</p>
            <p className="mt-1 font-display text-5xl font-black leading-none text-forest-deep">{targetLabel}</p>
          </div>

          <div className={`grid flex-1 gap-2 ${targetThrows.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {targetThrows.map(({ label, multiplier, className }) => {
              const key = `${currentTarget}-${multiplier}`;
              return (
                <button
                  key={key}
                  className={`dart-cell min-h-24 ${className} ${flashKey === key ? 'score-flash' : ''}`}
                  onClick={() => handleDart({ segment: currentTarget, multiplier })}
                  aria-label={label}
                >
                  <span className="font-display text-xl font-black leading-none">{label}</span>
                </button>
              );
            })}
          </div>

          <button
            className={`dart-cell dart-cell-special mt-2 min-h-16 ${flashKey === '0-1' ? 'score-flash' : ''}`}
            onClick={() => handleDart({ segment: 0, multiplier: 1 })}
            aria-label="Miss"
          >
            <span className="font-display text-base font-black tracking-[2px]">MISS</span>
          </button>
        </div>
      ) : (
        <>

      {/* ── Special top row: MISS / BULL / BULLSEYE ─── */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-1.5">
        {/* MISS */}
        <button
          className={`dart-cell dart-cell-special h-10 ${flashKey === '0-1' ? 'score-flash' : ''}`}
          onClick={() => handleDart({ segment: 0, multiplier: 1 })}
          aria-label="Miss"
        >
          <span className="font-display font-bold text-xs tracking-[2px]">MISS</span>
        </button>

        {/* BULL (25) */}
        <button
          className={`dart-cell dart-cell-bull h-10 ${flashKey === '25-1' ? 'score-flash' : ''}`}
          onClick={() => handleDart({ segment: 25, multiplier: 1 })}
          aria-label="Bull 25"
        >
          <span className="font-display font-bold text-xs tracking-[2px]">BULL</span>
          <span className="text-[9px] opacity-80 leading-none mt-0.5">25</span>
        </button>

        {/* BULLSEYE (50) */}
        <button
          className={`dart-cell dart-cell-bullseye h-10 ${flashKey === '25-2' ? 'score-flash' : ''}`}
          onClick={() => handleDart({ segment: 25, multiplier: 2 })}
          aria-label="Bullseye 50"
        >
          <span className="font-display font-bold text-xs tracking-[2px]">BULL</span>
          <span className="text-[9px] opacity-80 leading-none mt-0.5">50 ●</span>
        </button>
      </div>

      {/* ── Main Scoring Grid ─────────────────── */}
      <div className="flex-1 overflow-hidden px-3 pb-1">
        <div className="grid grid-cols-10 grid-rows-6 gap-1 h-full">

          {/* ── SINGLES ROW 1: 20 → 11 ── */}
          {topRow.map((seg) => makeCell(seg, 1, 'dart-cell-single'))}

          {/* ── SINGLES ROW 2: 10 → 1 ── */}
          {bottomRow.map((seg) => makeCell(seg, 1, 'dart-cell-single'))}

          {/* ── DOUBLES ROW 1: 20 → 11 ── */}
          {topRow.map((seg) => makeCell(seg, 2, 'dart-cell-double', '‥'))}

          {/* ── DOUBLES ROW 2: 10 → 1 ── */}
          {bottomRow.map((seg) => makeCell(seg, 2, 'dart-cell-double', '‥'))}

          {/* ── TREBLES ROW 1: 20 → 11 ── */}
          {topRow.map((seg) => makeCell(seg, 3, 'dart-cell-treble', '···'))}

          {/* ── TREBLES ROW 2: 10 → 1 ── */}
          {bottomRow.map((seg) => makeCell(seg, 3, 'dart-cell-treble', '···'))}

        </div>
      </div>
        </>
      )}

      {/* ── Footer: Undo + Next Round ─────────── */}
      <div className="grid grid-cols-4 gap-2 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-line bg-cream z-10 relative shadow-[0_-4px_10px_rgba(15,58,34,0.02)]">
        {/* UNDO — 1/4 width */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="
            col-span-1 flex flex-col items-center justify-center gap-0.5
            rounded-[14px] border border-line bg-panel
            py-3 font-sans font-bold text-[9px] tracking-[2px] text-muted uppercase
            hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95 transition-all duration-100
          "
          aria-label="Undo last dart"
        >
          <Undo2 size={18} strokeWidth={2.5} className="mb-0.5" />
          <span>Undo</span>
        </button>

        {/* NEXT ROUND — 3/4 width */}
        <button
          onClick={onNextRound}
          className="
            col-span-3 flex items-center justify-center
            rounded-[14px] font-sans font-bold text-sm tracking-[2px] uppercase
            bg-gold hover:bg-gold-deep
            text-white shadow-[0_4px_14px_rgba(191,164,100,0.3)]
            active:scale-[0.98] transition-all duration-200
            py-3
          "
          aria-label="Next round"
        >
          NEXT ROUND →
        </button>
      </div>

    </div>
  );
}
