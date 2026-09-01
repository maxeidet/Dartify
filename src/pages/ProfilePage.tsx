import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Profile } from '../store/authStore';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type FriendStatus = 'accepted' | 'pending';

interface FriendRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatus;
  profile: Profile; // the OTHER person's profile
  direction: 'incoming' | 'outgoing';
}

type Tab = 'friends' | 'pending';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-forest flex items-center justify-center text-white font-display font-black shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, updateUsername, signOut } = useAuthStore();

  // Username editing
  const [usernameInput, setUsernameInput] = useState(profile?.username ?? '');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Sync when profile loads
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile?.username) setUsernameInput(profile.username);
  }, [profile?.username]);

  const handleSaveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    setUsernameSaving(true);
    setUsernameMsg(null);
    try {
      await updateUsername(trimmed);
      setUsernameMsg({ type: 'ok', text: 'Username saved!' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      setUsernameMsg({ type: 'err', text: msg });
    } finally {
      setUsernameSaving(false);
    }
  };

  // Friends
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [requestSent, setRequestSent] = useState<Set<string>>(new Set());

  const loadFriends = async () => {
    if (!user) return;
    setFriendsLoading(true);

    // Fetch all friend rows involving the current user
    const { data, error } = await supabase
      .from('friends')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error || !data) {
      setFriendsLoading(false);
      return;
    }

    // Fetch profiles for the "other" person in each row
    const otherIds = data.map((r) =>
      r.requester_id === user.id ? r.addressee_id : r.requester_id
    );

    const { data: profiles } = otherIds.length
      ? await supabase.from('profiles').select('*').in('id', otherIds)
      : { data: [] };

    const profileMap = new Map<string, Profile>(
      (profiles ?? []).map((p: Profile) => [p.id, p])
    );

    const rows: FriendRow[] = data.map((r) => {
      const otherId = r.requester_id === user.id ? r.addressee_id : r.requester_id;
      return {
        id: r.id,
        requester_id: r.requester_id,
        addressee_id: r.addressee_id,
        status: r.status as FriendStatus,
        profile: profileMap.get(otherId) ?? { id: otherId, username: 'Unknown' },
        direction: r.requester_id === user.id ? 'outgoing' : 'incoming',
      };
    });

    setFriends(rows);
    setFriendsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearchLoading(true);
    setSearchDone(false);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', user.id)
      .limit(10);
    setSearchResults((data as Profile[]) ?? []);
    setSearchLoading(false);
    setSearchDone(true);
  };

  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;
    await supabase.from('friends').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    });
    setRequestSent((prev) => new Set([...prev, addresseeId]));
    loadFriends();
  };

  const handleAccept = async (rowId: string) => {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', rowId);
    loadFriends();
  };

  const handleRemove = async (rowId: string) => {
    await supabase.from('friends').delete().eq('id', rowId);
    loadFriends();
  };

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const pendingIncoming = friends.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const pendingOutgoing = friends.filter((f) => f.status === 'pending' && f.direction === 'outgoing');
  const pendingCount = pendingIncoming.length;

  const displayName = profile?.username ?? user?.email ?? 'Player';

  return (
    <div className="flex flex-col h-screen overflow-y-auto w-full bg-cream bg-dart-texture font-sans text-ink pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="relative px-[22px] pt-[18px] pb-10 z-10 flex flex-col gap-6 max-w-md mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            id="profile-back"
            onClick={() => navigate('/')}
            className="text-muted hover:text-forest transition-colors font-display font-bold text-sm"
          >
            ← Back
          </button>
          <span className="font-sans text-[11px] font-bold tracking-[2.6px] text-forest-deep uppercase">Profile</span>
          <button
            id="profile-signout"
            onClick={signOut}
            className="text-[10px] font-bold text-muted hover:text-red-500 transition-colors uppercase tracking-[1.2px]"
          >
            Sign Out
          </button>
        </div>

        {/* Avatar + Username */}
        <div className="bg-panel border border-line rounded-[20px] p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} size={52} />
            <div>
              <p className="font-display font-black text-xl text-forest-deep leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted font-medium mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
              Username
            </label>
            <div className="flex gap-2">
              <input
                id="username-input"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                placeholder="Pick a username…"
                className="flex-1 px-4 py-3 rounded-xl bg-cream border border-line text-forest-deep placeholder-muted text-sm font-sans font-semibold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
              />
              <button
                id="username-save"
                onClick={handleSaveUsername}
                disabled={usernameSaving || !usernameInput.trim()}
                className="px-4 py-3 rounded-xl bg-forest text-white font-sans font-bold text-sm transition-all hover:bg-forest-deep disabled:opacity-50 active:scale-[0.97] shrink-0"
              >
                {usernameSaving ? '…' : 'Save'}
              </button>
            </div>
            {usernameMsg && (
              <p className={`text-[11px] font-semibold ${usernameMsg.type === 'ok' ? 'text-forest' : 'text-red-500'}`}>
                {usernameMsg.text}
              </p>
            )}
          </div>
        </div>

        {/* Friends Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[14px] h-[2px] bg-gold-deep" />
            <span className="font-sans text-[11px] font-bold tracking-[2.6px] text-forest-deep uppercase">Friends</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              id="tab-friends"
              onClick={() => setTab('friends')}
              className={`flex-1 py-2.5 rounded-xl border font-sans font-bold text-xs transition-all ${tab === 'friends' ? 'bg-forest border-forest text-white' : 'bg-panel border-line text-muted hover:border-gold'}`}
            >
              Friends ({acceptedFriends.length})
            </button>
            <button
              id="tab-pending"
              onClick={() => setTab('pending')}
              className={`flex-1 py-2.5 rounded-xl border font-sans font-bold text-xs transition-all relative ${tab === 'pending' ? 'bg-forest border-forest text-white' : 'bg-panel border-line text-muted hover:border-gold'}`}
            >
              Pending
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold-deep text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* Friends list */}
          {friendsLoading ? (
            <div className="py-8 text-center text-muted text-sm font-medium">Loading…</div>
          ) : tab === 'friends' ? (
            acceptedFriends.length === 0 ? (
              <div className="py-8 text-center text-muted text-sm font-medium">No friends yet — add some below!</div>
            ) : (
              <div className="flex flex-col gap-2">
                {acceptedFriends.map((f) => (
                  <div key={f.id} className="bg-panel border border-line rounded-[14px] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={f.profile.username ?? '?'} size={34} />
                      <span className="font-sans font-bold text-sm text-forest-deep">{f.profile.username ?? 'Unknown'}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(f.id)}
                      className="text-[10px] font-bold text-muted hover:text-red-500 transition-colors uppercase tracking-[1px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-3">
              {/* Incoming */}
              {pendingIncoming.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[1.4px]">Incoming Requests</p>
                  {pendingIncoming.map((f) => (
                    <div key={f.id} className="bg-panel border border-line rounded-[14px] px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={f.profile.username ?? '?'} size={34} />
                        <span className="font-sans font-bold text-sm text-forest-deep">{f.profile.username ?? 'Unknown'}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAccept(f.id)}
                          className="px-3 py-1.5 rounded-lg bg-forest text-white font-sans font-bold text-[11px] hover:bg-forest-deep transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRemove(f.id)}
                          className="px-3 py-1.5 rounded-lg border border-line text-muted font-sans font-bold text-[11px] hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Outgoing */}
              {pendingOutgoing.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-[1.4px]">Sent Requests</p>
                  {pendingOutgoing.map((f) => (
                    <div key={f.id} className="bg-panel border border-line rounded-[14px] px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={f.profile.username ?? '?'} size={34} />
                        <span className="font-sans font-bold text-sm text-forest-deep">{f.profile.username ?? 'Unknown'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-[1px]">Pending…</span>
                    </div>
                  ))}
                </div>
              )}

              {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
                <div className="py-6 text-center text-muted text-sm font-medium">No pending requests</div>
              )}
            </div>
          )}

          {/* Add Friend Search */}
          <div className="bg-panel border border-line rounded-[20px] p-4 flex flex-col gap-3">
            <p className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">Add Friend</p>
            <div className="flex gap-2">
              <input
                id="friend-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchDone(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username…"
                className="flex-1 px-4 py-3 rounded-xl bg-cream border border-line text-forest-deep placeholder-muted text-sm font-sans font-semibold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
              />
              <button
                id="friend-search-btn"
                onClick={handleSearch}
                disabled={searchLoading || !searchQuery.trim()}
                className="px-4 py-3 rounded-xl bg-forest text-white font-sans font-bold text-sm transition-all hover:bg-forest-deep disabled:opacity-50 active:scale-[0.97] shrink-0"
              >
                {searchLoading ? '…' : 'Search'}
              </button>
            </div>

            {searchDone && (
              searchResults.length === 0 ? (
                <p className="text-[11px] text-muted font-medium text-center py-2">No users found</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchResults.map((p) => {
                    const alreadyFriend = friends.some((f) => f.profile.id === p.id);
                    const sent = requestSent.has(p.id) || alreadyFriend;
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.username ?? '?'} size={32} />
                          <span className="font-sans font-bold text-sm text-forest-deep">{p.username}</span>
                        </div>
                        <button
                          onClick={() => handleSendRequest(p.id)}
                          disabled={sent}
                          className={`px-3 py-1.5 rounded-lg font-sans font-bold text-[11px] transition-colors shrink-0 ${
                            sent
                              ? 'bg-line text-muted cursor-default'
                              : 'bg-gold text-white hover:bg-gold-deep'
                          }`}
                        >
                          {sent ? (alreadyFriend ? 'Friends' : 'Sent') : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
