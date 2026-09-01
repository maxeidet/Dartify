// ============================================================
// Zustand Game Store
// Wraps the pure game engine, adds persistence + Supabase sync
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, DartThrow, GameConfig, Participant } from '../core/types';
import { getEngine } from '../core/gameModeRegistry';
import { createX01Game } from '../core/x01Engine';
import { createAroundTheClockGame } from '../core/aroundTheClockEngine';
import { createRoundTheWorldGame } from '../core/roundTheWorldEngine';
import type { X01Config, AroundTheClockConfig, RoundTheWorldConfig } from '../core/types';
import { supabase, isOnlineModeAvailable } from '../lib/supabase';
import { useHistoryStore } from './historyStore';
import type { GameSummary } from './historyStore';

// ─────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────

export type ScoringMode = 'grid' | 'dartboard';

interface GameStore {
  // Current game state (null when not in a match)
  gameState: GameState | null;

  // UI state
  scoringMode: ScoringMode;
  isVoiceActive: boolean;

  // Online match context (null for local games)
  matchId: string | null;
  isOnlineMatch: boolean;

  // Actions
  startLocalGame: (participants: Participant[], config: GameConfig) => void;
  throwDart: (dart: DartThrow) => void;
  undoLastDart: () => void;
  nextRound: () => void;
  resetGame: () => void;
  setScoringMode: (mode: ScoringMode) => void;
  setVoiceActive: (active: boolean) => void;
}

// ─────────────────────────────────────────────
// Supabase sync helper
// ─────────────────────────────────────────────

async function syncThrowToSupabase(
  matchId: string,
  participantId: string,
  roundNumber: number,
  dartNumber: number,
  dart: DartThrow,
  isBust: boolean,
  scoreValue: number,
): Promise<void> {
  if (!isOnlineModeAvailable) return;

  const { segment, multiplier } = dart;
  await supabase.from('throws').insert({
    match_id: matchId,
    participant_id: participantId,
    round_number: roundNumber,
    dart_number: dartNumber,
    segment,
    multiplier,
    score_value: scoreValue,
    is_bust: isBust,
  });
}

async function syncMatchFinishedToSupabase(
  matchId: string,
  winnerId: string,
): Promise<void> {
  if (!isOnlineModeAvailable) return;

  await supabase
    .from('matches')
    .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
    .eq('id', matchId);
}

// ─────────────────────────────────────────────
// History helper
// ─────────────────────────────────────────────

function recordFinishedGame(state: GameState): void {
  const summary: GameSummary = {
    matchId: state.matchId,
    gameMode: state.gameMode,
    date: new Date().toISOString(),
    config: state.config,
    players: state.players.map((p) => ({
      participantId: p.participantId,
      displayName: p.displayName,
      dartsThrown: p.dartsThrown,
      winner: p.participantId === state.winnerId,
      finalScore: { ...p.score },
    })),
    roundHistory: state.roundHistory,
    totalRounds: state.currentRound,
  };
  useHistoryStore.getState().addGame(summary);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: null,
      scoringMode: 'grid',
      isVoiceActive: false,
      matchId: null,
      isOnlineMatch: false,

      startLocalGame: (participants, config) => {
        const matchId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).substring(2);

        let gameState: GameState;
        if (config.mode === 'x01') {
          gameState = createX01Game(matchId, participants, config as X01Config);
        } else if (config.mode === 'around_the_clock') {
          gameState = createAroundTheClockGame(matchId, participants, config as AroundTheClockConfig);
        } else if (config.mode === 'round_the_world') {
          gameState = createRoundTheWorldGame(matchId, participants, config as RoundTheWorldConfig);
        } else {
          throw new Error(`Unsupported game mode: ${config.mode}`);
        }

        set({ gameState, matchId, isOnlineMatch: false });
      },

      throwDart: (dart) => {
        const { gameState, matchId, isOnlineMatch } = get();
        if (!gameState || gameState.status !== 'ongoing') return;

        const engine = getEngine(gameState.gameMode);
        const player = gameState.players[gameState.currentPlayerIndex];
        const dartNumber = gameState.currentDartsInRound.length + 1;
        const roundNumber = gameState.currentRound;

        const newState = engine.applyThrow(gameState, dart);

        set({ gameState: newState });

        // Record finished game to local history
        if (newState.status === 'finished') {
          recordFinishedGame(newState);
        }

        // Sync to Supabase if online
        if (isOnlineMatch && matchId) {
          const scoreValue =
            dart.segment === 0 ? 0 :
              dart.segment === 25 ? (dart.multiplier === 2 ? 50 : 25) :
                dart.segment * dart.multiplier;

          const wasBust = newState.roundHistory.at(-1)?.isBust ?? false;

          syncThrowToSupabase(
            matchId,
            player.participantId,
            roundNumber,
            dartNumber,
            dart,
            wasBust,
            scoreValue,
          ).catch(console.error);

          if (newState.status === 'finished' && newState.winnerId) {
            syncMatchFinishedToSupabase(matchId, newState.winnerId).catch(console.error);
          }
        }
      },

      undoLastDart: () => {
        const { gameState, matchId, isOnlineMatch } = get();
        if (!gameState) return;

        const engine = getEngine(gameState.gameMode);
        const wasFinished = gameState.status === 'finished';
        let newState = { ...gameState };
        let deletedDartNumber: number;
        let deletedRoundNumber: number;
        let deletedParticipantId: string;

        if (newState.currentDartsInRound.length > 0) {
          deletedParticipantId = newState.players[newState.currentPlayerIndex].participantId;
          deletedRoundNumber = newState.currentRound;
          deletedDartNumber = newState.currentDartsInRound.length;
          newState.currentDartsInRound = newState.currentDartsInRound.slice(0, -1);
        } else {
          if (newState.roundHistory.length === 0) return; // Nothing to undo

          const lastRound = newState.roundHistory[newState.roundHistory.length - 1];
          const previousPlayerIndex = newState.players.findIndex(p => p.participantId === lastRound.participantId);
          if (previousPlayerIndex === -1) return;

          newState.roundHistory = newState.roundHistory.slice(0, -1);
          newState.currentPlayerIndex = previousPlayerIndex;
          newState.currentRound = lastRound.roundNumber;
          newState.currentDartsInRound = lastRound.throws.slice(0, lastRound.actualThrows);
          newState.status = 'ongoing';
          newState.winnerId = undefined;

          deletedParticipantId = lastRound.participantId;
          deletedRoundNumber = lastRound.roundNumber;
          deletedDartNumber = newState.currentDartsInRound.length;

          if (newState.currentDartsInRound.length > 0) {
            newState.currentDartsInRound = newState.currentDartsInRound.slice(0, -1);
          }
        }

        // Now mathematically rebuild the current player's state from the beginning of the round
        const currentPlayer = newState.players[newState.currentPlayerIndex];
        const previousRounds = newState.roundHistory.filter(r => r.participantId === currentPlayer.participantId);
        const lastRoundForPlayer = previousRounds[previousRounds.length - 1];

        const startScore = lastRoundForPlayer
          ? { ...lastRoundForPlayer.snapshot }
          : { ...engine.initPlayerScore(newState.config) };

        const startDartsThrown = previousRounds.reduce((sum, r) => sum + r.throws.length, 0);

        const rebuiltPlayer: GameState['players'][number] = {
          ...currentPlayer,
          score: startScore,
          dartsThrown: startDartsThrown,
        };

        newState.players = newState.players.map((p, i) => i === newState.currentPlayerIndex ? rebuiltPlayer : p);

        const dartsToReapply = newState.currentDartsInRound;
        newState.currentDartsInRound = [];
        newState.isCurrentRoundBust = false;

        // Replay the round's remaining darts through the engine so it applies to ANY game mode seamlessly
        for (const dart of dartsToReapply) {
          newState = engine.applyThrow(newState, dart);
        }

        set({ gameState: newState });

        // Delete from Supabase
        if (isOnlineMatch && matchId && isOnlineModeAvailable) {
          supabase
            .from('throws')
            .delete()
            .match({
              match_id: matchId,
              participant_id: deletedParticipantId,
              round_number: deletedRoundNumber,
              dart_number: deletedDartNumber,
            })
            .then(({ error }) => {
              if (error) console.error('Undo sync error:', error);
            });

          if (wasFinished) {
            void (async () => { const { error } = await supabase.from('matches').update({ status: 'ongoing', winner_id: null }).eq('id', matchId); if (error) console.error(error); })();
          }
        }
      },

      nextRound: () => {
        const { gameState } = get();
        if (!gameState || gameState.status !== 'ongoing') return;

        const engine = getEngine(gameState.gameMode);
        const newState = engine.advanceRound(gameState);
        set({ gameState: newState });

        // Record finished game to local history
        if (newState.status === 'finished') {
          recordFinishedGame(newState);
        }
      },

      resetGame: () => {
        set({ gameState: null, matchId: null, isOnlineMatch: false });
      },

      setScoringMode: (mode) => set({ scoringMode: mode }),
      setVoiceActive: (active) => set({ isVoiceActive: active }),
    }),
    {
      name: 'dart-game-storage',
      // Only persist the game state itself, not online IDs
      partialize: (state) => ({
        gameState: state.gameState,
        scoringMode: state.scoringMode,
      }),
    },
  ),
);
