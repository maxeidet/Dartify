import { useEffect, useRef, useState } from "react";
import { TapGrid } from "./TapGrid";
import { DartboardSVG } from "./DartboardSVG";
import type { DartThrow, Segment } from "../../core/types";
import type { ScoringMode } from "../../store/gameStore";
import { CameraScorer } from "../game/CameraScorer";
import { Segmented } from "../shared/SoftUI";
import { DartSlots, RoundFooter } from "./RoundControls";

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
  canAdvance: boolean;
  disabled?: boolean;
  gameMode?: string;
  currentTarget?: Segment;
  isBust?: boolean;
}

export function ScoringView({
  mode,
  onModeChange,
  onDartThrown,
  canAdvance,
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
      <div className="mx-3 mt-1 mb-1 z-10 relative shrink-0">
        <Segmented
          size="sm"
          ariaLabel="Scoring input"
          value={mode === "dartboard" ? "dartboard" : "grid"}
          onChange={onModeChange}
          options={[
            { value: "grid", label: "Quick tap" },
            { value: "dartboard", label: "Dartboard" },
          ]}
        />
      </div>

      {/* Scoring Panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === "camera" ? (
          <div className="flex flex-col h-full overflow-y-auto pt-2 px-2 pb-0">
            <div className="flex-1">
              <CameraScorer onDartDetected={onDartThrown} />
            </div>

            {/* Current Round Dart Slots */}
            <DartSlots darts={dartsInRound} className="mt-2 mb-2 z-10 relative shrink-0" />

            <RoundFooter canAdvance={canAdvance} onUndo={onUndo} onNextRound={onNextRound} canUndo={canUndo} className="mt-auto" />
          </div>
        ) : mode === "grid" ? (
          <TapGrid
            onDartThrown={onDartThrown}
            onUndo={onUndo}
            onNextRound={onNextRound}
            dartsInRound={dartsInRound}
            canUndo={canUndo}
            canAdvance={canAdvance}
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
            <DartSlots darts={dartsInRound} className="mt-1.5 mb-2 z-10 relative shrink-0" />

            <RoundFooter canAdvance={canAdvance} onUndo={onUndo} onNextRound={onNextRound} canUndo={canUndo} className="px-3 mt-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
