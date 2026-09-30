import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartColumn, ChartPie, ChevronRight, Clock3, Flame, Globe, Plus, Target, Trophy, UserPlus, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useHistoryStore, computeX01Avg, computeHighOut, computeBestLeg } from '../store/historyStore';
import { useAuthStore } from '../store/authStore';
import { useLobbyStore } from '../store/lobbyStore';
import { isOnlineModeAvailable } from '../lib/supabase';
import bdcLogo from '../assets/bdc-logo-transparent.png';
import type { SelectedPlayer } from '../components/shared/PlayerSelector';
import { MatchSetupSheet } from '../components/shared/MatchSetupSheet';
import type { SetupMode } from '../components/shared/MatchSetupSheet';
import { Avatar, Badge, ShellTitle, StatTile } from '../components/shared/SoftUI';
import { CricketIcon, DartIcon, ModeIcon } from '../components/shared/ModeIcon';
import { ACCENTS, SLOT_ACCENTS } from '../components/shared/softTokens';
import type { Accent } from '../components/shared/softTokens';

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return 'Late session';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Staggered entrance for the stacked cards */
const rise = (i: number): CSSProperties => ({ animationDelay: `${i * 60}ms` });

export function HomePage() {
  const navigate = useNavigate();
  const { gameState } = useGameStore();
  const { gameHistory } = useHistoryStore();
  const { profile } = useAuthStore();
  const { myInvites, fetchMyInvites, subscribeToMyInvites, unsubscribeFromMyInvites, createLobby, respondToInvite } = useLobbyStore();
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnlineModeAvailable) return;
    fetchMyInvites();
    subscribeToMyInvites();
    return () => unsubscribeFromMyInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenLobby = async () => {
    setLobbyError(null);
    const id = await createLobby();
    if (id) {
      navigate(`/lobby/${id}`);
    } else {
      setLobbyError(useLobbyStore.getState().error ?? 'Could not create lobby');
    }
  };

  // Computed stats
  const x01Avg = computeX01Avg(gameHistory);
  const highOut = computeHighOut(gameHistory);
  const bestLeg = computeBestLeg(gameHistory);
  const gamesPlayed = gameHistory.length;

  const [setupMode, setSetupMode] = useState<SetupMode | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [numPlayers, setNumPlayers] = useState(2);

  const statsHeadline =
    x01Avg > 0
      ? `Averaging ${x01Avg} a visit.`
      : gamesPlayed > 0
        ? `${gamesPlayed} ${gamesPlayed === 1 ? 'game' : 'games'} in the books.`
        : 'No games yet. The board is waiting.';

  const ongoing = gameState?.status === 'ongoing' ? gameState : null;

  return (
    <div className="flex flex-col h-dvh overflow-y-auto w-full bg-canvas font-sans text-slate pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),16px)]">

      <div className="flex flex-col gap-4 px-4 pt-3 pb-8 max-w-md mx-auto w-full">

        {/* Header */}
        <header className="flex items-center justify-between px-2 soft-rise" style={rise(0)}>
          <div className="flex flex-col">
            <img src={bdcLogo} alt="BDC" className="h-9 w-auto self-start" />
            <span className="mt-2 text-[15px] font-medium text-subtle">
              {greeting(new Date())}{profile?.username ? `, ${profile.username}` : ''}
            </span>
          </div>

          <button
            id="home-avatar-btn"
            onClick={() => navigate('/profile')}
            aria-label="Profile"
            className="w-12 h-12 rounded-full soft-float soft-press flex items-center justify-center shrink-0"
          >
            {profile?.username ? (
              <Avatar name={profile.username} size={40} accent="azure" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-slate-soft)" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
              </svg>
            )}
          </button>
        </header>

        {/* Lobby invites */}
        {myInvites.length > 0 && (
          <section className="soft-shell p-2 soft-rise" style={rise(1)}>
            <div className="px-4 pt-4 pb-3">
              <ShellTitle icon={UserPlus}>Lobby invites</ShellTitle>
            </div>
            <ul className="soft-card px-4 divide-y divide-line/70">
              {myInvites.map((invite) => (
                <li key={invite.participantId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium text-slate">{invite.lobbyName}</p>
                    <p className="text-[13px] text-subtle">from {invite.hostName}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => respondToInvite(invite.participantId, false)}
                      className="h-9 px-3.5 rounded-full soft-float soft-press text-[14px] font-semibold text-slate-soft"
                    >
                      Decline
                    </button>
                    <button
                      onClick={async () => { await respondToInvite(invite.participantId, true); navigate(`/lobby/${invite.lobbyId}`); }}
                      className="h-9 px-3.5 rounded-full soft-primary soft-press text-[14px] font-semibold"
                    >
                      Join
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resume — ticket-style card for the game in progress */}
        {ongoing && (
          <section className="soft-shell p-2 soft-rise" style={rise(1)}>
            <div className="soft-card p-5">
              <div className="flex items-center justify-between">
                <Badge accent="mint">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-mint animate-ping opacity-60" />
                    <span className="relative w-2 h-2 rounded-full bg-mint-ink" />
                  </span>
                  In progress
                </Badge>
                <span className="text-[15px] font-medium text-subtle tabular-nums">Round {ongoing.currentRound}</span>
              </div>

              <p className="mt-4 text-[22px] font-semibold tracking-display text-slate">Pick up where you left off.</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {ongoing.players.slice(0, 4).map((p, i) => (
                    <Avatar key={p.participantId} name={p.displayName} size={30} accent={SLOT_ACCENTS[i % 4]} />
                  ))}
                </div>
                <span className="text-[15px] font-medium text-slate-soft">
                  {ongoing.players.length} {ongoing.players.length === 1 ? 'player' : 'players'}
                </span>
              </div>

              <button
                onClick={() => navigate('/game')}
                className="mt-5 w-full h-[52px] rounded-full soft-primary soft-press flex items-center justify-center gap-2 text-[16px] font-semibold"
              >
                Resume game
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="soft-shell p-2 soft-rise" style={rise(2)}>
          <div className="px-4 pt-4 pb-5">
            <ShellTitle
              icon={ChartPie}
              trailing={
                <button
                  onClick={() => navigate('/stats')}
                  className="flex items-center gap-0.5 text-[15px] font-medium text-subtle hover:text-slate-soft transition-colors"
                >
                  All stats <ChevronRight size={16} strokeWidth={2.4} />
                </button>
              }
            >
              Season
            </ShellTitle>
            <p className="mt-5 text-[26px] leading-[1.18] font-semibold tracking-display text-slate">{statsHeadline}</p>
            {gamesPlayed > 0 && x01Avg > 0 && (
              <p className="mt-1.5 text-[15px] font-medium text-subtle">
                {gamesPlayed} {gamesPlayed === 1 ? 'game' : 'games'} played
              </p>
            )}
          </div>

          <button
            onClick={() => navigate('/stats')}
            className="soft-card soft-press w-full grid grid-cols-3 p-2 text-left"
          >
            <StatTile icon={Target} accent="mint" value={x01Avg} label="3-dart avg" />
            <StatTile icon={Trophy} accent="azure" value={highOut} label="High out" divider />
            <StatTile icon={Flame} accent="coral" value={bestLeg} label="Best leg" divider />
          </button>
        </section>

        {/* Play */}
        <section className="soft-shell p-2 soft-rise" style={rise(3)}>
          <div className="px-4 pt-4 pb-4">
            <ShellTitle icon={Target}>Play</ShellTitle>
          </div>

          <div className="flex flex-col gap-2">
            <ModeRow
              icon={<DartIcon />}
              accent="mint"
              title="X01"
              subtitle="301 · 501 · 701"
              badge={<Badge accent="mint">Classic</Badge>}
              onClick={() => setSetupMode('x01')}
            />
            <ModeRow
              icon={<Clock3 size={22} strokeWidth={2.2} />}
              accent="azure"
              title="Around the Clock"
              subtitle="Hit 1 to 20 in order"
              badge={<Badge accent="azure">Practice</Badge>}
              onClick={() => setSetupMode('around_the_clock')}
            />
            <ModeRow
              icon={<Globe size={22} strokeWidth={2.2} />}
              accent="orchid"
              title="Round the World"
              subtitle="Points on every number"
              badge={<Badge accent="orchid">Practice</Badge>}
              onClick={() => setSetupMode('round_the_world')}
            />
            <ModeRow
              icon={<Users size={22} strokeWidth={2.2} />}
              accent="coral"
              title="Lobby"
              subtitle="Play with friends online"
              badge={<Badge accent="coral">Online</Badge>}
              onClick={isOnlineModeAvailable ? handleOpenLobby : undefined}
            />
            <ModeRow
              icon={<CricketIcon />}
              accent="coral"
              title="Cricket"
              subtitle="Close out 15 to 20 and bull"
              badge={<Badge accent="coral">Soon</Badge>}
            />
          </div>

          {lobbyError && (
            <p className="mt-2 mx-1 text-[13px] font-medium text-[#C4413A]">{lobbyError}</p>
          )}

          <div className="flex items-center gap-3 pt-3 px-1 pb-1">
            <button
              onClick={() => setSetupMode('x01')}
              className="flex-1 h-[58px] rounded-full soft-primary soft-press flex items-center justify-center gap-2.5 text-[17px] font-semibold"
            >
              <Plus size={20} strokeWidth={2.6} />
              New match
            </button>
            <button
              onClick={() => navigate('/stats')}
              aria-label="Stats"
              className="w-[58px] h-[58px] rounded-full soft-float soft-press flex items-center justify-center text-charcoal shrink-0"
            >
              <ChartColumn size={21} strokeWidth={2.4} />
            </button>
          </div>
        </section>

        <footer className="pt-2 text-center">
          <span className="text-[12px] font-medium text-subtle">Scoreboard · v1.0</span>
        </footer>
      </div>

      {setupMode && (
        <MatchSetupSheet
          key={setupMode}
          mode={setupMode}
          icon={<ModeIcon mode={setupMode} size={20} />}
          numPlayers={numPlayers}
          onNumPlayersChange={setNumPlayers}
          selectedPlayers={selectedPlayers}
          onSelectedPlayersChange={setSelectedPlayers}
          onClose={() => setSetupMode(null)}
        />
      )}
    </div>
  );
}

function ModeRow({ icon, accent, title, subtitle, badge, onClick }: {
  icon: ReactNode;
  accent: Accent;
  title: string;
  subtitle: string;
  badge: ReactNode;
  onClick?: () => void;
}) {
  const a = ACCENTS[accent];
  const disabled = !onClick;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="soft-card soft-press w-full flex items-center gap-3.5 p-2.5 pr-4 text-left disabled:active:scale-100"
    >
      <span
        className={`w-[54px] h-[54px] rounded-[16px] flex items-center justify-center shrink-0 ${disabled ? 'opacity-50' : ''}`}
        style={{ background: a.tint, color: a.ink }}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[18px] font-semibold tracking-display truncate ${disabled ? 'text-subtle' : 'text-slate'}`}>{title}</span>
        <span className="block mt-0.5 text-[14px] font-medium text-subtle truncate">{subtitle}</span>
      </span>
      {badge}
    </button>
  );
}
