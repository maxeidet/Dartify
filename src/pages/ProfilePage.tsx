import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Profile } from '../store/authStore';
import { AtSign, Search, UserPlus, Users } from 'lucide-react';
import { Avatar, Badge, PageHeader, Segmented, ShellTitle } from '../components/shared/SoftUI';

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
// Page
// ─────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, updateUsername, signOut } = useAuthStore();

  // Username editing
  const [usernameInput, setUsernameInput] = useState(profile?.username ?? '');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Sync when profile loads (adjust state during render rather than in an effect)
  const [syncedUsername, setSyncedUsername] = useState(profile?.username);
  if (profile?.username && profile.username !== syncedUsername) {
    setSyncedUsername(profile.username);
    setUsernameInput(profile.username);
  }

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

  const usernameUnchanged = !usernameInput.trim() || usernameInput === profile?.username;

  return (
    <div className="flex flex-col h-dvh overflow-y-auto w-full bg-canvas font-sans text-slate pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="flex flex-col gap-4 px-4 pt-3 pb-8 max-w-md mx-auto w-full">

        <PageHeader
          title="Profile"
          onBack={() => navigate('/')}
          trailing={
            <button
              onClick={signOut}
              className="h-11 px-4 rounded-full soft-float soft-press text-[15px] font-semibold text-slate-soft"
            >
              Sign out
            </button>
          }
        />

        {/* Identity */}
        <section className="soft-shell p-2 soft-rise">
          <div className="px-4 pt-5 pb-5 flex items-center gap-4">
            <Avatar name={displayName} size={68} accent="azure" />
            <div className="min-w-0">
              <h1 className="text-[26px] leading-tight font-semibold tracking-display text-slate truncate">{displayName}</h1>
              <p className="mt-0.5 text-[14px] font-medium text-subtle truncate">{user?.email}</p>
              <p className="mt-1.5 text-[14px] font-medium text-slate-soft">
                <span className="text-slate font-semibold tabular-nums">{acceptedFriends.length}</span>{' '}
                {acceptedFriends.length === 1 ? 'friend' : 'friends'}
              </p>
            </div>
          </div>

          <div className="soft-card p-5">
            <label className="block text-[17px] font-semibold text-slate mb-3" htmlFor="username-input">
              Username
            </label>
            <div className="flex items-center gap-2 h-[52px] pl-4 pr-1.5 rounded-full bg-track/70 border border-[#E4E5E8] focus-within:bg-white focus-within:border-[#D5D7DC] transition-colors">
              <AtSign size={18} strokeWidth={2} className="text-subtle shrink-0" />
              <input
                id="username-input"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                placeholder="Set username"
                className="flex-1 min-w-0 bg-transparent text-[16px] font-medium text-slate placeholder:text-subtle focus:outline-none"
              />
              <button
                onClick={handleSaveUsername}
                disabled={usernameSaving || usernameUnchanged}
                className="h-10 px-4 rounded-full soft-primary soft-press text-[14px] font-semibold"
              >
                {usernameSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {usernameMsg && (
              <p className={`mt-2 px-1 text-[13px] font-medium ${usernameMsg.type === 'ok' ? 'text-mint-ink' : 'text-[#C4413A]'}`}>
                {usernameMsg.text}
              </p>
            )}
          </div>
        </section>

        {/* Friends */}
        <section className="soft-shell p-2 soft-rise" style={{ animationDelay: '60ms' }}>
          <div className="px-4 pt-4 pb-4">
            <ShellTitle icon={Users}>Friends</ShellTitle>
          </div>

          <div className="px-1 pb-2">
            <Segmented
              ariaLabel="Friends list"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'friends', label: 'My friends' },
                {
                  value: 'pending',
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      Requests
                      {pendingCount > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-coral text-white text-[11px] font-bold inline-flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <div className="soft-card px-5 py-2">
            {friendsLoading ? (
              <p className="py-10 text-center text-[14px] text-subtle">Loading…</p>
            ) : tab === 'friends' ? (
              acceptedFriends.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-subtle">No friends yet. Search below to find players.</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {acceptedFriends.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={f.profile.username ?? '?'} size={38} />
                        <span className="truncate text-[16px] font-medium text-slate">{f.profile.username ?? 'Unknown'}</span>
                      </div>
                      <button
                        onClick={() => handleRemove(f.id)}
                        className="text-[14px] font-medium text-subtle hover:text-[#C4413A] transition-colors"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-subtle">No pending requests</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {pendingIncoming.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={f.profile.username ?? '?'} size={38} />
                      <span className="truncate text-[16px] font-medium text-slate">{f.profile.username ?? 'Unknown'}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRemove(f.id)}
                        className="h-9 px-3.5 rounded-full soft-float soft-press text-[14px] font-semibold text-slate-soft"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(f.id)}
                        className="h-9 px-3.5 rounded-full soft-primary soft-press text-[14px] font-semibold"
                      >
                        Accept
                      </button>
                    </div>
                  </li>
                ))}
                {pendingOutgoing.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={f.profile.username ?? '?'} size={38} />
                      <span className="truncate text-[16px] font-medium text-slate">{f.profile.username ?? 'Unknown'}</span>
                    </div>
                    <Badge accent="azure">Sent</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Find friends */}
        <section className="soft-shell p-2 soft-rise" style={{ animationDelay: '120ms' }}>
          <div className="px-4 pt-4 pb-4">
            <ShellTitle icon={UserPlus}>Find friends</ShellTitle>
          </div>

          <div className="soft-card p-4">
            <div className="flex items-center gap-2 h-[52px] pl-4 pr-1.5 rounded-full bg-track/70 border border-[#E4E5E8] focus-within:bg-white focus-within:border-[#D5D7DC] transition-colors">
              <Search size={18} strokeWidth={2} className="text-subtle shrink-0" />
              <input
                id="friend-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchDone(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username"
                className="flex-1 min-w-0 bg-transparent text-[16px] font-medium text-slate placeholder:text-subtle focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading || !searchQuery.trim()}
                className="h-10 px-4 rounded-full soft-primary soft-press text-[14px] font-semibold"
              >
                {searchLoading ? '…' : 'Search'}
              </button>
            </div>

            {searchDone && (
              searchResults.length === 0 ? (
                <p className="pt-4 pb-2 text-center text-[14px] text-subtle">No users found</p>
              ) : (
                <ul className="mt-2 px-1 divide-y divide-line/70">
                  {searchResults.map((p) => {
                    const alreadyFriend = friends.some((f) => f.profile.id === p.id);
                    const sent = requestSent.has(p.id) || alreadyFriend;
                    return (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={p.username ?? '?'} size={34} />
                          <span className="truncate text-[16px] font-medium text-slate">{p.username}</span>
                        </div>
                        {sent ? (
                          <Badge accent={alreadyFriend ? 'mint' : 'azure'}>{alreadyFriend ? 'Friends' : 'Sent'}</Badge>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(p.id)}
                            className="h-9 px-4 rounded-full soft-primary soft-press text-[14px] font-semibold shrink-0"
                          >
                            Add
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
