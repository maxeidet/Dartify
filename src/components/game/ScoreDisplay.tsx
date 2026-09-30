import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../../core/types';
import { Avatar } from '../shared/SoftUI';
import { ACCENTS } from '../shared/softTokens';
import type { Accent } from '../shared/softTokens';

interface ScoreDisplayProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  checkoutHint?: string | null;
  dartsInRound: number;
  startingScore?: number;
  gameMode?: string;
  isBust?: boolean;
  compact?: boolean;
  /** Seat color, matching the player's slot from match setup */
  accent?: Accent;
  /** Shown as "Legs N" next to the name when playing best-of-X (legs > 1) */
  showLegs?: boolean;
}

export function ScoreDisplay({
  player,
  isCurrentPlayer,
  checkoutHint,
  dartsInRound,
  startingScore,
  gameMode,
  isBust = false,
  compact = false,
  accent = 'mint',
  showLegs = false,
}: ScoreDisplayProps) {
  const a = ACCENTS[accent];
  const prevScore = useRef<number | string | null>(null);
  const [animate, setAnimate] = useState(false);

  let mainScore: string | number;
  let statsText: string;

  if (gameMode === 'around_the_clock') {
    mainScore = player.score.currentTarget as string | number;
    if (mainScore === 25) mainScore = 'Bull';

    // User requested hit rate per dart
    const targetsHit = player.score.targetsHit as number || 0;
    const hitRate = player.dartsThrown > 0
      ? Math.round((targetsHit / player.dartsThrown) * 100)
      : 0;
    statsText = `Hit rate ${hitRate}%`;
  } else if (gameMode === 'round_the_world') {
    mainScore = player.score.points as number;
    const target = player.score.currentTarget as string | number;
    const targetsHit = player.score.targetsHit as number || 0;
    const hitRate = player.dartsThrown > 0
      ? Math.round((targetsHit / player.dartsThrown) * 100)
      : 0;
    statsText = `Target ${target === 25 ? 'Bull' : target} · ${hitRate}%`;
  } else {
    mainScore = player.score.scoreLeft as number;
    // Dart averages in X01 are conventionally shown over three darts,
    // including during the first visit.
    const avg = typeof startingScore === 'number' && player.dartsThrown > 0
      ? Math.round(((startingScore - (mainScore as number)) / player.dartsThrown) * 3 * 10) / 10
      : 0;
    statsText = `Avg ${avg}`;
  }

  const compactDetail = isCurrentPlayer && checkoutHint
    ? `Out: ${checkoutHint}`
    : statsText;

  useEffect(() => {
    if (prevScore.current !== null && prevScore.current !== mainScore) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 300);
      prevScore.current = mainScore;
      return () => clearTimeout(t);
    } else {
      prevScore.current = mainScore;
    }
  }, [mainScore]);

  if (compact) {
    return (
      <div
        className={`
          snap-start flex-1 shrink-0 flex flex-col items-center gap-1
          rounded-[18px] px-3 py-2 transition-all duration-300 relative overflow-hidden
          min-w-[80px]
          ${isCurrentPlayer
            ? `bg-white shadow-[0_1px_2px_rgba(20,24,32,0.05),0_10px_24px_-14px_rgba(20,24,32,0.22)] ${isBust ? 'ring-2 ring-[#D6453D] score-card-bust' : ''}`
            : 'bg-track/70 opacity-75'
          }
        `}
      >
        {/* Avatar */}
        {player.avatarUrl
          ? <img src={player.avatarUrl} className="w-7 h-7 rounded-full object-cover shrink-0" alt={player.displayName} />
          : <Avatar name={player.displayName} size={28} accent={accent} />
        }

        {/* Name */}
        <p className={`font-semibold text-[11px] leading-none truncate w-full text-center ${isCurrentPlayer ? 'text-slate' : 'text-slate-soft'}`}>
          {player.displayName}
        </p>
        {showLegs && (
          <p className="text-[9px] font-semibold tabular-nums leading-none text-subtle -mt-0.5">
            Legs {player.legsWon}
          </p>
        )}

        {/* Main score */}
        <div
          className={`
            font-semibold tracking-display tabular-nums leading-none
            ${animate ? 'score-count-enter' : ''}
            ${isBust ? 'score-crack' : ''}
            ${isCurrentPlayer ? 'text-slate' : 'text-slate-soft'}
          `}
          style={{ fontSize: 'clamp(1.4rem, 5vw, 1.75rem)' }}
        >
          {mainScore}
        </div>

        {/* Compact cards are used for 3+ player games. Keep the average
            visible, or replace it with the active player's checkout route. */}
        <p
          className={`min-h-[1.25rem] w-full px-0.5 text-center text-[10px] font-medium leading-[0.65rem] ${
            isCurrentPlayer && checkoutHint ? '' : 'text-subtle'
          }`}
          style={isCurrentPlayer && checkoutHint ? { color: a.ink } : undefined}
        >
          {compactDetail}
        </p>

        {/* Darts dots */}
        {isCurrentPlayer && (
          <div className="flex gap-1 items-center justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-200
                  ${i < dartsInRound ? 'scale-110' : 'bg-track'}
                `}
                style={i < dartsInRound ? { background: a.solid } : undefined}
              />
            ))}
          </div>
        )}

      </div>
    );
  }

  return (
    <div
      className={`
        rounded-[22px] p-2.5 transition-all duration-300 relative overflow-hidden
        ${isCurrentPlayer
          ? `bg-white shadow-[0_1px_2px_rgba(20,24,32,0.05),0_10px_24px_-14px_rgba(20,24,32,0.22)] ${isBust ? 'ring-2 ring-[#D6453D] score-card-bust' : ''}`
          : 'bg-track/70 opacity-75'
        }
      `}
    >
      {/* Player name + turn indicator */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          {player.avatarUrl
            ? <img src={player.avatarUrl} className="w-7 h-7 rounded-full object-cover shrink-0" alt={player.displayName} />
            : <Avatar name={player.displayName} size={28} accent={accent} />
          }
          <div>
            <p className={`font-semibold text-[13px] leading-none ${isCurrentPlayer ? 'text-slate' : 'text-slate-soft'}`}>
              {player.displayName}
            </p>
            {isCurrentPlayer ? (
              <p className="text-[11px] font-medium leading-none mt-1" style={{ color: a.ink }}>
                {showLegs ? `Legs ${player.legsWon} · Your turn` : 'Your turn'}
              </p>
            ) : showLegs ? (
              <p className="text-[11px] font-medium leading-none mt-1 text-subtle tabular-nums">
                Legs {player.legsWon}
              </p>
            ) : null}
          </div>
        </div>

        {/* Darts indicator */}
        {isCurrentPlayer && (
          <div className="flex gap-1.5 items-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-200
                  ${i < dartsInRound ? 'scale-110' : 'bg-track'}
                `}
                style={i < dartsInRound ? { background: a.solid } : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main score */}
      <div
        className={`
          relative font-semibold tracking-display tabular-nums text-center leading-none mb-1
          ${animate ? 'score-count-enter' : ''}
          ${isBust ? 'score-crack' : ''}
          ${isCurrentPlayer ? 'text-slate' : 'text-slate-soft'}
        `}
        style={{ fontSize: 'clamp(1.9rem, 7vw, 2.6rem)' }}
      >
        {mainScore}
        {isBust && (
          <svg
            className="score-crack-lines pointer-events-none absolute left-1/2 top-1/2 h-[1.65em] w-[3.3em] -translate-x-1/2 -translate-y-1/2"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M107 2 91 32l20 11-17 55M91 32 65 18M111 43l28-14M94 65l-26 20" />
          </svg>
        )}
      </div>

      {/* Stats row */}
      <div className={`flex justify-between items-center min-h-[14px] text-[11px] font-medium tabular-nums ${isCurrentPlayer ? 'text-slate-soft' : 'text-subtle'}`}>
        <span className="whitespace-nowrap">{player.dartsThrown} darts</span>
        <span
          className={`font-semibold whitespace-nowrap truncate px-1 ${
            checkoutHint && isCurrentPlayer ? '' : 'invisible'
          }`}
          style={{ color: a.ink }}
        >
          ↳ {checkoutHint}
        </span>
        <span className="whitespace-nowrap">{statsText}</span>
      </div>
    </div>
  );
}
