// ============================================================
// Zustand Game Store
// Wraps the pure game engine, adds persistence + Supabase sync
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, DartThrow, GameConfig, Participant } from '../core/types';
import { throwScore } from '../core/types';
import { getEngine } from '../core/gameModeRegistry';
import { createX01Game } from '../core/x01Engine';
import { createAroundTheClockGame } from '../core/aroundTheClockEngine';
import { createRoundTheWorldGame } from '../core/roundTheWorldEngine';
import type { X01Config, AroundTheClockConfig, RoundTheWorldConfig } from '../core/types';
import { supabase, isOnlineModeAvailable } from '../lib/supabase';

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
// Store
// ─────────────────────────────────────────────

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

        // If no darts in current round, we need to cross-round undo
        if (gameState.currentDartsInRound.length === 0) {
          if (gameState.roundHistory.length === 0) return; // Nothing to undo

          const lastRound = gameState.roundHistory[gameState.roundHistory.length - 1];
          const previousPlayerIndex = gameState.players.findIndex(p => p.participantId === lastRound.participantId);
          if (previousPlayerIndex === -1) return;

          set({
            gameState: {
              ...gameState,
              players: gameState.players,
              currentDartsInRound: lastRound.throws,
              currentPlayerIndex: previousPlayerIndex,
              currentRound: lastRound.roundNumber,
              isCurrentRoundBust: lastRound.isBust,
              roundHistory: gameState.roundHistory.slice(0, -1),
              status: 'ongoing', // in case they won and hit undo
              winnerId: undefined,
            },
          });

          // We don't delete from supabase here, because we haven't popped a dart yet.
          // We just restored the round. The user has to click Undo again to actually pop a dart.
          return;
        }

        // Pop last dart from current round
        const player = gameState.players[gameState.currentPlayerIndex];
        const lastDart = gameState.currentDartsInRound.at(-1)!;
        
        // Only restore score if it wasn't a bust dart (because a bust dart already reverted the score to start of round)
        // Wait, if it's currently busted, the score shown is the start of round score.
        // If we undo the bust dart, we need to return the score to what it was BEFORE the bust.
        // Which means we need to subtract the other darts in the round!
        // Start of round score is scoreLeft (since it was reverted).
        // Score before bust = start of round score - sum of previous darts.
        let restoredScore = player.score.scoreLeft as number;
        const startingScore = (gameState.config as X01Config).startingScore;
        
        if (gameState.isCurrentRoundBust) {
          const previousDartsInRound = gameState.currentDartsInRound.slice(0, -1);
          const scoreOfPreviousDarts = previousDartsInRound.reduce((sum, d) => sum + throwScore(d), 0);
          restoredScore = restoredScore - scoreOfPreviousDarts;
        } else {
          const lastScore = throwScore(lastDart);
          restoredScore = restoredScore + lastScore;
        }
        restoredScore = Math.min(startingScore, restoredScore);

        const updatedPlayers = gameState.players.map((p, i) =>
          i === gameState.currentPlayerIndex
            ? { ...p, score: { ...p.score, scoreLeft: restoredScore }, dartsThrown: p.dartsThrown - 1 }
            : p
        );

        set({
          gameState: {
            ...gameState,
            players: updatedPlayers,
            currentDartsInRound: gameState.currentDartsInRound.slice(0, -1),
            isCurrentRoundBust: false, // undoing a dart always clears the bust state (since the bust dart is what we are undoing)
          },
        });

        // Delete from Supabase
        if (isOnlineMatch && matchId && isOnlineModeAvailable) {
          const roundNumber = gameState.currentRound;
          const dartNumber = gameState.currentDartsInRound.length;
          supabase
            .from('throws')
            .delete()
            .match({
              match_id: matchId,
              participant_id: player.participantId,
              round_number: roundNumber,
              dart_number: dartNumber,
            })
            .then(({ error }) => {
              if (error) console.error('Undo sync error:', error);
            });
        }
      },

      nextRound: () => {
        const { gameState } = get();
        if (!gameState || gameState.status !== 'ongoing') return;

        const engine = getEngine(gameState.gameMode);
        const newState = engine.advanceRound(gameState);
        set({ gameState: newState });
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
