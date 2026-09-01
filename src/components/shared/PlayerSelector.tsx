import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlayerStore } from '../../store/playerStore';
import { Plus } from 'lucide-react';

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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {allAvailable.map(player => {
          const isSelected = selectedPlayers.some(p => p.id === player.id);
          const index = selectedPlayers.findIndex(p => p.id === player.id);
          
          return (
            <button
              key={player.id}
              onClick={() => handleToggle(player)}
              className={`
                px-4 py-2.5 rounded-xl font-sans font-bold text-sm transition-all border
                ${isSelected 
                  ? 'bg-forest border-forest text-white shadow-md' 
                  : 'bg-panel border-line text-forest-deep hover:border-gold'
                }
              `}
            >
              {player.name}
              {isSelected && <span className="ml-2 text-white/70 text-[10px]">P{index + 1}</span>}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleAddPlayer} className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="New player name..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-panel border border-line text-forest-deep placeholder-muted text-sm font-sans font-semibold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
        />
        <button
          type="submit"
          disabled={!newPlayerName.trim() || isAdding}
          className="px-4 rounded-xl bg-gold text-white hover:bg-gold-deep transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </form>
      
      {loading && <div className="text-xs text-muted">Loading players...</div>}
    </div>
  );
}
