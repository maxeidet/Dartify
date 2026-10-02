import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Crown, LogOut, Play, SlidersHorizontal, UserMinus, UserPlus, Users } from 'lucide-react';
import { useLobbyStore } from '../store/lobbyStore';
import type { LobbyParticipantRecord } from '../store/lobbyStore';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import type { AroundTheClockConfig, GameConfig, RoundTheWorldConfig, X01Config } from '../core/types';
import { InviteFriendsSheet } from '../components/shared/InviteFriendsSheet';
import { Avatar, Badge, ConfirmDialog, PageHeader, Segmented, ShellTitle, ToggleRow } from '../components/shared/SoftUI';
import { ModeIcon } from '../components/shared/ModeIcon';

type GameFamily = 'x01' | 'around_the_clock' | 'round_the_world';

const GAME_FAMILIES: readonly { value: GameFamily; label: string }[] = [
  { value: 'x01', label: 'X01' },
  { value: 'around_the_clock', label: 'Clock' },
  { value: 'round_the_world', label: 'World' },
];

function defaultConfigFor(mode: GameFamily): GameConfig {
  if (mode === 'x01') return { mode: 'x01', startingScore: 501, doubleOut: true, doubleIn: false, legs: 1 };
  if (mode === 'around_the_clock') return { mode: 'around_the_clock', hitType: 'any', includesBull: true };
  return { mode: 'round_the_world', hitType: 'any', includesBull: true };
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    lobby, participants, loading, error,
    loadLobby, subscribe, unsubscribe, reset,
    respondToInvite, removeParticipant, leaveLobby, updateGameMode, startMatch,
  } = useLobbyStore();
  const currentMatchId = useGameStore(s => s.matchId);

  const [showInvite, setShowInvite] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadLobby(id);
    subscribe(id);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Every device (host included, as a safety net if the direct call in startMatch races) follows
  // the lobby into the match once the leader starts it.
  useEffect(() => {
    if (!lobby || lobby.status !== 'in_progress' || !lobby.active_match_id || !user) return;
    if (currentMatchId === lobby.active_match_id) {
      navigate('/game');
      return;
    }

    useLobbyStore.getState().joinActiveMatch().then(joined => {
      if (joined) navigate('/game');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.status, lobby?.active_match_id, participants, user, currentMatchId]);

  if (!id) return null;

  if (loading && !lobby) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <span className="w-7 h-7 rounded-full border-[3px] border-track border-t-slate-soft animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-[17px] font-medium text-subtle">
          {error ? error : "This lobby doesn't exist anymore."}
        </p>
        <button onClick={() => navigate('/')} className="h-12 px-6 rounded-full soft-primary soft-press text-[15px] font-semibold">
          Go home
        </button>
      </div>
    );
  }

  const isHost = lobby.host_id === user?.id;
  const me = participants.find(p => p.profile_id === user?.id);
  const config = lobby.game_config;
  const family: GameFamily = (config?.mode as GameFamily) ?? 'x01';

  // Pending invite — ask before showing the full lobby
  if (me && me.status === 'invited') {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-canvas px-6 text-center">
        <span className="w-16 h-16 rounded-[20px] bg-track flex items-center justify-center text-slate-soft">
          <Users size={28} strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-[24px] font-semibold tracking-display text-slate">{lobby.name ?? 'Lobby'}</h1>
          <p className="mt-1.5 text-[15px] text-subtle">You've been invited to join this lobby.</p>
        </div>
        <div className="flex gap-2 w-full max-w-xs">
          <button
            onClick={async () => { await respondToInvite(me.id, false); navigate('/'); }}
            className="flex-1 h-[52px] rounded-full soft-float soft-press text-[16px] font-semibold text-slate"
          >
            Decline
          </button>
          <button
            onClick={() => respondToInvite(me.id, true)}
            className="flex-1 h-[52px] rounded-full soft-primary soft-press text-[16px] font-semibold"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  const applyFamily = (next: GameFamily) => updateGameMode(defaultConfigFor(next));

  const applyX01 = (patch: Partial<X01Config>) => {
    const current = config as X01Config;
    updateGameMode({ ...current, ...patch });
  };
  const applyAtc = (patch: Partial<AroundTheClockConfig>) => {
    const current = config as AroundTheClockConfig;
    updateGameMode({ ...current, ...patch });
  };
  const applyRtw = (patch: Partial<RoundTheWorldConfig>) => {
    const current = config as RoundTheWorldConfig;
    updateGameMode({ ...current, ...patch });
  };

  const headline =
    family === 'x01'
      ? `${(config as X01Config).startingScore}${(config as X01Config).doubleIn ? ', double in' : ''}${(config as X01Config).doubleOut ? ', double out' : ', straight out'}${(config as X01Config).legs > 1 ? `, best of ${(config as X01Config).legs}` : ''}.`
      : family === 'around_the_clock'
        ? `1 to 20${(config as AroundTheClockConfig).includesBull ? ', then bull' : ''}.`
        : `Score on every number${(config as RoundTheWorldConfig).includesBull ? ', finish on bull' : ''}.`;

  const joinedCount = participants.filter(p => p.status === 'joined').length;

  const handleStart = async () => {
    setStarting(true);
    await startMatch();
    setStarting(false);
    // startMatch() already primes this device's gameStore directly — no need to wait for the realtime echo.
    if (useGameStore.getState().matchId) navigate('/game');
  };

  return (
    <div className="flex flex-col h-dvh overflow-y-auto w-full bg-canvas font-sans text-slate pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="flex flex-col gap-4 px-4 pt-3 pb-28 max-w-md mx-auto w-full">
        <PageHeader
          title={lobby.name ?? 'Lobby'}
          onBack={() => navigate('/')}
          trailing={
            <button
              onClick={() => setShowLeaveConfirm(true)}
              aria-label={isHost ? 'Delete lobby' : 'Leave lobby'}
              className="w-11 h-11 rounded-full soft-float soft-press flex items-center justify-center text-slate-soft"
            >
              <LogOut size={19} strokeWidth={2.2} />
            </button>
          }
        />

        {/* Players */}
        <section className="soft-shell p-2 soft-rise">
          <div className="px-4 pt-4 pb-3">
            <ShellTitle icon={Users} trailing={<span className="text-[15px] font-medium text-subtle tabular-nums">{joinedCount} joined</span>}>
              Players
            </ShellTitle>
          </div>

          <ul className="soft-card px-3 divide-y divide-line/70">
            {participants.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                isHostRow={p.profile_id === lobby.host_id}
                canRemove={isHost && p.profile_id !== lobby.host_id}
                onRemove={() => removeParticipant(p.id)}
              />
            ))}
          </ul>

          {isHost && (
            <button
              onClick={() => setShowInvite(true)}
              className="mt-3 mx-1 mb-1 w-[calc(100%-8px)] h-[52px] rounded-full soft-float soft-press flex items-center justify-center gap-2 text-[15px] font-semibold text-slate"
            >
              <UserPlus size={18} strokeWidth={2.3} />
              Invite players
            </button>
          )}
        </section>

        {/* Game mode */}
        <section className="soft-shell p-2 soft-rise" style={{ animationDelay: '60ms' }}>
          <div className="px-4 pt-4 pb-2">
            <ShellTitle icon={SlidersHorizontal}>Game mode</ShellTitle>
            <p className="mt-3 text-[22px] leading-[1.2] font-semibold tracking-display text-slate">{headline}</p>
            {!isHost && <p className="mt-1 text-[13px] font-medium text-subtle">Only the lobby leader can change this.</p>}
          </div>

          <div className={`soft-card p-5 flex flex-col gap-4 ${!isHost ? 'opacity-70 pointer-events-none' : ''}`}>
            <Field label="Game" icon={<ModeIcon mode={family} size={15} />}>
              <Segmented ariaLabel="Game mode" value={family} onChange={applyFamily} options={GAME_FAMILIES} />
            </Field>

            {family === 'x01' && (
              <>
                <Field label="Starting score">
                  <Segmented
                    ariaLabel="Starting score"
                    value={(config as X01Config).startingScore}
                    onChange={(v) => applyX01({ startingScore: v })}
                    options={[301, 501, 701].map(v => ({ value: v as 301 | 501 | 701, label: v }))}
                  />
                </Field>
                <div className="h-px bg-line/70 -mb-1" />
                <div className="flex flex-col -my-1">
                  <ToggleRow label="Double out" description="Finish on a double" checked={(config as X01Config).doubleOut} onChange={(v) => applyX01({ doubleOut: v })} />
                  <ToggleRow label="Double in" description="Start scoring with a double" checked={(config as X01Config).doubleIn} onChange={(v) => applyX01({ doubleIn: v })} />
                  <ToggleRow
                    label="Best of X legs"
                    description="Play a multi-leg match"
                    checked={(config as X01Config).legs > 1}
                    onChange={(enabled) => applyX01({ legs: enabled ? 3 : 1 })}
                  />
                </div>
                {(config as X01Config).legs > 1 && (
                  <Field label="Legs">
                    <Segmented
                      ariaLabel="Number of legs"
                      value={(config as X01Config).legs}
                      onChange={(v) => applyX01({ legs: v })}
                      options={[3, 5, 7].map(v => ({ value: v as 3 | 5 | 7, label: v }))}
                    />
                  </Field>
                )}
              </>
            )}

            {family === 'around_the_clock' && (
              <>
                <Field label="Counts as a hit">
                  <Segmented
                    ariaLabel="Counts as a hit"
                    value={(config as AroundTheClockConfig).hitType}
                    onChange={(v) => applyAtc({ hitType: v })}
                    options={[
                      { value: 'any', label: 'Any' },
                      { value: 'singles', label: 'Singles' },
                      { value: 'double', label: 'Doubles' },
                      { value: 'trebles', label: 'Trebles' },
                    ]}
                  />
                </Field>
                <div className="h-px bg-line/70 -mb-1" />
                <ToggleRow label="Include bullseye" description="End the game on 25" checked={(config as AroundTheClockConfig).includesBull} onChange={(v) => applyAtc({ includesBull: v })} />
              </>
            )}

            {family === 'round_the_world' && (
              <ToggleRow label="Include bullseye" description="Finish on 25" checked={(config as RoundTheWorldConfig).includesBull} onChange={(v) => applyRtw({ includesBull: v })} />
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] max-w-md mx-auto bg-canvas/95 backdrop-blur-sm">
        {isHost && error && (
          <p className="mb-2 text-center text-[13px] font-medium text-[#C4413A]">{error}</p>
        )}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={starting || joinedCount === 0}
            className="w-full h-[58px] rounded-full soft-primary soft-press flex items-center justify-center gap-2.5 text-[17px] font-semibold"
          >
            <Play size={17} strokeWidth={2.5} fill="currentColor" />
            {starting ? 'Starting…' : 'Start match'}
          </button>
        ) : (
          <div className="w-full h-[58px] rounded-full soft-float flex items-center justify-center text-[15px] font-semibold text-subtle">
            Waiting for the leader to start the match…
          </div>
        )}
      </div>

      {showInvite && <InviteFriendsSheet onClose={() => setShowInvite(false)} />}

      {showLeaveConfirm && (
        <ConfirmDialog
          icon={LogOut}
          title={isHost ? 'Delete this lobby?' : 'Leave this lobby?'}
          message={isHost ? 'This removes everyone and cancels any invites.' : "You'll be removed from the lobby."}
          cancelLabel="Cancel"
          confirmLabel={isHost ? 'Delete lobby' : 'Leave'}
          destructive
          onCancel={() => setShowLeaveConfirm(false)}
          onConfirm={async () => { await leaveLobby(); reset(); navigate('/'); }}
        />
      )}
    </div>
  );
}

function ParticipantRow({ participant, isHostRow, canRemove, onRemove }: {
  participant: LobbyParticipantRecord;
  isHostRow: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 px-1">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={participant.displayName} size={34} />
        <span className="truncate text-[16px] font-medium text-slate">{participant.displayName}</span>
        {isHostRow && <Crown size={15} strokeWidth={2.3} className="text-[#D9A441] shrink-0" />}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {participant.status === 'invited' && <Badge accent="azure">Invited</Badge>}
        {participant.status === 'declined' && <Badge accent="coral">Declined</Badge>}
        {canRemove && (
          <button onClick={onRemove} aria-label={`Remove ${participant.displayName}`} className="w-8 h-8 rounded-full soft-float soft-press flex items-center justify-center text-subtle">
            <UserMinus size={15} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </li>
  );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-subtle pl-1">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}
