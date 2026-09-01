// ============================================================
// X01 Game Mode Engine (301 / 501 / 701)
// Pure TypeScript — no React, no side effects
// ============================================================

import type {
  GameModeEngine,
  GameState,
  PlayerState,
  DartThrow,
  X01Config,
  RoundEntry,
} from './types';
import { throwScore } from './types';

// ─────────────────────────────────────────────
// Checkout tables (most common routes)
// ─────────────────────────────────────────────
const CHECKOUT_ROUTES: Record<number, string> = {
  170: 'T20 T20 Bull',
  167: 'T20 T19 Bull',
  164: 'T20 T18 Bull',
  161: 'T20 T17 Bull',
  160: 'T20 T20 D20',
  158: 'T20 T20 D19',
  157: 'T20 T19 D20',
  156: 'T20 T20 D18',
  155: 'T20 T19 D19',
  154: 'T20 T18 D20',
  153: 'T20 T19 D18',
  152: 'T20 T20 D16',
  151: 'T20 T17 D20',
  150: 'T20 T18 D18',
  149: 'T20 T19 D16',
  148: 'T20 T16 D20',
  147: 'T20 T17 D18',
  146: 'T20 T18 D16',
  145: 'T20 T15 D20',
  144: 'T20 T20 D12',
  143: 'T20 T17 D16',
  142: 'T20 T14 D20',
  141: 'T20 T19 D12',
  140: 'T20 T16 D16',
  139: 'T20 T13 D20',
  138: 'T20 T18 D12',
  137: 'T20 T15 D16',
  136: 'T20 T20 D8',
  135: 'T20 T17 D12',
  134: 'T20 T14 D16',
  133: 'T20 T19 D8',
  132: 'T20 T16 D12',
  131: 'T20 T13 D16',
  130: 'T20 T20 D5',
  129: 'T19 T16 D12',
  128: 'T18 T14 D16',
  127: 'T20 T17 D8',
  126: 'T19 T19 D6',
  125: 'Bull T20 D20',
  124: 'T20 T16 D8',
  123: 'T19 T16 D9',
  122: 'T18 T18 D7',
  121: 'T20 T11 D14',
  120: 'T20 S20 D20',
  119: 'T19 T12 D13',
  118: 'T20 S18 D20',
  117: 'T20 S17 D20',
  116: 'T20 S16 D20',
  115: 'T20 S15 D20',
  114: 'T20 S14 D20',
  113: 'T20 S13 D20',
  112: 'T20 S12 D20',
  111: 'T20 S11 D20',
  110: 'T20 S10 D20',
  109: 'T20 S9 D20',
  108: 'T20 S8 D20',
  107: 'T19 S10 D20',
  106: 'T20 S6 D20',
  105: 'T20 S5 D20',
  104: 'T18 S10 D20',
  103: 'T19 S6 D20',
  102: 'T20 S2 D20',
  101: 'T17 S10 D20',
  100: 'T20 D20',
  99: 'T19 S10 D16',
  98: 'T20 D19',
  97: 'T19 D20',
  96: 'T20 D18',
  95: 'T19 D19',
  94: 'T18 D20',
  93: 'T19 D18',
  92: 'T20 D16',
  91: 'T17 D20',
  90: 'T18 D18',
  89: 'T19 D16',
  88: 'T20 D14',
  87: 'T17 D18',
  86: 'T18 D16',
  85: 'T15 D20',
  84: 'T20 D12',
  83: 'T17 D16',
  82: 'T14 D20',
  81: 'T19 D12',
  80: 'T20 D10',
  79: 'T13 D20',
  78: 'T18 D12',
  77: 'T15 D16',
  76: 'T20 D8',
  75: 'T17 D12',
  74: 'T14 D16',
  73: 'T19 D8',
  72: 'T16 D12',
  71: 'T13 D16',
  70: 'T18 D8',
  69: 'T19 D6',
  68: 'T20 D4',
  67: 'T17 D8',
  66: 'T10 D18',
  65: 'T19 D4',
  64: 'T16 D8',
  63: 'T13 D12',
  62: 'T10 D16',
  61: 'T15 D8',
  60: 'S20 D20',
  59: 'S19 D20',
  58: 'S18 D20',
  57: 'S17 D20',
  56: 'T16 D4',
  55: 'S15 D20',
  54: 'S14 D20',
  53: 'S13 D20',
  52: 'S12 D20',
  51: 'S11 D20',
  50: 'Bull',
  40: 'D20',
  38: 'D19',
  36: 'D18',
  34: 'D17',
  32: 'D16',
  30: 'D15',
  28: 'D14',
  26: 'D13',
  24: 'D12',
  22: 'D11',
  20: 'D10',
  18: 'D9',
  16: 'D8',
  14: 'D7',
  12: 'D6',
  10: 'D5',
  8: 'D4',
  6: 'D3',
  4: 'D2',
  2: 'D1',
};

// ─────────────────────────────────────────────
// Bust detection
// ─────────────────────────────────────────────

function isBust(
  scoreLeft: number,
  throwValue: number,
  dart: DartThrow,
  config: X01Config,
): boolean {
  const remaining = scoreLeft - throwValue;

  // Overshot
  if (remaining < 0) return true;

  // Exactly 1 left — can't finish on 1 (need a double for doubleOut)
  if (remaining === 1) return true;

  // Landed on 0 but the finishing dart wasn't a double (when doubleOut is on)
  if (remaining === 0 && config.doubleOut) {
    const isDouble = dart.multiplier === 2;
    const isBullseye = dart.segment === 25 && dart.multiplier === 2;
    return !isDouble && !isBullseye;
  }

  return false;
}

// ─────────────────────────────────────────────
// X01 Engine Implementation
// ─────────────────────────────────────────────

export const x01Engine: GameModeEngine<X01Config> = {
  modeId: 'x01',
  displayName: 'X01',

  initPlayerScore(config: X01Config) {
    return {
      scoreLeft: config.startingScore,
      legsWon: 0,
    };
  },

  applyThrow(state: GameState, dart: DartThrow): GameState {
    const config = state.config as X01Config;
    const player = state.players[state.currentPlayerIndex];
    const scoreLeft = player.score.scoreLeft as number;
    const value = throwScore(dart);

    // Calculate score at the start of this round
    const scoreThrownSoFar = state.currentDartsInRound.reduce((sum, d) => sum + throwScore(d), 0);
    const startOfRoundScore = scoreLeft + scoreThrownSoFar;

    const bust = isBust(scoreLeft, value, dart, config);
    
    // If bust, revert to start of round score. Otherwise, subtract value.
    const newScoreLeft = bust ? startOfRoundScore : scoreLeft - value;
    const newDartsInRound = [...state.currentDartsInRound, dart];

    const updatedPlayer: PlayerState = {
      ...player,
      score: {
        ...player.score,
        scoreLeft: newScoreLeft,
      },
      dartsThrown: player.dartsThrown + 1,
    };

    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p,
    );

    // Check win (score exactly 0 after a valid throw)
    const won = !bust && newScoreLeft === 0;

    if (won) {
      // Auto-advance only on win
      const entry: RoundEntry = {
        participantId: player.participantId,
        roundNumber: state.currentRound,
        throws: newDartsInRound,
        actualThrows: newDartsInRound.length,
        isBust: false,
        scoreDeducted: startOfRoundScore,
        snapshot: { ...updatedPlayer.score },
      };

      return {
        ...state,
        status: 'finished',
        winnerId: player.participantId,
        players: updatedPlayers,
        currentDartsInRound: [],
        isCurrentRoundBust: false,
        roundHistory: [...state.roundHistory, entry],
      };
    }

    // Normal play, no auto-advance
    return {
      ...state,
      players: updatedPlayers,
      currentDartsInRound: newDartsInRound,
      isCurrentRoundBust: bust,
    };
  },

  checkWin(state: GameState, playerId: string): boolean {
    const player = state.players.find((p) => p.participantId === playerId);
    return (player?.score.scoreLeft as number) === 0;
  },

  advanceRound(state: GameState): GameState {
    // Called when host clicks "Next Round" manually (< 3 darts thrown)
    const player = state.players[state.currentPlayerIndex];

    // Darts not thrown count as misses — add them to history
    const remainingMisses = 3 - state.currentDartsInRound.length;
    const missDarts: DartThrow[] = Array(remainingMisses).fill({
      segment: 0 as const,
      multiplier: 1 as const,
    });

    const allDarts = [...state.currentDartsInRound, ...missDarts];
    const dartsThrownThisRound = missDarts.length;
    const updatedPlayer: PlayerState = {
      ...player,
      dartsThrown: player.dartsThrown + dartsThrownThisRound,
    };
    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p,
    );

    const entry: RoundEntry = {
      participantId: player.participantId,
      roundNumber: state.currentRound,
      throws: allDarts,
      actualThrows: state.currentDartsInRound.length,
      isBust: state.isCurrentRoundBust,
      scoreDeducted: state.isCurrentRoundBust ? 0 : state.currentDartsInRound.reduce((sum, d) => sum + throwScore(d), 0),
      snapshot: { ...player.score },
    };

    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextRound =
      nextPlayerIndex === 0 ? state.currentRound + 1 : state.currentRound;

    return {
      ...state,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      currentDartsInRound: [],
      isCurrentRoundBust: false,
      players: updatedPlayers,
      roundHistory: [...state.roundHistory, entry],
    };
  },

  getCheckoutHint(state: GameState): string | null {
    const player = state.players[state.currentPlayerIndex];
    const scoreLeft = player.score.scoreLeft as number;
    const config = state.config as X01Config;

    if (!config.doubleOut) return null;
    if (scoreLeft > 170 || scoreLeft < 2) return null;

    return CHECKOUT_ROUTES[scoreLeft] ?? null;
  },
};

// ─────────────────────────────────────────────
// Factory: build initial GameState for X01
// ─────────────────────────────────────────────

import type { Participant } from './types';

export function createX01Game(
  matchId: string,
  participants: Participant[],
  config: X01Config,
): GameState {
  const players: PlayerState[] = participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    score: x01Engine.initPlayerScore(config),
    dartsThrown: 0,
    legsWon: 0,
  }));

  return {
    matchId,
    gameMode: 'x01',
    config,
    status: 'ongoing',
    players,
    currentPlayerIndex: 0,
    currentRound: 1,
    currentDartsInRound: [],
    isCurrentRoundBust: false,
    roundHistory: [],
  };
}
