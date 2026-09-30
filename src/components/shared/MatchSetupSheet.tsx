import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, SlidersHorizontal, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import type { AroundTheClockConfig, GameConfig, Participant, RoundTheWorldConfig, X01Config } from '../../core/types';
import { PlayerSelector } from './PlayerSelector';
import type { SelectedPlayer } from './PlayerSelector';
import { Segmented, ToggleRow } from './SoftUI';

export type SetupMode = 'x01' | 'around_the_clock' | 'round_the_world';

type HitType = AroundTheClockConfig['hitType'];

const MODE_TITLES: Record<SetupMode, string> = {
  x01: 'X01',
  around_the_clock: 'Around the Clock',
  round_the_world: 'Round the World',
};

const HIT_TYPES: readonly { value: HitType; label: string; phrase: string }[] = [
  { value: 'any', label: 'Any', phrase: 'Any hit counts' },
  { value: 'singles', label: 'Singles', phrase: 'Singles only' },
  { value: 'double', label: 'Doubles', phrase: 'Doubles only' },
  { value: 'trebles', label: 'Trebles', phrase: 'Trebles only' },
];

interface MatchSetupSheetProps {
  mode: SetupMode;
  icon?: ReactNode;
  numPlayers: number;
  onNumPlayersChange: (n: number) => void;
  selectedPlayers: SelectedPlayer[];
  onSelectedPlayersChange: (players: SelectedPlayer[]) => void;
  onClose: () => void;
}

export function MatchSetupSheet({
  mode,
  icon,
  numPlayers,
  onNumPlayersChange,
  selectedPlayers,
  onSelectedPlayersChange,
  onClose,
}: MatchSetupSheetProps) {
  const navigate = useNavigate();
  const startLocalGame = useGameStore(s => s.startLocalGame);
  const [closing, setClosing] = useState(false);

  // X01
  const [startingScore, setStartingScore] = useState<301 | 501 | 701>(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [doubleIn, setDoubleIn] = useState(false);
  const [bestOfEnabled, setBestOfEnabled] = useState(false);
  const [legs, setLegs] = useState<3 | 5 | 7>(3);

  // Around the Clock / Round the World
  const [hitType, setHitType] = useState<HitType>('any');
  const [includesBull, setIncludesBull] = useState(true);

  const close = () => setClosing(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setClosing(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Shrinking the player count drops the players who no longer fit
  const handleNumPlayers = (n: number) => {
    onNumPlayersChange(n);
    if (selectedPlayers.length > n) onSelectedPlayersChange(selectedPlayers.slice(0, n));
  };

  const remaining = numPlayers - selectedPlayers.length;
  const ready = remaining === 0;

  const handleStart = () => {
    if (!ready) return;

    const participants: Participant[] = selectedPlayers.map((p, i) => ({
      id: p.id,
      type: 'local', // In a local game, all players are considered local to this device
      displayName: p.name,
      displayOrder: i,
    }));

    let config: GameConfig;
    if (mode === 'x01') {
      config = { mode: 'x01', startingScore, doubleOut, doubleIn, legs: bestOfEnabled ? legs : 1 } satisfies X01Config;
    } else if (mode === 'around_the_clock') {
      config = { mode: 'around_the_clock', hitType, includesBull } satisfies AroundTheClockConfig;
    } else {
      config = { mode: 'round_the_world', hitType: 'any', includesBull } satisfies RoundTheWorldConfig;
    }

    startLocalGame(participants, config);
    navigate('/game');
  };

  // Headline reads the current configuration back as a sentence
  const hitPhrase = HIT_TYPES.find(h => h.value === hitType)?.phrase ?? '';
  const headline =
    mode === 'x01'
      ? `${startingScore}${doubleIn ? ', double in' : ''}${doubleOut ? ', double out' : ', straight out'}.`
      : mode === 'around_the_clock'
        ? `1 to 20${includesBull ? ', then bull' : ''}.`
        : `Score on every number${includesBull ? ', finish on bull' : ''}.`;
  const subline =
    mode === 'x01'
      ? `${bestOfEnabled ? `Best of ${legs} legs` : 'First to zero wins'} · ${numPlayers} ${numPlayers === 1 ? 'player' : 'players'}`
      : mode === 'around_the_clock'
        ? `${hitPhrase} · ${numPlayers} ${numPlayers === 1 ? 'player' : 'players'}`
        : `Most points wins · ${numPlayers} ${numPlayers === 1 ? 'player' : 'players'}`;

  const title = MODE_TITLES[mode];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-[rgba(20,24,32,0.32)] backdrop-blur-[6px] ${closing ? 'soft-scrim-out' : 'soft-scrim'}`}
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Set up ${title}`}
        onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) onClose(); }}
        className={`relative w-full max-w-md mx-auto max-h-[94dvh] flex flex-col bg-shell rounded-t-[32px] shadow-[0_-12px_40px_rgba(20,24,32,0.18)] ${closing ? 'soft-sheet-out' : 'soft-sheet'}`}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2.5">
          <span className="w-9 h-[5px] rounded-full bg-[#D5D6DA]" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-soft">
            <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
            <h2 className="text-[21px] font-semibold tracking-display leading-none">{title}</h2>
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

        <div className="px-6 pt-5 pb-5">
          <p className="text-[28px] leading-[1.15] font-semibold tracking-display text-slate">{headline}</p>
          <p className="mt-1.5 text-[15px] text-subtle font-medium">{subline}</p>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 flex flex-col gap-3">

          <section className="soft-card p-5 flex flex-col gap-4">
            <SectionLabel icon={SlidersHorizontal}>Format</SectionLabel>

            {mode === 'x01' && (
              <Field label="Starting score">
                <Segmented
                  ariaLabel="Starting score"
                  value={startingScore}
                  onChange={setStartingScore}
                  options={[301, 501, 701].map(v => ({ value: v as 301 | 501 | 701, label: v }))}
                />
              </Field>
            )}

            {mode === 'around_the_clock' && (
              <Field label="Counts as a hit">
                <Segmented
                  ariaLabel="Counts as a hit"
                  value={hitType}
                  onChange={setHitType}
                  options={HIT_TYPES}
                />
              </Field>
            )}

            <Field label="Players">
              <Segmented
                ariaLabel="Number of players"
                value={numPlayers}
                onChange={handleNumPlayers}
                options={[1, 2, 3, 4].map(v => ({ value: v, label: v }))}
              />
            </Field>

            <div className="h-px bg-line/70 -mb-1" />

            <div className="flex flex-col -my-1">
              {mode === 'x01' ? (
                <>
                  <ToggleRow label="Double out" description="Finish on a double" checked={doubleOut} onChange={setDoubleOut} />
                  <ToggleRow label="Double in" description="Start scoring with a double" checked={doubleIn} onChange={setDoubleIn} />
                  <ToggleRow label="Best of X legs" description="Play a multi-leg match" checked={bestOfEnabled} onChange={setBestOfEnabled} />
                </>
              ) : (
                <ToggleRow label="Include bullseye" description="End the game on 25" checked={includesBull} onChange={setIncludesBull} />
              )}
            </div>

            {mode === 'x01' && bestOfEnabled && (
              <Field label="Legs">
                <Segmented
                  ariaLabel="Number of legs"
                  value={legs}
                  onChange={setLegs}
                  options={[3, 5, 7].map(v => ({ value: v as 3 | 5 | 7, label: v }))}
                />
              </Field>
            )}
          </section>

          <section className="soft-card p-5 flex flex-col gap-4">
            <SectionLabel icon={Users} trailing={`${selectedPlayers.length} of ${numPlayers}`}>Who's playing</SectionLabel>
            <PlayerSelector
              numPlayers={numPlayers}
              selectedPlayers={selectedPlayers}
              onChange={onSelectedPlayersChange}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] border-t border-white/80 bg-shell rounded-b-none">
          <button
            type="button"
            onClick={handleStart}
            disabled={!ready}
            className="w-full h-[58px] rounded-full soft-primary soft-press flex items-center justify-center gap-2.5 text-[17px] font-semibold"
          >
            <Play size={17} strokeWidth={2.5} fill="currentColor" />
            {ready ? 'Start match' : `Pick ${remaining} more ${remaining === 1 ? 'player' : 'players'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, children, trailing }: { icon: LucideIcon; children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[17px] font-semibold text-slate">
        <Icon size={17} strokeWidth={2.2} className="text-subtle" />
        {children}
      </span>
      {trailing && <span className="text-[15px] font-medium text-subtle tabular-nums">{trailing}</span>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-subtle pl-1">{label}</span>
      {children}
    </div>
  );
}
