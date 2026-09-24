import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlayerStore } from '../../store/playerStore';
import { Check, UserPlus } from 'lucide-react';
import { Avatar } from './SoftUI';
import { ACCENTS, SLOT_ACCENTS } from './softTokens';

export type SelectedPlayer = {
  id: string;
  name: string;
  type: 'profile' | 'local';
};

interface PlayerSelectorProps {
  numPlayers: number;
  selectedPlayers: SelectedPlayer[];
  onChange: (players: SelectedPlayer[]) => void;
}

export function PlayerSelector({ numPlayers, selectedPlayers, onChange }: PlayerSelectorProps) {
  const { profile } = useAuthStore();
  const { players: localPlayers, fetchPlayers, addPlayer, loading } = usePlayerStore();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Ensure default selection if empty
  useEffect(() => {
    if (selectedPlayers.length === 0 && profile) {
      onChange([{ id: profile.id, name: profile.username || 'Me', type: 'profile' }]);
    }
  }, [profile, selectedPlayers, onChange]);

  const allAvailable: SelectedPlayer[] = [
    ...(profile ? [{ id: profile.id, name: profile.username || 'Me', type: 'profile' as const }] : []),
    ...localPlayers.map(p => ({ id: p.id, name: p.name, type: 'local' as const }))
  ];

  const isFull = selectedPlayers.length >= numPlayers;
  const remaining = numPlayers - selectedPlayers.length;

  const handleToggle = (player: SelectedPlayer) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);

    if (isSelected) {
      onChange(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      if (selectedPlayers.length < numPlayers) {
        onChange([...selectedPlayers, player]);
      }
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setIsAdding(true);
    const added = await addPlayer(newPlayerName);
    if (added) {
      setNewPlayerName('');
      // Auto select if there is room
      if (selectedPlayers.length < numPlayers) {
        onChange([...selectedPlayers, { id: added.id, name: added.name, type: 'local' }]);
      }
    }
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col">

      {/* Slot bars — one per seat, filled in throw order */}
      <div className="flex gap-1.5">
        {Array.from({ length: numPlayers }, (_, i) => {
          const filled = i < selectedPlayers.length;
          return (
            <span
              key={i}
              className={`flex-1 h-3 rounded-full transition-colors duration-300 ${filled ? 'soft-hatch' : 'soft-hatch-empty'}`}
              style={filled ? { backgroundColor: ACCENTS[SLOT_ACCENTS[i]].solid } : undefined}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 min-h-8">
        <div className="flex items-center gap-3">
          {selectedPlayers.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <Avatar name={p.name} size={26} accent={SLOT_ACCENTS[i]} />
              <span className="text-[14px] font-semibold tabular-nums" style={{ color: ACCENTS[SLOT_ACCENTS[i]].ink }}>
                P{i + 1}
              </span>
            </span>
          ))}
        </div>
        <span className="text-[14px] font-medium text-subtle tabular-nums">
          {remaining > 0 ? `${remaining} left` : 'All set'}
        </span>
      </div>

      <div className="h-px bg-line/70 my-3" />

      {/* Roster */}
      <ul className="flex flex-col">
        {allAvailable.map(player => {
          const index = selectedPlayers.findIndex(p => p.id === player.id);
          const isSelected = index !== -1;
          const disabled = !isSelected && isFull;
          const accent = isSelected ? ACCENTS[SLOT_ACCENTS[index]] : null;

          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => handleToggle(player)}
                disabled={disabled}
                aria-pressed={isSelected}
                className="w-full flex items-center gap-3.5 py-2 text-left transition-opacity disabled:opacity-40 [-webkit-tap-highlight-color:transparent] active:opacity-70"
              >
                <span
                  className={`w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isSelected ? '' : 'border-[1.5px] border-[#DCDDE1] bg-white'
                  }`}
                  style={accent ? { background: accent.ink } : undefined}
                >
                  {isSelected && <Check size={16} strokeWidth={3.2} className="text-white" />}
                </span>
                <span className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span className="truncate text-[16px] font-medium text-slate">{player.name}</span>
                  {player.type === 'profile' && <span className="text-[13px] text-subtle shrink-0">You</span>}
                </span>
                <Avatar name={player.name} size={30} accent={isSelected ? SLOT_ACCENTS[index] : undefined} />
              </button>
            </li>
          );
        })}
      </ul>

      {loading && allAvailable.length === 0 && (
        <div className="py-2 text-[13px] text-subtle">Loading players…</div>
      )}

      {/* Add player — invite-style field with the action inside */}
      <form
        onSubmit={handleAddPlayer}
        className="mt-3 flex items-center gap-2 h-[52px] pl-4 pr-1.5 rounded-full bg-track/70 border border-[#E4E5E8] focus-within:bg-white focus-within:border-[#D5D7DC] transition-colors"
      >
        <UserPlus size={18} strokeWidth={2} className="text-subtle shrink-0" />
        <input
          type="text"
          placeholder="Add a player"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-[16px] font-medium text-slate placeholder:text-subtle focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newPlayerName.trim() || isAdding}
          className="h-10 px-4 rounded-full soft-primary soft-press text-[14px] font-semibold disabled:opacity-100"
        >
          {isAdding ? 'Adding…' : 'Add'}
        </button>
      </form>
    </div>
  );
}
