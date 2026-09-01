// ============================================================
// History Store — persists completed game summaries locally
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameConfig, RoundEntry } from '../core/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface GamePlayerSummary {
  participantId: string;
  displayName: string;
  dartsThrown: number;
  winner: boolean;
  finalScore: Record<string, number | string | boolean>;
}

export interface GameSummary {
  matchId: string;
  gameMode: string;
  date: string; // ISO string
  config: GameConfig;
  players: GamePlayerSummary[];
  roundHistory: RoundEntry[];
  totalRounds: number;
}

interface HistoryStore {
  gameHistory: GameSummary[];
  addGame: (summary: GameSummary) => void;
  clearHistory: () => void;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      gameHistory: [],

      addGame: (summary) =>
        set((state) => ({
          // Most recent first, cap at 200 games to avoid unbounded growth
          gameHistory: [summary, ...state.gameHistory].slice(0, 200),
        })),

      clearHistory: () => set({ gameHistory: [] }),
    }),
    {
      name: 'dart-history-storage',
    },
  ),
);

// ─────────────────────────────────────────────
// Stat helpers (used by HomePage + StatsPage)
// ─────────────────────────────────────────────

/** Average 3-dart score across all X01 rounds (excluding bust rounds) */
export function computeX01Avg(history: GameSummary[]): number {
  const x01Games = history.filter((g) => g.gameMode === 'x01');
  let totalScore = 0;
  let totalDarts = 0;

  for (const game of x01Games) {
    for (const round of game.roundHistory) {
      if (!round.isBust && round.scoreDeducted > 0) {
        totalScore += round.scoreDeducted;
        totalDarts += round.actualThrows;
      }
    }
  }

  if (totalDarts === 0) return 0;
  // Scale to per-3-darts average
  return Math.round((totalScore / totalDarts) * 3 * 10) / 10;
}

/** Highest checkout (max scoreDeducted on the finishing round) across all X01 games */
export function computeHighOut(history: GameSummary[]): number {
  let best = 0;

  for (const game of history) {
    if (game.gameMode !== 'x01') continue;
    const winner = game.players.find((p) => p.winner);
    if (!winner) continue;

    // Last round played by the winner is the finishing round
    const winnerRounds = game.roundHistory.filter(
      (r) => r.participantId === winner.participantId,
    );
    const lastRound = winnerRounds[winnerRounds.length - 1];
    if (lastRound && !lastRound.isBust && lastRound.scoreDeducted > best) {
      best = lastRound.scoreDeducted;
    }
  }

  return best;
}

/** Best leg — fewest darts thrown to win an X01 game */
export function computeBestLeg(history: GameSummary[]): number | null {
  let best: number | null = null;

  for (const game of history) {
    if (game.gameMode !== 'x01') continue;
    const winner = game.players.find((p) => p.winner);
    if (!winner) continue;

    if (best === null || winner.dartsThrown < best) {
      best = winner.dartsThrown;
    }
  }

  return best;
}
