import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHistoryStore, computeX01Avg, computeHighOut, computeBestLeg } from '../store/historyStore';
import type { GameSummary } from '../store/historyStore';

type ModeFilter = 'all' | 'x01' | 'around_the_clock' | 'round_the_world';

const MODE_LABELS: Record<string, string> = {
  x01: 'X01',
  around_the_clock: 'Around Clock',
  round_the_world: 'Round World',
};

const FILTERS: { value: ModeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'x01', label: 'X01' },
  { value: 'around_the_clock', label: 'Around Clock' },
  { value: 'round_the_world', label: 'Round World' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function GameCard({ game }: { game: GameSummary }) {
  const winner = game.players.find((p) => p.winner);
  const modeLabel = MODE_LABELS[game.gameMode] ?? game.gameMode;

  return (
    <div className="bg-panel border border-line rounded-[18px] p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forest/10 border border-forest/20 text-forest-deep font-sans font-bold text-[10px] tracking-[1.4px] uppercase">
          {modeLabel}
        </span>
        <span className="text-[10px] font-medium text-muted">
          {formatDate(game.date)} · {formatTime(game.date)}
        </span>
      </div>

      {/* Players */}
      <div className="flex flex-col gap-1.5">
        {game.players.map((p) => (
          <div key={p.participantId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${p.winner ? 'bg-forest text-white' : 'bg-line text-muted'}`}>
                {p.displayName.charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs font-bold ${p.winner ? 'text-forest-deep' : 'text-muted'}`}>
                {p.displayName}
                {p.winner && <span className="ml-1.5 text-[9px] text-gold-deep font-bold uppercase tracking-[1px]">Winner</span>}
              </span>
            </div>
            <span className="text-[10px] text-muted font-medium tabular-nums">
              {p.dartsThrown} darts
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-[10px] text-muted font-medium">
          {game.totalRounds} rounds
        </span>
        {winner && game.gameMode === 'x01' && (
          <span className="text-[10px] text-muted font-medium">
            Won in {winner.dartsThrown} darts
          </span>
        )}
      </div>
    </div>
  );
}

export function StatsPage() {
  const navigate = useNavigate();
  const { gameHistory, clearHistory } = useHistoryStore();
  const [filter, setFilter] = useState<ModeFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = filter === 'all'
    ? gameHistory
    : gameHistory.filter((g) => g.gameMode === filter);

  const avg = computeX01Avg(filtered);
  const highOut = computeHighOut(filtered);
  const bestLeg = computeBestLeg(filtered);

  return (
    <div className="flex flex-col h-screen overflow-y-auto w-full bg-cream bg-dart-texture font-sans text-ink pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="relative px-[22px] pt-[18px] pb-8 z-10 flex flex-col flex-1 max-w-md mx-auto w-full gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-muted hover:text-forest transition-colors font-display font-bold text-sm"
            id="stats-back-btn"
          >
            ← Back
          </button>
          <span className="font-sans text-[11px] font-bold tracking-[2.6px] text-forest-deep uppercase">
            Stats
          </span>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-[10px] text-muted hover:text-red-400 transition-colors font-medium"
            id="stats-clear-btn"
          >
            Clear
          </button>
        </div>

        {/* Mode filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              id={`filter-${f.value}`}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full border font-sans font-bold text-[10px] tracking-[1.2px] uppercase transition-all ${
                filter === f.value
                  ? 'bg-forest border-forest text-white'
                  : 'bg-panel border-line text-muted hover:border-gold'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="bg-panel border border-line rounded-[18px] p-[18px_16px_16px] flex">
          <div className="flex-1 px-1.5">
            <div className="font-sans font-extrabold text-[24px] text-forest tabular-nums">
              {avg > 0 ? avg : '—'}
            </div>
            <div className="mt-1.5 text-[9px] font-bold tracking-[1.6px] text-muted uppercase">Avg (X01)</div>
          </div>
          <div className="flex-1 px-1.5 border-l border-line">
            <div className="font-sans font-extrabold text-[24px] text-gold-deep tabular-nums">
              {highOut > 0 ? highOut : '—'}
            </div>
            <div className="mt-1.5 text-[9px] font-bold tracking-[1.6px] text-muted uppercase">High Out</div>
          </div>
          <div className="flex-1 px-1.5 border-l border-line">
            <div className="font-sans font-extrabold text-[24px] text-forest tabular-nums">
              {bestLeg !== null ? bestLeg : '—'}
            </div>
            <div className="mt-1.5 text-[9px] font-bold tracking-[1.6px] text-muted uppercase">Best Leg</div>
          </div>
        </div>

        {/* Game list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[14px] h-[2px] bg-gold-deep" />
            <span className="font-sans text-[11px] font-bold tracking-[2.6px] text-forest-deep uppercase">
              {filtered.length} {filtered.length === 1 ? 'Game' : 'Games'}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full border border-line bg-panel flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-muted">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3v18M3 12h18" />
                </svg>
              </div>
              <p className="text-sm font-bold text-muted">No games yet</p>
              <p className="text-xs text-muted/70 mt-1">Play a game to see your history here</p>
            </div>
          ) : (
            filtered.map((game) => (
              <GameCard key={game.matchId} game={game} />
            ))
          )}
        </div>
      </div>

      {/* Clear confirm dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-panel border border-line rounded-[22px] p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-display font-black text-xl text-forest-deep mb-2">Clear History?</h2>
            <p className="text-sm text-muted mb-6">This will permanently delete all your game history. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-line bg-cream font-sans font-bold text-sm text-forest transition-colors hover:border-gold"
                id="stats-clear-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearHistory(); setShowClearConfirm(false); }}
                className="flex-1 py-3 rounded-xl bg-red-600 font-sans font-bold text-sm text-white transition-colors hover:bg-red-700"
                id="stats-clear-confirm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
