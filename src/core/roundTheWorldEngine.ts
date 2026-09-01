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

    initPlayerScore(config: RoundTheWorldConfig): Record<string, number | string | boolean> {
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

        let updatedPlayer: PlayerState = {
            ...player,
            dartsThrown: player.dartsThrown + 1,
            score: {
                ...player.score,
                points: newPoints,
                // Target index and current target don't change until the end of the round
            },
        };

        let updatedPlayers = state.players.map((p, i) =>
            i === state.currentPlayerIndex ? updatedPlayer : p
        );

        let newState = {
            ...state,
            players: updatedPlayers,
            currentDartsInRound: newDartsInRound,
        };

        // Auto-advance if 3 darts thrown
        if (newDartsInRound.length === 3) {
            // Now advance the target
            const nextTargetIndex = targetIndex + 1;
            const nextTarget = nextTargetIndex < sequence.length ? sequence[nextTargetIndex] : null;

            // Update player's target for their next turn
            updatedPlayer = {
                ...updatedPlayer,
                score: {
                    ...updatedPlayer.score,
                    targetIndex: nextTargetIndex,
                    currentTarget: nextTarget || expectedTarget, // keep last target if finished
                }
            };

            updatedPlayers = newState.players.map((p, i) =>
                i === state.currentPlayerIndex ? updatedPlayer : p
            );

            newState = { ...newState, players: updatedPlayers };

            const entry: RoundEntry = {
                participantId: player.participantId,
                roundNumber: state.currentRound,
                throws: newDartsInRound,
                actualThrows: 3,
                isBust: false,
                scoreDeducted: 0,
                snapshot: { ...updatedPlayer.score },
            };

            const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
            const nextRound = nextPlayerIndex === 0 ? state.currentRound + 1 : state.currentRound;

            // Check if game is completely finished (last player threw their last dart on the last target)
            const isLastPlayer = state.currentPlayerIndex === state.players.length - 1;
            const isLastTarget = nextTargetIndex >= sequence.length;

            if (isLastPlayer && isLastTarget) {
                // Game over. Find winner (highest points)
                let winnerId = updatedPlayers[0].participantId;
                let maxPoints = updatedPlayers[0].score.points as number;
                for (let i = 1; i < updatedPlayers.length; i++) {
                    const pts = updatedPlayers[i].score.points as number;
                    if (pts > maxPoints) {
                        maxPoints = pts;
                        winnerId = updatedPlayers[i].participantId;
                    }
                }

                return {
                    ...newState,
                    status: 'finished',
                    winnerId: winnerId,
                    currentDartsInRound: [],
                    roundHistory: [...state.roundHistory, entry],
                };
            }

            return {
                ...newState,
                currentPlayerIndex: nextPlayerIndex,
                currentRound: nextRound,
                currentDartsInRound: [],
                roundHistory: [...state.roundHistory, entry],
            };
        }

        return newState;
    },

    checkWin(state: GameState, playerId: string): boolean {
        return state.status === 'finished' && state.winnerId === playerId;
    },

    advanceRound(state: GameState): GameState {
        // Not used directly if applyThrow auto-advances, but required by interface
        return state;
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
