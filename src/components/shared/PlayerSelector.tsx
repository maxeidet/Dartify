import { useEffect, useRef, useState } from 'react';
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

  // Drag a player left/right to reorder the throw order. While dragging only
  // transforms change (the chip follows the finger, neighbours slide aside);
  // the new order is committed once on release, so the DOM never reorders
  // mid-gesture and the drag can't get stuck.
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragging = useRef(false);
  const [drag, setDrag] = useState<{
    index: number; delta: number; target: number; settling: boolean;
    lefts: number[]; widths: number[];
  } | null>(null);
  const [noAnim, setNoAnim] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // Where the dragged chip would land for a given drag distance
  const targetFor = (index: number, lefts: number[], widths: number[], delta: number) => {
    const center = lefts[index] + widths[index] / 2 + delta;
    let target = index;
    lefts.forEach((left, j) => {
      const c = left + widths[j] / 2;
      if (j > index && center >= c) target = Math.max(target, j);
      if (j < index && center <= c) target = Math.min(target, j);
    });
    return target;
  };

  // Transform for each chip while dragging (and while settling into place)
  const offsetFor = (j: number) => {
    if (!drag) return 0;
    const { index, target, lefts, widths } = drag;
    const gap = lefts.length > 1 ? lefts[1] - (lefts[0] + widths[0]) : 0;
    const shift = widths[index] + gap;
    if (j === index) {
      if (!drag.settling) return drag.delta;
      if (target > index) return lefts[target] + widths[target] - (lefts[index] + widths[index]);
      return lefts[target] - lefts[index];
    }
    if (target > index && j > index && j <= target) return -shift;
    if (target < index && j < index && j >= target) return shift;
    return 0;
  };

  // Seat each chip will have after the drop, so P1/P2 colours follow live
  const seatFor = (j: number) => {
    if (!drag) return j;
    const { index, target } = drag;
    if (j === index) return target;
    if (target > index && j > index && j <= target) return j - 1;
    if (target < index && j < index && j >= target) return j + 1;
    return j;
  };

  const commit = (from: number, to: number) => {
    if (from !== to) {
      const next = [...selectedPlayers];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    }
    // Swap order and clear transforms in the same frame, without animating
    setNoAnim(true);
    setDrag(null);
    dragging.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setNoAnim(false)));
  };

  const handleDragPointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (dragging.current || selectedPlayers.length < 2) return;
    e.preventDefault();
    const rects = chipRefs.current.slice(0, selectedPlayers.length).map(el => el?.getBoundingClientRect());
    if (rects.some(r => !r)) return;
    dragging.current = true;
    const { pointerId, clientX: startX } = e;
    const lefts = rects.map(r => r!.left);
    const widths = rects.map(r => r!.width);
    const base = { index, lefts, widths };
    setDrag({ ...base, delta: 0, target: index, settling: false });

    const minDelta = lefts[0] - lefts[index];
    const last = lefts.length - 1;
    const maxDelta = lefts[last] + widths[last] - (lefts[index] + widths[index]);
    const clampDelta = (x: number) => Math.min(maxDelta, Math.max(minDelta, x - startX));

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const delta = clampDelta(ev.clientX);
      setDrag({ ...base, delta, target: targetFor(index, lefts, widths, delta), settling: false });
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const delta = clampDelta(ev.clientX);
      const target = ev.type === 'pointercancel' ? index : targetFor(index, lefts, widths, delta);
      // Glide into the slot first, then commit the new order
      setDrag({ ...base, delta, target, settling: true });
      settleTimer.current = window.setTimeout(() => commit(index, target), 170);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleChipKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const to = e.key === 'ArrowLeft' ? index - 1 : e.key === 'ArrowRight' ? index + 1 : null;
    if (to === null || to < 0 || to >= selectedPlayers.length) return;
    e.preventDefault();
    const next = [...selectedPlayers];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
    requestAnimationFrame(() => chipRefs.current[to]?.focus());
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
          {selectedPlayers.map((p, i) => {
            const held = drag?.index === i && !drag.settling;
            const seat = seatFor(i);
            // The held chip tracks the finger 1:1; everything else (and the drop) glides
            const animate = !noAnim && !held;
            return (
              <button
                key={p.id}
                ref={el => { chipRefs.current[i] = el; }}
                type="button"
                aria-label={`${p.name}, throw order ${i + 1}. Drag or use arrow keys to reorder.`}
                onPointerDown={(e) => handleDragPointerDown(e, i)}
                onKeyDown={(e) => handleChipKeyDown(e, i)}
                className={`relative flex items-center gap-1.5 touch-none select-none [-webkit-tap-highlight-color:transparent] ${
                  selectedPlayers.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                } ${drag?.index === i ? 'z-10' : ''}`}
                style={{
                  transform: `translateX(${offsetFor(i)}px) scale(${held ? 1.06 : 1})`,
                  transition: animate ? 'transform 170ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
                }}
              >
                <Avatar name={p.name} size={26} accent={SLOT_ACCENTS[seat]} />
                <span className="text-[14px] font-semibold tabular-nums" style={{ color: ACCENTS[SLOT_ACCENTS[seat]].ink }}>
                  P{seat + 1}
                </span>
              </button>
            );
          })}
        </div>
        <span className="text-[14px] font-medium text-subtle tabular-nums">
          {remaining > 0 ? `${remaining} left` : 'All set'}
        </span>
      </div>
      {selectedPlayers.length > 1 && (
        <p className="mt-1.5 px-0.5 text-[12px] font-medium text-subtle">Drag a player above to reorder who starts first</p>
      )}

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
