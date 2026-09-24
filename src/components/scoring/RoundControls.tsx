import { ArrowRight, Undo2 } from 'lucide-react';
import type { DartThrow } from '../../core/types';
import { throwLabel } from '../../core/types';

/** The three dart slots for the current visit */
export function DartSlots({ darts, className = '' }: { darts: DartThrow[]; className?: string }) {
  return (
    <div className={`flex justify-center gap-2 ${className}`}>
      {[0, 1, 2].map((i) => {
        const dart = darts[i];
        return (
          <div
            key={i}
            className={`w-[64px] h-[36px] flex items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition-all duration-200 ${
              dart ? 'soft-float text-slate' : 'bg-white/55 text-subtle shadow-[inset_0_0_0_1px_rgba(20,24,32,0.05)]'
            }`}
          >
            {dart ? throwLabel(dart) : '–'}
          </div>
        );
      })}
    </div>
  );
}

/** Undo + Next round, pinned to the bottom of every scoring mode */
export function RoundFooter({ onUndo, onNextRound, canUndo, className = '' }: {
  onUndo: () => void;
  onNextRound: () => void;
  canUndo: boolean;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-4 gap-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] bg-canvas z-10 relative shrink-0 ${className}`}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="col-span-1 h-[46px] rounded-full soft-float soft-press flex items-center justify-center gap-1.5 text-[14px] font-semibold text-slate-soft disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Undo last dart"
      >
        <Undo2 size={16} strokeWidth={2.4} />
        <span className="max-[360px]:hidden">Undo</span>
      </button>
      <button
        onClick={onNextRound}
        className="col-span-3 h-[46px] rounded-full soft-primary soft-press flex items-center justify-center gap-2 text-[16px] font-semibold"
        aria-label="Next round"
      >
        Next round
        <ArrowRight size={18} strokeWidth={2.4} />
      </button>
    </div>
  );
}
