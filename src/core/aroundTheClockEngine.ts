// ============================================================
// Around the Clock Game Mode Engine
// Pure TypeScript — no React 
// ============================================================

import type {
  GameModeEngine,
  GameState,
  PlayerState,
  DartThrow,
  AroundTheClockConfig,
  RoundEntry,
} from './types';

export const aroundTheClockEngine: GameModeEngine<AroundTheClockConfig> = {
  modeId: 'around_the_clock',
  displayName: 'Around the Clock',

  initPlayerScore(_config: AroundTheClockConfig): Record<string, number | string | boolean> {
    return {
      targetIndex: 0,
      currentTarget: 1, // starts at 1
      targetsHit: 0,
    };
  },

  applyThrow(state: GameState, throw_: DartThrow): GameState {
    const config = state.config as AroundTheClockConfig;
    const player = state.players[state.currentPlayerIndex];

    // Construct the sequence
    const sequence = Array.from({ length: 20 }, (_, i) => i + 1);
    if (config.includesBull) {
      sequence.push(25);
    }

    const targetIndex = player.score.targetIndex as number;
    const expectedTarget = sequence[targetIndex];

    let isHit = false;
    if (throw_.segment === expectedTarget) {
      if (config.hitType === 'any') {
        isHit = true;
      } else if (config.hitType === 'singles') {
        if (throw_.segment === 25 || throw_.multiplier === 1) {
          isHit = true;
        }
      }
    }

    let newTargetIndex = targetIndex;
    let newTargetsHit = player.score.targetsHit as number;
    let newCurrentTarget = expectedTarget;

    if (isHit) {
      newTargetIndex++;
      newTargetsHit++;
      newCurrentTarget = newTargetIndex < sequence.length ? sequence[newTargetIndex] : expectedTarget;
    }

    const newDartsInRound = [...state.currentDartsInRound, throw_];

    const updatedPlayer: PlayerState = {
      ...player,
      dartsThrown: player.dartsThrown + 1,
      score: {
        ...player.score,
        targetIndex: newTargetIndex,
        targetsHit: newTargetsHit,
        currentTarget: newCurrentTarget,
      },
    };

    const updatedPlayers = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? updatedPlayer : p
    );

    const newState = {
      ...state,
      players: updatedPlayers,
      currentDartsInRound: newDartsInRound,
    };

    // Check win condition
    if (newTargetIndex >= sequence.length) {
      const entry: RoundEntry = {
        participantId: player.participantId,
        roundNumber: state.currentRound,
        throws: newDartsInRound,
        actualThrows: newDartsInRound.length,
        isBust: false,
        scoreDeducted: 0,
        snapshot: { ...updatedPlayer.score },
      };

      return {
        ...newState,
        status: 'finished',
        winnerId: player.participantId,
        currentDartsInRound: [],
        roundHistory: [...state.roundHistory, entry],
      };
    }

    // Keep all three darts visible until the player confirms the turn with
    // "Next Round", giving them a chance to verify or undo the score.
    return newState;
  },

  checkWin(state: GameState, playerId: string): boolean {
    const config = state.config as AroundTheClockConfig;
    const player = state.players.find((p) => p.participantId === playerId);
    if (!player) return false;

    const targetIndex = player.score.targetIndex as number;
    const maxTargets = 20 + (config.includesBull ? 1 : 0);
    return targetIndex >= maxTargets;
  },

  advanceRound(state: GameState): GameState {
    const player = state.players[state.currentPlayerIndex];

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
      isBust: false,
      scoreDeducted: 0,
      snapshot: { ...updatedPlayer.score },
    };

    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    const nextRound =
      nextPlayerIndex === 0 ? state.currentRound + 1 : state.currentRound;

    return {
      ...state,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      currentDartsInRound: [],
      players: updatedPlayers,
      roundHistory: [...state.roundHistory, entry],
    };
  },
};

import type { Participant } from './types';

export function createAroundTheClockGame(
  matchId: string,
  participants: Participant[],
  config: AroundTheClockConfig,
): GameState {
  const players: PlayerState[] = participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    score: aroundTheClockEngine.initPlayerScore(config),
    dartsThrown: 0,
    legsWon: 0,
  }));

  return {
    matchId,
    gameMode: 'around_the_clock',
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
