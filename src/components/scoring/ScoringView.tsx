import { useEffect, useRef, useState } from "react";
import { TapGrid } from "./TapGrid";
import { DartboardSVG } from "./DartboardSVG";
import type { DartThrow, Segment } from "../../core/types";
import { throwLabel } from "../../core/types";
import type { ScoringMode } from "../../store/gameStore";
import { Undo2 } from "lucide-react";
import { CameraScorer } from "../game/CameraScorer";

// Tracks the available space for the dartboard so it can be sized to fit
// without ever forcing the panel below it to scroll off-screen.
function useAvailableSquareSize(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize(Math.floor(Math.min(width, height)));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

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
  const [boardWrapRef, boardSize] = useAvailableSquareSize(
    Math.min(window.innerWidth - 16, 420)
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mode Toggle */}
      <div className="flex mx-3 mt-1 mb-1 p-1 bg-cream rounded-[14px] border border-line z-10 relative shadow-sm shrink-0">
        <button
          id="scoring-mode-grid"
          onClick={() => onModeChange("grid")}
          className={`
            flex-1 py-1.5 rounded-[10px] text-[11px] font-sans font-bold tracking-[2px] uppercase
            transition-all duration-200
            ${
              mode === "grid"
                ? "bg-forest text-white shadow-md"
                : "text-muted hover:text-forest-deep"
            }
          `}
          aria-pressed={mode === "grid"}
        >
          Quick Tap
        </button>
        <button
          id="scoring-mode-dartboard"
          onClick={() => onModeChange("dartboard")}
          className={`
            flex-1 py-1.5 rounded-[10px] text-[11px] font-sans font-bold tracking-[2px] uppercase
            transition-all duration-200
            ${
              mode === "dartboard"
                ? "bg-forest text-white shadow-md"
                : "text-muted hover:text-forest-deep"
            }
          `}
          aria-pressed={mode === "dartboard"}
        >
          Dartboard
        </button>
      </div>

      {/* Scoring Panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === "camera" ? (
          <div className="flex flex-col h-full overflow-y-auto pt-2 px-2 pb-0">
            <div className="flex-1">
              <CameraScorer onDartDetected={onDartThrown} />
            </div>

            {/* Current Round Dart Slots */}
            <div className="flex justify-center gap-2.5 mt-2 mb-2 z-10 relative">
              {[0, 1, 2].map((i) => {
                const dart = dartsInRound[i];
                return (
                  <div
                    key={i}
                    className="w-[64px] h-[36px] flex items-center justify-center rounded-[12px] border border-line bg-panel shadow-sm font-sans font-black tracking-wide text-forest-deep text-[15px]"
                  >
                    {dart ? (
                      throwLabel(dart)
                    ) : (
                      <span className="text-muted/30 font-normal">-</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-line mt-auto bg-cream z-10 relative shadow-[0_-4px_10px_rgba(0, 0, 0, 0.02)]">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="
                  col-span-1 flex flex-col items-center justify-center gap-0.5
                  rounded-[14px] border border-line bg-panel
                  py-2 font-sans font-bold text-[9px] tracking-[2px] text-muted uppercase
                  hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-95 transition-all duration-100
                "
              >
                <Undo2 size={15} strokeWidth={2.5} className="mb-0.5" />
                <span>Undo</span>
              </button>
              <button
                onClick={onNextRound}
                className="
                  col-span-3 flex items-center justify-center
                  rounded-[14px] font-sans font-bold text-sm tracking-[2px] uppercase
                  bg-gold hover:bg-gold-deep
                  text-white py-2 shadow-[0_4px_14px_rgba(0, 0, 0, 0.3)]
                  active:scale-[0.98] transition-all duration-200
                "
              >
                NEXT ROUND →
              </button>
            </div>
          </div>
        ) : mode === "grid" ? (
          <TapGrid
            onDartThrown={onDartThrown}
            onUndo={onUndo}
            onNextRound={onNextRound}
            dartsInRound={dartsInRound}
            canUndo={canUndo}
            disabled={disabled}
            currentTarget={
              ["around_the_clock", "round_the_world"].includes(gameMode || "")
                ? currentTarget
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div
              ref={boardWrapRef}
              className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
            >
              <DartboardSVG
                onDartThrown={onDartThrown}
                thrownDarts={thrownDarts}
                disabled={disabled}
                isBust={isBust}
                size={boardSize}
              />
            </div>

            {/* Current Round Dart Slots */}
            <div className="flex justify-center gap-2.5 mt-1.5 mb-2 z-10 relative shrink-0">
              {[0, 1, 2].map((i) => {
                const dart = dartsInRound[i];
                return (
                  <div
                    key={i}
                    className="w-[64px] h-[36px] flex items-center justify-center rounded-[12px] border border-line bg-panel shadow-sm font-sans font-black tracking-wide text-forest-deep text-[15px]"
                  >
                    {dart ? (
                      throwLabel(dart)
                    ) : (
                      <span className="text-muted/30 font-normal">-</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer for dartboard mode too */}
            <div className="grid grid-cols-4 gap-2 px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-line mt-auto bg-cream z-10 relative shadow-[0_-4px_10px_rgba(0, 0, 0, 0.02)] shrink-0">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="
                  col-span-1 flex flex-col items-center justify-center gap-0.5
                  rounded-[14px] border border-line bg-panel
                  py-2 font-sans font-bold text-[9px] tracking-[2px] text-muted uppercase
                  hover:border-gold disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-95 transition-all duration-100
                "
              >
                <Undo2 size={15} strokeWidth={2.5} className="mb-0.5" />
                <span>Undo</span>
              </button>
              <button
                onClick={onNextRound}
                className="
                  col-span-3 flex items-center justify-center
                  rounded-[14px] font-sans font-bold text-sm tracking-[2px] uppercase
                  bg-gold hover:bg-gold-deep
                  text-white py-2 shadow-[0_4px_14px_rgba(0, 0, 0, 0.3)]
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
