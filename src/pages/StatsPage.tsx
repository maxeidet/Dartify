import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHistoryStore, computeX01Avg, computeHighOut, computeBestLeg } from '../store/historyStore';
import type { GameSummary } from '../store/historyStore';
import { ChartPie, ChevronRight, History, Trash2, Trophy, Target, Flame } from 'lucide-react';
import { PlayerStatsModal } from '../components/game/PlayerStatsModal';
import { Avatar, Badge, ConfirmDialog, PageHeader, Segmented, ShellTitle, StatTile } from '../components/shared/SoftUI';
import { ModeIcon } from '../components/shared/ModeIcon';
import { ACCENTS, MODE_ACCENTS, MODE_NAMES } from '../components/shared/softTokens';

type ModeFilter = 'all' | 'x01' | 'around_the_clock' | 'round_the_world';

const FILTERS: readonly { value: ModeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'x01', label: 'X01' },
  { value: 'around_the_clock', label: 'Clock' },
  { value: 'round_the_world', label: 'World' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function GameCard({ game, onClick }: { game: GameSummary; onClick: () => void }) {
  const winner = game.players.find((p) => p.winner);
  const accent = ACCENTS[MODE_ACCENTS[game.gameMode] ?? 'mint'];

  return (
    <button
      onClick={onClick}
      className="soft-card soft-press w-full p-3 pr-4 flex flex-col gap-3 text-left"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 w-full">
        <span
          className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{ background: accent.tint, color: accent.ink }}
        >
          <ModeIcon mode={game.gameMode} size={19} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-semibold text-slate truncate">{MODE_NAMES[game.gameMode] ?? game.gameMode}</span>
          <span className="block text-[13px] font-medium text-subtle">
            {formatDate(game.date)} · {formatTime(game.date)}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2.2} className="text-subtle shrink-0" />
      </div>

      {/* Players */}
      <div className="flex flex-col gap-2 w-full pl-1">
        {game.players.map((p) => (
          <div key={p.participantId} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={p.displayName} size={26} />
              <span className={`truncate text-[15px] font-medium ${p.winner ? 'text-slate' : 'text-slate-soft'}`}>
                {p.displayName}
              </span>
              {p.winner && (
                <Badge accent="mint">
                  <Trophy size={12} strokeWidth={2.5} />
                  Winner
                </Badge>
              )}
            </div>
            <span className="text-[13px] text-subtle font-medium tabular-nums shrink-0">
              {p.dartsThrown} darts
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-line/70 pt-2.5 w-full pl-1 text-[13px] font-medium text-subtle tabular-nums">
        <span>{game.totalRounds} rounds</span>
        {winner && game.gameMode === 'x01' && <span>Won in {winner.dartsThrown} darts</span>}
      </div>
    </button>
  );
}

export function StatsPage() {
  const navigate = useNavigate();
  const { gameHistory, clearHistory } = useHistoryStore();
  const [filter, setFilter] = useState<ModeFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);

  const filtered = filter === 'all'
    ? gameHistory
    : gameHistory.filter((g) => g.gameMode === filter);

  const avg = computeX01Avg(filtered);
  const highOut = computeHighOut(filtered);
  const bestLeg = computeBestLeg(filtered);

  const totalDarts = filtered.reduce((sum, g) => sum + g.players.reduce((n, p) => n + p.dartsThrown, 0), 0);
  const headline =
    filtered.length === 0
      ? 'Nothing here yet.'
      : avg > 0
        ? `${filtered.length} ${filtered.length === 1 ? 'game' : 'games'}, averaging ${avg}.`
        : `${filtered.length} ${filtered.length === 1 ? 'game' : 'games'} played.`;

  return (
    <div className="flex flex-col h-dvh overflow-y-auto w-full bg-canvas font-sans text-slate pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="flex flex-col gap-4 px-4 pt-3 pb-8 max-w-md mx-auto w-full">

        <PageHeader
          title="Stats"
          onBack={() => navigate('/')}
          trailing={
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={gameHistory.length === 0}
              aria-label="Clear history"
              id="stats-clear-btn"
              className="w-11 h-11 rounded-full soft-float soft-press flex items-center justify-center text-slate-soft disabled:opacity-40"
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </button>
          }
        />

        <Segmented ariaLabel="Game mode" value={filter} onChange={setFilter} options={FILTERS} />

        {/* Summary */}
        <section className="soft-shell p-2 soft-rise">
          <div className="px-4 pt-4 pb-5">
            <ShellTitle icon={ChartPie}>Overview</ShellTitle>
            <p className="mt-5 text-[26px] leading-[1.18] font-semibold tracking-display text-slate">{headline}</p>
            {filtered.length > 0 && (
              <p className="mt-1.5 text-[15px] font-medium text-subtle">
                {totalDarts.toLocaleString('en-GB')} darts thrown
              </p>
            )}
          </div>
          <div className="soft-card grid grid-cols-3 p-2">
            <StatTile icon={Target} accent="mint" value={avg} label="3-dart avg" />
            <StatTile icon={Trophy} accent="azure" value={highOut} label="High out" divider />
            <StatTile icon={Flame} accent="coral" value={bestLeg} label="Best leg" divider />
          </div>
        </section>

        {/* Game list */}
        <section className="soft-shell p-2 soft-rise" style={{ animationDelay: '60ms' }}>
          <div className="px-4 pt-4 pb-4">
            <ShellTitle
              icon={History}
              trailing={<span className="text-[15px] font-medium text-subtle tabular-nums">{filtered.length}</span>}
            >
              Games
            </ShellTitle>
          </div>

          {filtered.length === 0 ? (
            <div className="soft-card flex flex-col items-center justify-center py-12 px-6 text-center">
              <span className="w-14 h-14 rounded-[18px] bg-track flex items-center justify-center text-subtle">
                <Target size={24} strokeWidth={2} />
              </span>
              <p className="mt-4 text-[17px] font-semibold text-slate">No games yet</p>
              <p className="mt-1 text-[14px] text-subtle">Finish a match to see it here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((game) => (
                <GameCard
                  key={game.matchId}
                  game={game}
                  onClick={() => setSelectedGame(game)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showClearConfirm && (
        <ConfirmDialog
          icon={Trash2}
          title="Clear history?"
          message="This permanently deletes every game in your history. It can't be undone."
          cancelLabel="Cancel"
          confirmLabel="Clear all"
          destructive
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={() => { clearHistory(); setShowClearConfirm(false); }}
        />
      )}

      {/* Player Stats Modal */}
      {selectedGame && (
        <PlayerStatsModal
          game={selectedGame}
          initialPlayerId={selectedGame.players[0].participantId}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}
