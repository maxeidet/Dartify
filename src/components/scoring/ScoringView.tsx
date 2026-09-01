import { TapGrid } from './TapGrid';
import { DartboardSVG } from './DartboardSVG';
import type { DartThrow, Segment } from '../../core/types';
import { throwLabel } from '../../core/types';
import type { ScoringMode } from '../../store/gameStore';
import { Undo2 } from 'lucide-react';

interface ScoringViewProps {
  mode: ScoringMode;
  onModeChange: (mode: ScoringMode) => void;
  onDartThrown: (dart: DartThrow) => void;
  onUndo: () => void;
  onNextRound: () => void;
  dartsInRound: DartThrow[];
  thrownDarts?: DartThrow[];
  canUndo: boolean;
  disabled?: boolean;
  gameMode?: string;
  currentTarget?: Segment;
  isBust?: boolean;
}

export function ScoringView({
  mode,
  onModeChange,
  onDartThrown,
  onUndo,
  onNextRound,
  dartsInRound,
  thrownDarts,
  canUndo,
  disabled = false,
  gameMode,
  currentTarget,
  isBust = false,
}: ScoringViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="flex mx-3 mt-2 mb-1 p-1 bg-cream rounded-[14px] border border-line z-10 relative shadow-sm">
        <button
          id="scoring-mode-grid"
          onClick={() => onModeChange('grid')}
          className={`
            flex-1 py-2.5 rounded-[10px] text-[11px] font-sans font-bold tracking-[2px] uppercase
            transition-all duration-200
            ${mode === 'grid'
              ? 'bg-forest text-white shadow-md'
              : 'text-muted hover:text-forest-deep'
            }
          `}
          aria-pressed={mode === 'grid'}
        >
          ⚡ Quick Tap
        </button>
        <button
          id="scoring-mode-dartboard"
          onClick={() => onModeChange('dartboard')}
          className={`
            flex-1 py-2.5 rounded-[10px] text-[11px] font-sans font-bold tracking-[2px] uppercase
            transition-all duration-200
            ${mode === 'dartboard'
              ? 'bg-forest text-white shadow-md'
              : 'text-muted hover:text-forest-deep'
            }
          `}
          aria-pressed={mode === 'dartboard'}
        >
          🎯 Dartboard
        </button>
      </div>

      {/* Scoring Panel */}
      <div className="flex-1 overflow-hidden">
        {mode === 'grid' ? (
          <TapGrid
            onDartThrown={onDartThrown}
            onUndo={onUndo}
            onNextRound={onNextRound}
            dartsInRound={dartsInRound}
            canUndo={canUndo}
            disabled={disabled}
            currentTarget={gameMode === 'around_the_clock' ? currentTarget : undefined}
          />
        ) : (
          <div className="flex flex-col h-full overflow-y-auto">
          <DartboardSVG
            onDartThrown={onDartThrown}
            thrownDarts={thrownDarts}
            disabled={disabled}
            isBust={isBust}
            size={Math.min(window.innerWidth - 16, 420)}
          />

            {/* Current Round Dart Slots */}
            <div className="flex justify-center gap-2.5 mt-2 mb-3 z-10 relative">
              {[0, 1, 2].map((i) => {
                const dart = dartsInRound[i];
                return (
                  <div 
                    key={i} 
                    className="w-[72px] h-[44px] flex items-center justify-center rounded-[12px] border border-line bg-panel shadow-sm font-sans font-black tracking-wide text-forest-deep text-[17px]"
                  >
                    {dart ? throwLabel(dart) : <span className="text-muted/30 font-normal">-</span>}
                  </div>
                );
              })}
            </div>

            {/* Footer for dartboard mode too */}
            <div className="grid grid-cols-4 gap-2 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-line mt-auto bg-cream z-10 relative shadow-[0_-4px_10px_rgba(15,58,34,0.02)]">
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
              >
                <Undo2 size={18} strokeWidth={2.5} className="mb-0.5" />
                <span>Undo</span>
              </button>
              <button
                onClick={onNextRound}
                className="
                  col-span-3 flex items-center justify-center
                  rounded-[14px] font-sans font-bold text-sm tracking-[2px] uppercase
                  bg-gold hover:bg-gold-deep
                  text-white py-3 shadow-[0_4px_14px_rgba(191,164,100,0.3)]
                  active:scale-[0.98] transition-all duration-200
                "
              >
                NEXT ROUND →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
