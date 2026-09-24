import type { RoundEntry } from '../../core/types';
import { throwLabel } from '../../core/types';

interface RoundHistoryProps {
  history: RoundEntry[];
  players: { participantId: string; displayName: string }[];
  maxRows?: number;
}

export function RoundHistory({ history, players, maxRows = 8 }: RoundHistoryProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.participantId, p.displayName]));

  // Show most recent first
  const reversed = [...history].reverse().slice(0, maxRows);

  if (reversed.length === 0) {
    return (
      <div className="py-10 text-center text-[14px] font-medium text-subtle">
        No throws yet
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-line/70 text-[12px] font-medium text-subtle">
            <th className="px-3 py-3 text-left">Rnd</th>
            <th className="px-2 py-3 text-left">Player</th>
            <th className="px-1 py-3 text-center">D1</th>
            <th className="px-1 py-3 text-center">D2</th>
            <th className="px-1 py-3 text-center">D3</th>
            <th className="px-3 py-3 text-right">Left</th>
          </tr>
        </thead>
        <tbody>
          {reversed.map((entry, idx) => (
            <tr
              key={idx}
              className={`
                border-b border-line/60 last:border-b-0
                ${entry.isBust ? 'bg-[#FCE9E7]/70' : ''}
              `}
            >
              <td className="px-3 py-3 text-subtle tabular-nums">{entry.roundNumber}</td>
              <td className="max-w-[80px] truncate px-2 py-3 font-semibold text-slate">
                {playerMap[entry.participantId] ?? '?'}
              </td>
              {[0, 1, 2].map((i) => {
                const dart = entry.throws[i];
                return (
                  <td key={i} className="px-1 py-3 text-center">
                    {dart ? (
                      <span
                        className={`
                          font-semibold tabular-nums
                          ${dart.multiplier === 3 ? 'text-coral-ink' :
                            dart.multiplier === 2 ? 'text-mint-ink' :
                            'text-slate'}
                        `}
                      >
                        {throwLabel(dart)}
                      </span>
                    ) : (
                      <span className="text-subtle/60">–</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-right">
                {entry.isBust ? (
                  <span className="text-[13px] font-semibold text-[#C4413A]">Bust</span>
                ) : (
                  <span className="font-semibold text-slate tabular-nums">
                    {entry.snapshot.scoreLeft as number}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
