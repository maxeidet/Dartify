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
      <div className="py-10 text-center text-xs font-display uppercase tracking-[1.8px] text-muted">
        No throws yet
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line bg-cream text-[10px] font-sans font-bold uppercase tracking-[1.3px] text-muted">
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
                border-b border-line/70
                ${entry.isBust ? 'bg-[#A63B37]/8' : 'bg-panel'}
              `}
            >
              <td className="px-3 py-3 font-mono text-muted">{entry.roundNumber}</td>
              <td className="max-w-[80px] truncate px-2 py-3 font-sans font-bold text-forest-deep">
                {playerMap[entry.participantId] ?? '?'}
              </td>
              {[0, 1, 2].map((i) => {
                const dart = entry.throws[i];
                return (
                  <td key={i} className="px-1 py-3 text-center">
                    {dart ? (
                      <span
                        className={`
                          font-sans font-bold
                          ${dart.multiplier === 3 ? 'text-gold-deep' :
                            dart.multiplier === 2 ? 'text-forest' :
                            'text-ink'}
                        `}
                      >
                        {throwLabel(dart)}
                      </span>
                    ) : (
                      <span className="text-muted/50">—</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-3 text-right">
                {entry.isBust ? (
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#A63B37]">Bust</span>
                ) : (
                  <span className="font-display font-bold text-forest-deep">
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
