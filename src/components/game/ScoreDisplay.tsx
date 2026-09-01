import { useEffect, useRef, useState } from 'react';
import type { PlayerState } from '../../core/types';

interface ScoreDisplayProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  checkoutHint?: string | null;
  dartsInRound: number;
  startingScore?: number;
  gameMode?: string;
  isBust?: boolean;
}

export function ScoreDisplay({
  player,
  isCurrentPlayer,
  checkoutHint,
  dartsInRound,
  startingScore,
  gameMode,
  isBust = false,
}: ScoreDisplayProps) {
  const prevScore = useRef<number | string | null>(null);
  const [animate, setAnimate] = useState(false);

  let mainScore: string | number;
  let statsText: string;

  if (gameMode === 'around_the_clock') {
    mainScore = player.score.currentTarget as string | number;
    if (mainScore === 25) mainScore = 'BULL';

    // User requested hit rate per dart
    const targetsHit = player.score.targetsHit as number || 0;
    const hitRate = player.dartsThrown > 0
      ? Math.round((targetsHit / player.dartsThrown) * 100)
      : 0;
    statsText = `Hit Rate ${hitRate}%`;
  } else if (gameMode === 'round_the_world') {
    mainScore = player.score.points as number;
    const target = player.score.currentTarget as string | number;
    const targetsHit = player.score.targetsHit as number || 0;
    const hitRate = player.dartsThrown > 0
      ? Math.round((targetsHit / player.dartsThrown) * 100)
      : 0;
    statsText = `Target: ${target === 25 ? 'BULL' : target} | Hit Rate ${hitRate}%`;
  } else {
    mainScore = player.score.scoreLeft as number;
    // Show average points per dart for the first round, then per 3 darts.
    const multiplier = player.dartsThrown <= 3 ? 1 : 3;
    const avg = typeof startingScore === 'number' && player.dartsThrown > 0
      ? Math.round(((startingScore - (mainScore as number)) / player.dartsThrown) * multiplier * 10) / 10
      : 0;
    statsText = `Avg ${avg}`;
  }

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

  return (
    <div
      className={`
        rounded-[18px] p-3 transition-all duration-300 relative overflow-hidden
        ${isCurrentPlayer
          ? `bg-panel border-[1.5px] shadow-[0_4px_16px_rgba(15,58,34,0.06)] ${isBust ? 'border-[#A63B37] score-card-bust' : 'border-forest'}`
          : 'bg-cream border border-line opacity-75 shadow-sm'
        }
      `}
    >
      {/* Player name + turn indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div
            className={`
              w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
              ${isCurrentPlayer ? 'bg-forest text-white' : 'bg-muted text-cream'}
            `}
          >
            {player.avatarUrl
              ? <img src={player.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt={player.displayName} />
              : player.displayName.charAt(0).toUpperCase()
            }
          </div>
          <div>
            <p className={`font-sans font-bold text-xs leading-none ${isCurrentPlayer ? 'text-forest-deep' : 'text-muted'}`}>
              {player.displayName}
            </p>
            {isCurrentPlayer && (
              <p className="text-[9px] text-gold-deep font-bold uppercase tracking-[1.5px] leading-none mt-1">
                Your turn
              </p>
            )}
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
                  ${i < dartsInRound ? 'bg-forest scale-110' : 'bg-line'}
                `}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main score */}
      <div
        className={`
          relative font-display font-black text-center leading-none mb-2
          ${animate ? 'score-count-enter' : ''}
          ${isBust ? 'score-crack' : ''}
          ${isCurrentPlayer ? 'text-forest-deep' : 'text-muted'}
        `}
        style={{ fontSize: 'clamp(2.2rem, 8vw, 3rem)' }}
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
      <div className={`flex justify-between text-[9px] font-bold uppercase tracking-[1px] ${isCurrentPlayer ? 'text-forest' : 'text-muted/70'}`}>
        <span>{player.dartsThrown} darts</span>
        {checkoutHint && isCurrentPlayer && (
          <span className="text-gold-deep">
            ↳ {checkoutHint}
          </span>
        )}
        <span>{statsText}</span>
      </div>
    </div>
  );
}
