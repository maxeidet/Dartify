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
      className="rounded-full bg-[#1D1D1F] flex items-center justify-center text-white shrink-0 shadow-inner border-2 border-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      <span className='font-mono font-light'>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

// Minimal Icon helper components for the Apple look
const FriendIcon = () => <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.732 4c-.77.234-1.476.614-2.04 1.104A4.002 4.002 0 0012 11a3.998 3.998 0 003.732-3l1.732-.232M18.16 4.354a4 4 0 110 5.292" /></svg>;
const MailIcon = () => <svg className="w-4 h-4 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;

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

  return (
    // Clean, light grey background for the page
    <div className="flex flex-col h-dvh overflow-y-auto w-full bg-[#F0F0F2] font-sans text-[#1D1D1F] p-4">
      {/* Top Header - Kept compact */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-6 px-2">
        <button
          onClick={() => navigate('/')}
          className="text-[#86868B] hover:text-[#1D1D1F] transition-colors font-medium text-sm flex items-center gap-1.5"
        >
          <span className="text-xl">←</span> Settings
        </button>
        <button
          onClick={signOut}
          className="text-xs font-semibold text-[#86868B] hover:text-red-600 transition-colors uppercase tracking-[1px]"
        >
          Sign Out
        </button>
      </div>

      {/* MAIN CONTAINER CARD - Inspired by the Tayo image */}
      <div className="max-w-4xl mx-auto w-full shrink-0 bg-white rounded-[32px] shadow-sm border border-[#E5E5E7] overflow-hidden">
        
        {/* Banner Section with Fade Effect */}
        <div className="relative h-40 bg-gradient-to-br from-[#e5e5e7] to-[#f7f7f9]">
          {/* That distinct fade transition into the white card */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent to-white" />
        </div>

        {/* Content Section */}
        <div className="px-6 pb-12">

          {/* Avatar & Header Overlap */}
          <div className="flex flex-col justify-between gap-4 -mt-10 mb-8 relative z-10">
            <div className="flex flex-col gap-3">
              <Avatar name={displayName} size={90} />
              <div>
                <h1 className="font-bold text-2xl tracking-tight text-[#1D1D1F] lowercase">{displayName}</h1>
                <p className="text-sm text-[#86868B] flex items-center gap-1.5 mt-1">
                  <MailIcon /> {user?.email}
                </p>
              </div>
            </div>

            {/* Main Action Button - Matches "Following" Style */}
            <div className="shrink-0 flex items-center gap-4">
              <div className='flex items-center gap-1 text-sm text-[#86868B]'>
                  <FriendIcon />
                  <span className='font-semibold text-[#1D1D1F]'>{acceptedFriends.length}</span> <span className='text-xs'>Friends</span>
              </div>
              <button
                  onClick={handleSaveUsername}
                  disabled={usernameSaving || !usernameInput.trim() || usernameInput === profile?.username}
                  className="px-6 py-2.5 rounded-full bg-[#1D1D1F] text-white font-semibold text-sm transition-all hover:bg-black disabled:bg-[#E5E5E7] disabled:text-[#A1A1A6] active:scale-[0.98]"
              >
                  {usernameSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            {/* Left Column: Account Details */}
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[#86868B]" htmlFor="username-input">
                  Username
                </label>
                <input
                  id="username-input"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveUsername()}
                  placeholder="Set username…"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#E5E5E7] text-[#1D1D1F] placeholder-[#A1A1A6] text-sm focus:outline-none focus:border-[#86868B] focus:ring-1 focus:ring-[#86868B] transition-all"
                />
                {usernameMsg && (
                  <p className={`text-xs px-1 ${usernameMsg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                    {usernameMsg.text}
                  </p>
                )}
              </div>
              
              {/* Add Friend Section - Cleaned up */}
              <div className="bg-[#f7f7f9] border border-[#E5E5E7] rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-[#1D1D1F]">Find New Friends</h3>
                <div className="flex gap-2">
                  <input
                    id="friend-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchDone(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search username…"
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-white border border-[#E5E5E7] text-sm focus:outline-none focus:border-[#86868B] transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searchLoading || !searchQuery.trim()}
                    className="px-5 py-2.5 rounded-full bg-[#1D1D1F] text-white font-semibold text-xs transition-all hover:bg-black disabled:opacity-50"
                  >
                    {searchLoading ? '…' : 'Search'}
                  </button>
                </div>

                {searchDone && (
                  <div className="space-y-3 pt-2">
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-[#86868B] text-center">No users found</p>
                    ) : (
                      searchResults.map((p) => {
                        const alreadyFriend = friends.some((f) => f.profile.id === p.id);
                        const sent = requestSent.has(p.id) || alreadyFriend;
                        return (
                          <div key={p.id} className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5E5E7]">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={p.username ?? '?'} size={28} />
                              <span className="font-semibold text-sm lowercase text-[#1D1D1F]">{p.username}</span>
                            </div>
                            <button
                              onClick={() => handleSendRequest(p.id)}
                              disabled={sent}
                              className={`px-4 py-1.5 rounded-full font-bold text-xs transition-colors shrink-0 ${
                                sent
                                  ? 'bg-[#E5E5E7] text-[#86868B] cursor-default'
                                  : 'bg-[#1D1D1F] text-white hover:bg-black'
                              }`}
                            >
                              {sent ? (alreadyFriend ? 'Friends' : 'Sent') : 'Add'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Friends List/Pending */}
            <div className="space-y-6">
              
              {/* APPLE STYLE TABS */}
              <div className="flex items-center gap-6 border-b border-[#E5E5E7]">
                {(['friends', 'pending'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                      tab === t ? 'text-[#1D1D1F]' : 'text-[#86868B] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {t === 'friends' ? 'My Friends' : 'Requests'}
                    {t === 'pending' && pendingCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                    {/* Active Tab Indicator (Dot) */}
                    {tab === t && (
                      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#1D1D1F] rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* List Content */}
              {friendsLoading ? (
                <div className="py-12 text-center text-[#86868B] text-sm">Loading…</div>
              ) : tab === 'friends' ? (
                <div className="space-y-3">
                  {acceptedFriends.length === 0 ? (
                    <div className="py-12 text-center bg-[#f7f7f9] rounded-2xl border border-[#E5E5E7] text-[#86868B] text-sm">
                        No friends yet. Use search to find players.
                    </div>
                  ) : (
                    acceptedFriends.map((f) => (
                      <div key={f.id} className="bg-white border border-[#E5E5E7] rounded-2xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={f.profile.username ?? '?'} size={34} />
                          <span className="font-semibold text-sm text-[#1D1D1F] lowercase">{f.profile.username ?? 'Unknown'}</span>
                        </div>
                        <button
                          onClick={() => handleRemove(f.id)}
                          className="text-xs font-semibold text-[#86868B] hover:text-red-600 transition-colors lowercase"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Incoming */}
                  {pendingIncoming.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-[#86868B] lowercase tracking-wide">Incoming Requests</p>
                      {pendingIncoming.map((f) => (
                        <div key={f.id} className="bg-white border border-[#E5E5E7] rounded-2xl p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={f.profile.username ?? '?'} size={34} />
                            <span className="font-semibold text-sm text-[#1D1D1F] lowercase">{f.profile.username ?? 'Unknown'}</span>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleAccept(f.id)}
                              className="px-4 py-1.5 rounded-full bg-[#1D1D1F] text-white font-semibold text-xs hover:bg-black transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRemove(f.id)}
                              className="px-4 py-1.5 rounded-full border border-[#E5E5E7] text-[#1D1D1F] font-semibold text-xs hover:bg-[#f7f7f9] transition-colors"
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
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-[#86868B] lowercase tracking-wide">Sent Requests</p>
                      {pendingOutgoing.map((f) => (
                        <div key={f.id} className="bg-white border border-[#E5E5E7] rounded-2xl px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar name={f.profile.username ?? '?'} size={34} />
                            <span className="font-semibold text-sm text-[#1D1D1F] lowercase">{f.profile.username ?? 'Unknown'}</span>
                          </div>
                          <span className="text-xs text-[#86868B]">Pending…</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {pendingIncoming.length === 0 && pendingOutgoing.length === 0 && (
                    <div className="py-12 text-center bg-[#f7f7f9] rounded-2xl border border-[#E5E5E7] text-[#86868B] text-sm">No pending requests</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}