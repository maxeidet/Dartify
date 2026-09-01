import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, LogOut, RotateCcw, Target, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { ScoringView } from '../components/scoring/ScoringView';
import { ScoreDisplay } from '../components/game/ScoreDisplay';
import { RoundHistory } from '../components/game/RoundHistory';
import { VoiceInputButton } from '../components/shared/VoiceInputButton';
import { getEngine } from '../core/gameModeRegistry';
import type { DartThrow } from '../core/types';
import bustSound from '../assets/bust.mp3';
import hitSound from '../assets/hit.mp3';

export function GamePage() {
  const navigate = useNavigate();
  const {
    gameState,
    scoringMode,
    isVoiceActive,
    throwDart,
    undoLastDart,
    nextRound,
    resetGame,
    setScoringMode,
    setVoiceActive,
  } = useGameStore();

  const [showHistory, setShowHistory] = useState(false);
  const [bustFlash, setBustFlash] = useState(false);
  const [winnerVisible, setWinnerVisible] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [historyDragOffset, setHistoryDragOffset] = useState(0);
  const [isHistoryDragging, setIsHistoryDragging] = useState(false);
  const historyDragStart = useRef<{ pointerId: number; y: number } | null>(null);
  const hitAudio = useRef<HTMLAudioElement | null>(null);
  const bustAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    hitAudio.current = new Audio(hitSound);
    bustAudio.current = new Audio(bustSound);

    return () => {
      hitAudio.current?.pause();
      bustAudio.current?.pause();
    };
  }, []);

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browsers can block sound until the player has interacted with the app.
    });
  };

  if (!gameState) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-cream bg-dart-texture px-6 py-7 text-ink">
        <div className="relative z-10 flex items-center gap-2">
          <span className="h-[2px] w-4 bg-gold-deep" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[2.4px] text-gold-deep">
            Match Centre
          </span>
        </div>
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center pb-12 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gold bg-panel shadow-[0_5px_16px_rgba(15,58,34,0.08)]">
            <Target size={38} strokeWidth={1.5} className="text-forest" />
          </div>
          <div className="w-full rounded-[20px] border border-line border-t-[3px] border-t-forest bg-panel px-6 py-7 shadow-[0_5px_18px_rgba(15,58,34,0.06)]">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[2.4px] text-gold-deep">Ready when you are</p>
            <h1 className="font-display text-3xl font-black text-forest-deep">No active game</h1>
            <p className="mx-auto mt-3 max-w-[240px] text-sm leading-6 text-muted">
              Start a match from the home screen to begin scoring.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 font-sans text-sm font-bold text-white shadow-[0_4px_14px_rgba(26,88,51,0.28)] transition-all hover:bg-forest-deep active:scale-[0.98]"
            >
              <House size={16} strokeWidth={2.2} />
              Go to home
            </button>
          </div>
        </main>
        <footer className="relative z-10 border-t border-line pt-4 text-center font-sans text-[10px] font-semibold uppercase tracking-[2px] text-muted">
          Scoreboard — V1.0
        </footer>
      </div>
    );
  }

  const engine = getEngine(gameState.gameMode);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const checkoutHint = engine.getCheckoutHint?.(gameState) ?? null;
  const canUndo = gameState.currentDartsInRound.length > 0 || gameState.roundHistory.length > 0;
  const startingScore = 'startingScore' in gameState.config ? gameState.config.startingScore : undefined;

  const handleDartThrown = (dart: DartThrow) => {
    throwDart(dart);

    const newState = useGameStore.getState().gameState;
    if (!newState || newState === gameState) return;

    if (newState.isCurrentRoundBust && !gameState.isCurrentRoundBust) {
      playSound(bustAudio.current);
    } else if (dart.segment !== 0) {
      playSound(hitAudio.current);
    }

    // Check if last entry was a bust (deferred)
    setTimeout(() => {
      const updatedState = useGameStore.getState().gameState;
      if (updatedState) {
        const lastEntry = updatedState.roundHistory.at(-1);
        if (lastEntry?.isBust) {
          setBustFlash(true);
          setTimeout(() => setBustFlash(false), 700);
        }
        if (updatedState.status === 'finished') {
          setWinnerVisible(true);
        }
      }
    }, 0);
  };

  const handleVoiceCommand = (cmd: { throw_: DartThrow }) => {
    handleDartThrown(cmd.throw_);
  };

  // Winner overlay
  if (winnerVisible && gameState.status === 'finished') {
    const winner = gameState.players.find((p) => p.participantId === gameState.winnerId);
    return (
      <div className="relative flex h-full flex-col overflow-hidden bg-cream bg-dart-texture px-6 py-7 text-ink">
        <div className="relative z-10 flex items-center gap-2">
          <span className="h-[2px] w-4 bg-gold-deep" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[2.4px] text-gold-deep">Match complete</span>
        </div>
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center pb-8 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-gold bg-panel text-gold-deep shadow-[0_5px_16px_rgba(15,58,34,0.08)]">
            <Trophy size={37} strokeWidth={1.5} />
          </div>
          <div className="w-full rounded-[20px] border border-line border-t-[3px] border-t-gold bg-panel px-6 py-7 shadow-[0_5px_18px_rgba(15,58,34,0.06)]">
            <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[2.4px] text-gold-deep">Winner</p>
            <h1 className="font-display text-4xl font-black text-forest-deep">{winner?.displayName ?? 'Player'}</h1>
            <p className="mt-3 text-sm text-muted">Finished in {winner?.dartsThrown ?? 0} darts thrown</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setWinnerVisible(false); resetGame(); navigate('/'); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-cream px-3 py-3 font-sans text-sm font-bold text-forest transition-colors hover:border-gold hover:bg-panel active:scale-[0.98]"
              >
                <House size={16} strokeWidth={2.2} />
                Home
              </button>
              <button
                onClick={() => {
                  setWinnerVisible(false);
                  // Rematch with the same players and rules.
                  const store = useGameStore.getState();
                  store.startLocalGame(
                    gameState.players.map((p, index) => ({
                      id: p.participantId,
                      type: 'local' as const,
                      displayName: p.displayName,
                      avatarUrl: p.avatarUrl,
                      displayOrder: index,
                    })),
                    gameState.config as any,
                  );
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-forest px-3 py-3 font-sans text-sm font-bold text-white shadow-[0_4px_14px_rgba(26,88,51,0.28)] transition-all hover:bg-forest-deep active:scale-[0.98]"
              >
                <RotateCcw size={16} strokeWidth={2.2} />
                Rematch
              </button>
            </div>
          </div>
        </main>
        <footer className="relative z-10 border-t border-line pt-4 text-center font-sans text-[10px] font-semibold uppercase tracking-[2px] text-muted">
          Scoreboard — V1.0
        </footer>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col h-full overflow-hidden bg-cream bg-dart-texture text-ink ${bustFlash ? 'bust-flash' : ''}`}
    >
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 border-b border-line bg-panel z-10 shadow-[0_2px_10px_rgba(15,58,34,0.04)]">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-muted hover:text-forest transition-colors text-sm font-display font-bold"
          aria-label="Exit game"
        >
          ← Exit
        </button>
        <div className="flex items-center gap-2">
          <span className="text-forest-deep font-display text-[11px] font-bold uppercase tracking-widest">
            {engine.displayName} · Rnd {gameState.currentRound}
          </span>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`
            text-[11px] font-display font-bold uppercase tracking-wider
            transition-colors
            ${showHistory ? 'text-gold-deep' : 'text-muted hover:text-forest'}
          `}
          aria-label="Toggle history"
          aria-expanded={showHistory}
        >
          📜 Log
        </button>
      </header>

      {/* ── Score cards ── */}
      <div className={`px-3 pt-2 ${gameState.players.length > 1 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
        {gameState.players.map((player, idx) => (
          <ScoreDisplay
            key={player.participantId}
            player={player}
            isCurrentPlayer={idx === gameState.currentPlayerIndex}
            checkoutHint={idx === gameState.currentPlayerIndex ? checkoutHint : null}
            dartsInRound={idx === gameState.currentPlayerIndex ? gameState.currentDartsInRound.length : 0}
            startingScore={startingScore}
            gameMode={gameState.gameMode}
            isBust={gameState.gameMode === 'x01' && idx === gameState.currentPlayerIndex && gameState.isCurrentRoundBust}
          />
        ))}
      </div>

      {/* ── Voice + History row ── */}
      <div className="flex items-center justify-between px-3 py-1.5 z-10 relative">
        <VoiceInputButton
          isActive={isVoiceActive}
          onToggle={() => setVoiceActive(!isVoiceActive)}
          onCommand={handleVoiceCommand}
        />
        {gameState.currentDartsInRound.length > 0 && (
          <div className="text-[11px] text-muted font-sans font-semibold tracking-wide uppercase">
            {gameState.currentDartsInRound.reduce((sum, d) => {
              const v = d.segment === 0 ? 0 : d.segment === 25 ? (d.multiplier === 2 ? 50 : 25) : d.segment * d.multiplier;
              return sum + v;
            }, 0)}{' '}
            this round
          </div>
        )}
      </div>

      {/* ── Scoring Grid / Dartboard ── */}
      <div className="flex-1 overflow-hidden">
          <ScoringView
          mode={scoringMode}
          onModeChange={setScoringMode}
          onDartThrown={handleDartThrown}
          onUndo={undoLastDart}
          onNextRound={nextRound}
          dartsInRound={gameState.currentDartsInRound}
          thrownDarts={gameState.currentDartsInRound}
          canUndo={canUndo}
            disabled={gameState.status === 'finished' || gameState.isCurrentRoundBust || gameState.currentDartsInRound.length >= 3}
            gameMode={gameState.gameMode}
            currentTarget={currentPlayer.score.currentTarget as DartThrow['segment'] | undefined}
            isBust={gameState.gameMode === 'x01' && gameState.isCurrentRoundBust}
          />
      </div>

      {showHistory && (
        <div
          className="absolute inset-0 z-20 flex items-end bg-forest-deep/30 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-log-title"
          onClick={() => setShowHistory(false)}
        >
          <section
            className={`ios-sheet w-full rounded-t-[28px] bg-panel shadow-[0_-12px_36px_rgba(15,58,34,0.2)] ${isHistoryDragging ? '' : 'transition-transform duration-200 ease-out'}`}
            onClick={(event) => event.stopPropagation()}
            style={isHistoryDragging ? { transform: `translateY(${historyDragOffset}px)` } : undefined}
          >
            <div
              className="flex h-9 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
              aria-label="Drag down to close score log"
              onPointerDown={(event) => {
                historyDragStart.current = { pointerId: event.pointerId, y: event.clientY };
                setIsHistoryDragging(true);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const drag = historyDragStart.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                setHistoryDragOffset(Math.max(0, Math.min(event.clientY - drag.y, 260)));
              }}
              onPointerUp={(event) => {
                const drag = historyDragStart.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                historyDragStart.current = null;
                setIsHistoryDragging(false);
                if (event.clientY - drag.y > 84) {
                  setShowHistory(false);
                }
                setHistoryDragOffset(0);
              }}
              onPointerCancel={() => {
                historyDragStart.current = null;
                setIsHistoryDragging(false);
                setHistoryDragOffset(0);
              }}
            >
              <div className="h-1.5 w-9 rounded-full bg-muted/35" />
            </div>
            <header className="flex items-center justify-between px-5 pb-4 pt-3">
              <div className="w-12" />
              <div className="text-center">
                <p className="font-sans text-[10px] font-bold uppercase tracking-[2.2px] text-gold-deep">Match history</p>
                <h2 id="match-log-title" className="mt-0.5 font-display text-xl font-black text-forest-deep">Score log</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="h-8 w-12 rounded-full bg-cream font-sans text-xs font-bold text-forest transition-colors hover:bg-line"
                aria-label="Close score log"
              >
                Done
              </button>
            </header>
            <div className="max-h-[62vh] overflow-y-auto border-y border-line">
              <RoundHistory
                history={gameState.roundHistory}
                players={gameState.players}
                maxRows={Math.max(gameState.roundHistory.length, 8)}
              />
            </div>
            <div className="pb-[max(16px,env(safe-area-inset-bottom))] pt-4 text-center font-sans text-[10px] font-semibold uppercase tracking-[1.8px] text-muted">
              {gameState.roundHistory.length} completed {gameState.roundHistory.length === 1 ? 'turn' : 'turns'}
            </div>
          </section>
        </div>
      )}

      {showExitConfirm && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-forest-deep/45 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-game-title"
        >
          <div className="w-full max-w-sm rounded-[20px] border border-line border-t-[3px] border-t-gold bg-panel p-6 text-center shadow-[0_16px_40px_rgba(15,58,34,0.24)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 text-forest">
              <LogOut size={25} strokeWidth={1.7} />
            </div>
            <p className="mt-4 font-sans text-[10px] font-bold uppercase tracking-[2.4px] text-gold-deep">Leave match</p>
            <h2 id="exit-game-title" className="mt-1 font-display text-2xl font-black text-forest-deep">Exit this game?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Your current match will be discarded and you’ll return home.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 font-sans text-sm font-bold text-forest transition-colors hover:border-gold hover:bg-panel active:scale-[0.98]"
              >
                Keep playing
              </button>
              <button
                onClick={() => { resetGame(); navigate('/'); }}
                className="flex-1 rounded-xl bg-forest px-4 py-3 font-sans text-sm font-bold text-white shadow-[0_4px_14px_rgba(26,88,51,0.28)] transition-all hover:bg-forest-deep active:scale-[0.98]"
              >
                Exit game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
