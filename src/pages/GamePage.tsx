import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, LogOut, RotateCcw, ScrollText, Target, Trophy, Users, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useLobbyStore } from '../store/lobbyStore';
import { useAuthStore } from '../store/authStore';
import { ScoringView } from '../components/scoring/ScoringView';
import { ScoreDisplay } from '../components/game/ScoreDisplay';
import { RoundHistory } from '../components/game/RoundHistory';
import { getEngine } from '../core/gameModeRegistry';
import { ConfirmDialog } from '../components/shared/SoftUI';
import { ACCENTS, SLOT_ACCENTS } from '../components/shared/softTokens';
import type { DartThrow } from '../core/types';
import bustSound from '../assets/bust.mp3';
import hitSound from '../assets/hit.mp3';

export function GamePage() {
  const navigate = useNavigate();
  const {
    gameState,
    scoringMode,
    throwDart,
    undoLastDart,
    nextRound,
    resetGame,
    setScoringMode,
    isOnlineMatch,
    myControlledParticipantIds,
    lobbyId,
    matchId,
  } = useGameStore();
  const userId = useAuthStore(s => s.user?.id);
  const lobby = useLobbyStore(s => s.lobby);

  const [showHistory, setShowHistory] = useState(false);
  const [bustFlash, setBustFlash] = useState(false);
  const [startingRematch, setStartingRematch] = useState(false);
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

  const isFinished = gameState?.status === 'finished';

  // Once an online match ends: release the lobby (so it no longer drops people back into this
  // match) and watch it, so everyone follows the leader into a rematch.
  useEffect(() => {
    if (!isOnlineMatch || !isFinished || !lobbyId || !matchId) return;
    const lobbyStore = useLobbyStore.getState();
    lobbyStore.markMatchFinished(lobbyId, matchId);
    lobbyStore.loadLobby(lobbyId);
    lobbyStore.subscribe(lobbyId);
    return () => useLobbyStore.getState().unsubscribe();
  }, [isOnlineMatch, isFinished, lobbyId, matchId]);

  useEffect(() => {
    if (!isOnlineMatch || !isFinished || !lobby || lobby.id !== lobbyId) return;
    if (lobby.status !== 'in_progress' || !lobby.active_match_id || lobby.active_match_id === matchId) return;
    useLobbyStore.getState().joinActiveMatch();
  }, [isOnlineMatch, isFinished, lobby, lobbyId, matchId]);

  const playSound = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browsers can block sound until the player has interacted with the app.
    });
  };

  if (!gameState) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-canvas px-4 text-slate">
        <section className="soft-shell w-full p-2 soft-rise">
          <div className="soft-card px-6 pt-8 pb-6 text-center">
            <span className="mx-auto w-16 h-16 rounded-[20px] bg-track flex items-center justify-center text-slate-soft">
              <Target size={28} strokeWidth={2} />
            </span>
            <h1 className="mt-5 text-[26px] font-semibold tracking-display">No active game</h1>
            <p className="mx-auto mt-2 max-w-[260px] text-[15px] leading-relaxed text-subtle">
              Start a match from the home screen to begin scoring.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-2 w-full h-[56px] rounded-full soft-primary soft-press flex items-center justify-center gap-2 text-[17px] font-semibold"
          >
            <House size={18} strokeWidth={2.3} />
            Go to home
          </button>
        </section>
      </div>
    );
  }

  const engine = getEngine(gameState.gameMode);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const checkoutHint = engine.getCheckoutHint?.(gameState) ?? null;
  const canUndo = gameState.currentDartsInRound.length > 0 || gameState.roundHistory.length > 0;
  const startingScore = 'startingScore' in gameState.config ? gameState.config.startingScore : undefined;
  const isMyTurn = !isOnlineMatch || myControlledParticipantIds.includes(currentPlayer.participantId);
  const showLegs = gameState.gameMode === 'x01' && 'legs' in gameState.config && gameState.config.legs > 1;

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
      }
    }, 0);
  };

  // Winner overlay
  if (gameState.status === 'finished') {
    const lobbyReady = !!lobby && lobby.id === lobbyId;
    const isHost = lobbyReady && lobby.host_id === userId;
    const winner = gameState.players.find((p) => p.participantId === gameState.winnerId);
    const winnerIndex = gameState.players.findIndex((p) => p.participantId === gameState.winnerId);
    const winnerAccent = ACCENTS[SLOT_ACCENTS[Math.max(0, winnerIndex) % SLOT_ACCENTS.length]];
    return (
      <div className="flex h-full flex-col items-center justify-center bg-canvas px-4 text-slate">
        <section className="soft-shell w-full p-2 soft-rise">
          <div className="soft-card px-6 pt-8 pb-6 text-center">
            <span
              className="mx-auto w-16 h-16 rounded-[20px] flex items-center justify-center"
              style={{ background: winnerAccent.tint, color: winnerAccent.ink }}
            >
              <Trophy size={28} strokeWidth={2} />
            </span>
            <p className="mt-5 text-[15px] font-medium text-subtle">Match complete</p>
            <h1 className="mt-1 text-[34px] leading-tight font-semibold tracking-display truncate">
              {winner?.displayName ?? 'Player'} wins.
            </h1>
            <p className="mt-2 text-[15px] text-subtle tabular-nums">Finished in {winner?.dartsThrown ?? 0} darts</p>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => { setScoringMode('grid'); resetGame(); navigate('/'); }}
              className="flex-1 h-[56px] rounded-full soft-float soft-press flex items-center justify-center gap-2 text-[16px] font-semibold text-slate"
            >
              <House size={18} strokeWidth={2.3} />
              Home
            </button>
            {isOnlineMatch ? (
              <button
                onClick={() => { setScoringMode('grid'); const lobby = lobbyId; resetGame(); navigate(lobby ? `/lobby/${lobby}` : '/'); }}
                className="flex-1 h-[56px] rounded-full soft-float soft-press flex items-center justify-center gap-2 text-[16px] font-semibold text-slate"
              >
                <Users size={18} strokeWidth={2.3} />
                Lobby
              </button>
            ) : (
              <button
                onClick={() => {
                  setScoringMode('grid');
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
                className="flex-1 h-[56px] rounded-full soft-primary soft-press flex items-center justify-center gap-2 text-[16px] font-semibold"
              >
                <RotateCcw size={18} strokeWidth={2.3} />
                Rematch
              </button>
            )}
          </div>
          {isOnlineMatch && (
            isHost ? (
              <button
                onClick={async () => {
                  setStartingRematch(true);
                  setScoringMode('grid');
                  // Same lobby, players and rules — everyone else follows via the lobby subscription.
                  await useLobbyStore.getState().startMatch();
                  setStartingRematch(false);
                }}
                disabled={startingRematch || !lobbyReady}
                className="mt-2 w-full h-[56px] rounded-full soft-primary soft-press flex items-center justify-center gap-2 text-[16px] font-semibold"
              >
                <RotateCcw size={18} strokeWidth={2.3} />
                {startingRematch ? 'Starting…' : 'Rematch'}
              </button>
            ) : (
              <div className="mt-2 w-full h-[56px] rounded-full soft-float flex items-center justify-center text-[15px] font-semibold text-subtle">
                Waiting for the leader to rematch…
              </div>
            )
          )}
        </section>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col h-full min-h-0 overflow-hidden bg-canvas text-slate ${bustFlash ? 'bust-flash' : ''}`}
    >
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between gap-3 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-1.5 z-10">
        <button
          onClick={() => setShowExitConfirm(true)}
          className="w-9 h-9 rounded-full soft-float soft-press flex items-center justify-center text-slate-soft"
          aria-label="Exit game"
        >
          <X size={18} strokeWidth={2.4} />
        </button>
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-[15px] font-semibold text-slate truncate">{engine.displayName}</span>
          <span className="text-[14px] font-medium text-subtle tabular-nums shrink-0">· Round {gameState.currentRound}</span>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`w-9 h-9 rounded-full soft-press flex items-center justify-center transition-colors ${showHistory ? 'soft-primary' : 'soft-float text-slate-soft'}`}
          aria-label="Toggle history"
          aria-expanded={showHistory}
        >
          <ScrollText size={17} strokeWidth={2.2} />
        </button>
      </header>

      {/* ── Score cards ── */}
      {gameState.players.length >= 3 ? (
        <div className="flex gap-2 px-3 pt-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory">
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
              accent={SLOT_ACCENTS[idx % SLOT_ACCENTS.length]}
              showLegs={showLegs}
              compact
            />
          ))}
        </div>
      ) : (
        <div className={`px-3 pt-1.5 ${gameState.players.length > 1 ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
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
              accent={SLOT_ACCENTS[idx % SLOT_ACCENTS.length]}
              showLegs={showLegs}
            />
          ))}
        </div>
      )}

      {/* ── Round total row ── */}
      <div className="flex items-center justify-center px-3 py-0.5 z-10 relative">
        {isOnlineMatch && !isMyTurn ? (
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-subtle">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-azure animate-ping opacity-60" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-azure-ink" />
            </span>
            Waiting for {currentPlayer.displayName} to throw…
          </div>
        ) : (
          <div
            className={`text-[12px] text-subtle font-medium tabular-nums ${gameState.currentDartsInRound.length > 0 ? '' : 'invisible'
              }`}
          >
            {gameState.currentDartsInRound.reduce((sum, d) => {
              const v = d.segment === 0 ? 0 : d.segment === 25 ? (d.multiplier === 2 ? 50 : 25) : d.segment * d.multiplier;
              return sum + v;
            }, 0)}{' '}
            this round
          </div>
        )}
      </div>

      {/* ── Scoring Grid / Dartboard ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScoringView
          mode={scoringMode}
          onModeChange={setScoringMode}
          onDartThrown={handleDartThrown}
          onUndo={undoLastDart}
          onNextRound={nextRound}
          dartsInRound={gameState.currentDartsInRound}
          thrownDarts={gameState.currentDartsInRound}
          canAdvance={isMyTurn}
          canUndo={canUndo && isMyTurn}
          disabled={gameState.isCurrentRoundBust || gameState.currentDartsInRound.length >= 3 || (isOnlineMatch && !isMyTurn)}
          gameMode={gameState.gameMode}
          currentTarget={currentPlayer.score.currentTarget as DartThrow['segment'] | undefined}
          isBust={gameState.gameMode === 'x01' && gameState.isCurrentRoundBust}
        />
      </div>

      {showHistory && (
        <div
          className="absolute inset-0 z-20 flex items-end bg-[rgba(20,24,32,0.32)] backdrop-blur-[6px] soft-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-log-title"
          onClick={() => setShowHistory(false)}
        >
          <section
            className={`ios-sheet w-full rounded-t-[32px] bg-shell shadow-[0_-12px_40px_rgba(20,24,32,0.18)] ${isHistoryDragging ? '' : 'transition-transform duration-200 ease-out'}`}
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
              <span className="w-9 h-[5px] rounded-full bg-[#D5D6DA]" />
            </div>
            <header className="flex items-center justify-between px-6 pb-4 pt-1">
              <div className="flex items-center gap-2.5 text-slate-soft">
                <ScrollText size={20} strokeWidth={2.2} />
                <h2 id="match-log-title" className="text-[21px] font-semibold tracking-display leading-none">Score log</h2>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="h-9 px-4 rounded-full soft-float soft-press text-[14px] font-semibold text-slate"
                aria-label="Close score log"
              >
                Done
              </button>
            </header>
            <div className="mx-4 max-h-[62vh] overflow-y-auto soft-card">
              <RoundHistory
                history={gameState.roundHistory}
                players={gameState.players}
                maxRows={Math.max(gameState.roundHistory.length, 8)}
              />
            </div>
            <div className="pb-[max(16px,env(safe-area-inset-bottom))] pt-3 text-center text-[13px] font-medium text-subtle tabular-nums">
              {gameState.roundHistory.length} completed {gameState.roundHistory.length === 1 ? 'turn' : 'turns'}
            </div>
          </section>
        </div>
      )}

      {showExitConfirm && (
        <ConfirmDialog
          icon={LogOut}
          title="Exit this game?"
          message={
            isOnlineMatch
              ? "You'll stop seeing live updates, but the match continues for the other players."
              : "Your current match will be discarded and you'll return home."
          }
          cancelLabel="Keep playing"
          confirmLabel="Exit game"
          destructive
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={() => { setScoringMode('grid'); resetGame(); navigate('/'); }}
        />
      )}
    </div>
  );
}
