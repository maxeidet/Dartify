import { useEffect, useState } from 'react';
import { Check, User, UserPlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { usePlayerStore } from '../../store/playerStore';
import { useLobbyStore } from '../../store/lobbyStore';
import { Avatar, Segmented } from './SoftUI';

type Tab = 'friends' | 'local';

interface FriendOption {
  id: string;
  username: string;
}

interface InviteFriendsSheetProps {
  onClose: () => void;
}

export function InviteFriendsSheet({ onClose }: InviteFriendsSheetProps) {
  const { user } = useAuthStore();
  const { participants, inviteFriend, addLocalPlayer } = useLobbyStore();
  const { players: localPlayers, fetchPlayers, addPlayer } = usePlayerStore();

  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const close = () => setClosing(true);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
        .from('friends')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const otherIds = (data ?? []).map(r => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
      if (otherIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', otherIds);
      setFriends((profiles as FriendOption[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const invitedProfileIds = new Set(participants.map(p => p.profile_id).filter(Boolean));
  const addedLocalIds = new Set(participants.map(p => p.local_player_id).filter(Boolean));

  const handleAddLocalPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setIsAdding(true);
    const added = await addPlayer(newPlayerName);
    if (added) {
      setNewPlayerName('');
      await addLocalPlayer(added.id);
    }
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-[rgba(20,24,32,0.32)] backdrop-blur-[6px] ${closing ? 'soft-scrim-out' : 'soft-scrim'}`}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invite players"
        onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) onClose(); }}
        className={`relative w-full max-w-md mx-auto max-h-[86dvh] flex flex-col bg-shell rounded-t-[32px] shadow-[0_-12px_40px_rgba(20,24,32,0.18)] ${closing ? 'soft-sheet-out' : 'soft-sheet'}`}
      >
        <div className="flex justify-center pt-2.5">
          <span className="w-9 h-[5px] rounded-full bg-[#D5D6DA]" />
        </div>

        <div className="px-6 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-soft">
            <UserPlus size={20} strokeWidth={2.2} />
            <h2 className="text-[21px] font-semibold tracking-display leading-none">Invite players</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="w-9 h-9 rounded-full soft-float soft-press flex items-center justify-center text-slate-soft"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="px-4 pt-4">
          <Segmented
            ariaLabel="Invite type"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'friends', label: 'Friends' },
              { value: 'local', label: 'Local player' },
            ]}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
          {tab === 'friends' ? (
            loading ? (
              <p className="py-10 text-center text-[14px] text-subtle">Loading friends…</p>
            ) : friends.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-subtle">
                No friends yet. Add friends from your profile page first.
              </p>
            ) : (
              <ul className="soft-card px-3 divide-y divide-line/70">
                {friends.map((f) => {
                  const invited = invitedProfileIds.has(f.id);
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-3 py-3 px-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={f.username} size={34} />
                        <span className="truncate text-[16px] font-medium text-slate">{f.username}</span>
                      </div>
                      {invited ? (
                        <span className="flex items-center gap-1 text-[13px] font-medium text-subtle shrink-0">
                          <Check size={14} strokeWidth={2.6} /> Invited
                        </span>
                      ) : (
                        <button
                          onClick={() => inviteFriend(f.id)}
                          className="h-9 px-4 rounded-full soft-primary soft-press text-[14px] font-semibold shrink-0"
                        >
                          Invite
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <p className="px-1 text-[13px] text-subtle">
                Local players join instantly and play from your device, just like a local match.
              </p>
              <ul className="soft-card px-3 divide-y divide-line/70">
                {localPlayers.length === 0 && (
                  <li className="py-6 text-center text-[14px] text-subtle">No saved local players yet</li>
                )}
                {localPlayers.map((p) => {
                  const added = addedLocalIds.has(p.id);
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3 px-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={p.name} size={34} />
                        <span className="truncate text-[16px] font-medium text-slate">{p.name}</span>
                      </div>
                      {added ? (
                        <span className="flex items-center gap-1 text-[13px] font-medium text-subtle shrink-0">
                          <Check size={14} strokeWidth={2.6} /> Added
                        </span>
                      ) : (
                        <button
                          onClick={() => addLocalPlayer(p.id)}
                          className="h-9 px-4 rounded-full soft-primary soft-press text-[14px] font-semibold shrink-0"
                        >
                          Add
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              <form
                onSubmit={handleAddLocalPlayer}
                className="flex items-center gap-2 h-[52px] pl-4 pr-1.5 rounded-full bg-track/70 border border-[#E4E5E8] focus-within:bg-white focus-within:border-[#D5D7DC] transition-colors"
              >
                <User size={18} strokeWidth={2} className="text-subtle shrink-0" />
                <input
                  type="text"
                  placeholder="New local player"
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
          )}
        </div>
      </div>
    </div>
  );
}
