import type {
    GameModeEngine,
    GameState,
    PlayerState,
    DartThrow,
    RoundEntry,
    RoundTheWorldConfig,
} from './types';

export const roundTheWorldEngine: GameModeEngine<RoundTheWorldConfig> = {
    modeId: 'round_the_world',
    displayName: 'Round the World',

    initPlayerScore(_config: RoundTheWorldConfig): Record<string, number | string | boolean> {
        return {
            targetIndex: 0,
            currentTarget: 1, // starts at 1
            points: 0,
        };
    },

    applyThrow(state: GameState, throw_: DartThrow): GameState {
        const config = state.config as RoundTheWorldConfig;
        const player = state.players[state.currentPlayerIndex];

        // Construct the sequence
        const sequence = Array.from({ length: 20 }, (_, i) => i + 1);
        if (config.includesBull) {
            sequence.push(25);
        }

        const targetIndex = player.score.targetIndex as number;
        const expectedTarget = sequence[targetIndex];

        let earnedPoints = 0;
        if (throw_.segment === expectedTarget) {
            earnedPoints = throw_.multiplier;
        }

        const newPoints = (player.score.points as number) + earnedPoints;
        const newDartsInRound = [...state.currentDartsInRound, throw_];

        const updatedPlayer: PlayerState = {
            ...player,
            dartsThrown: player.dartsThrown + 1,
            score: {
                ...player.score,
                points: newPoints,
                // Target index and current target don't change until the end of the round
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

        // The turn is committed only when the player presses "Next Round".
        return newState;
    },

    checkWin(state: GameState, playerId: string): boolean {
        return state.status === 'finished' && state.winnerId === playerId;
    },

    advanceRound(state: GameState): GameState {
        const config = state.config as RoundTheWorldConfig;
        const player = state.players[state.currentPlayerIndex];
        const sequence = Array.from({ length: 20 }, (_, i) => i + 1);
        if (config.includesBull) sequence.push(25);

        const targetIndex = player.score.targetIndex as number;
        const nextTargetIndex = targetIndex + 1;
        const nextTarget = sequence[nextTargetIndex];
        const remainingMisses = 3 - state.currentDartsInRound.length;
        const missDarts: DartThrow[] = Array(remainingMisses).fill({
            segment: 0 as const,
            multiplier: 1 as const,
        });
        const allDarts = [...state.currentDartsInRound, ...missDarts];

        const updatedPlayer: PlayerState = {
            ...player,
            dartsThrown: player.dartsThrown + remainingMisses,
            score: {
                ...player.score,
                targetIndex: nextTargetIndex,
                currentTarget: nextTarget ?? sequence[targetIndex],
            },
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

        const isLastPlayer = state.currentPlayerIndex === state.players.length - 1;
        const isLastTarget = nextTargetIndex >= sequence.length;
        if (isLastPlayer && isLastTarget) {
            const winner = updatedPlayers.reduce((best, candidate) =>
                (candidate.score.points as number) > (best.score.points as number) ? candidate : best,
            );

            return {
                ...state,
                status: 'finished',
                winnerId: winner.participantId,
                players: updatedPlayers,
                currentDartsInRound: [],
                roundHistory: [...state.roundHistory, entry],
            };
        }

        const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        return {
            ...state,
            players: updatedPlayers,
            currentPlayerIndex: nextPlayerIndex,
            currentRound: nextPlayerIndex === 0 ? state.currentRound + 1 : state.currentRound,
            currentDartsInRound: [],
            roundHistory: [...state.roundHistory, entry],
        };
    }
};

import type { Participant } from './types';

export function createRoundTheWorldGame(
  matchId: string,
  participants: Participant[],
  config: RoundTheWorldConfig,
): GameState {
  const players: PlayerState[] = participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    score: roundTheWorldEngine.initPlayerScore(config),
    dartsThrown: 0,
    legsWon: 0,
  }));

  return {
    matchId,
    gameMode: 'round_the_world',
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
