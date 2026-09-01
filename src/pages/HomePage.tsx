import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import type { Participant, X01Config, AroundTheClockConfig } from '../core/types';
import { X } from 'lucide-react';
import bdcLogo from '../assets/bdc-logo-transparent.png';
import { PlayerSelector, SelectedPlayer } from '../components/shared/PlayerSelector';

function RingsEmblem({ size = 52 }: { size?: number }) {
  const layers = [
    { d: 1.00, c: '#BFA464' },   // gold
    { d: 0.88, c: '#F8F5EC' },   // cream
    { d: 0.72, c: '#22291F' },   // ink
    { d: 0.56, c: '#1A5833' },   // forest
    { d: 0.42, c: '#F8F5EC' },   // cream
    { d: 0.28, c: '#22291F' },   // ink
    { d: 0.15, c: '#A63B37' },   // red
  ];
  return (
    <div className="relative rounded-full shrink-0" style={{ width: size, height: size }}>
      {layers.map((l, i) => (
        <span
          key={i}
          className="absolute rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: size * l.d, height: size * l.d, background: l.c }}
        />
      ))}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { startLocalGame, gameState } = useGameStore();

  const [showX01Setup, setShowX01Setup] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [numPlayers, setNumPlayers] = useState(2);
  const [startingScore, setStartingScore] = useState<301 | 501 | 701>(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [doubleIn, setDoubleIn] = useState(false);

  const [showATCSetup, setShowATCSetup] = useState(false);
  const [atcHitType, setAtcHitType] = useState<'singles' | 'any'>('any');
  const [atcIncludesBull, setAtcIncludesBull] = useState(true);

  const [showRTWSetup, setShowRTWSetup] = useState(false);
  const [rtwIncludesBull, setRtwIncludesBull] = useState(true);

  const handleStart = () => {
    if (selectedPlayers.length !== numPlayers) {
      alert(`Please select ${numPlayers} players`);
      return;
    }

    const participants: Participant[] = selectedPlayers.map((p, i) => ({
      id: p.id,
      type: 'local', // In a local game, all players are considered local to this device
      displayName: p.name,
      displayOrder: i,
    }));

    const config: X01Config = {
      mode: 'x01',
      startingScore,
      doubleOut,
      doubleIn,
      legs: 1,
    };

    startLocalGame(participants, config);
    navigate('/game');
  };

  const handleStartATC = () => {
    if (selectedPlayers.length !== numPlayers) {
      alert(`Please select ${numPlayers} players`);
      return;
    }

    const participants: Participant[] = selectedPlayers.map((p, i) => ({
      id: p.id,
      type: 'local',
      displayName: p.name,
      displayOrder: i,
    }));

    const config: AroundTheClockConfig = {
      mode: 'around_the_clock',
      hitType: atcHitType,
      includesBull: atcIncludesBull,
    };

    startLocalGame(participants, config);
    navigate('/game');
  };

  const handleStartRTW = () => {
    if (selectedPlayers.length !== numPlayers) {
      alert(`Please select ${numPlayers} players`);
      return;
    }

    const participants: Participant[] = selectedPlayers.map((p, i) => ({
      id: p.id,
      type: 'local',
      displayName: p.name,
      displayOrder: i,
    }));

    const config = {
      mode: 'round_the_world',
      includesBull: rtwIncludesBull,
    };

    startLocalGame(participants, config as any);
    navigate('/game');
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto w-full bg-cream bg-dart-texture font-sans text-ink pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)]">

      <div className="relative pt-[26px] px-[22px] pb-12 z-10 flex flex-col flex-1 max-w-md mx-auto w-full">

        <header className="flex items-start justify-between gap-2.5">
          <div className="w-full max-w-[120px]">
            <img src={bdcLogo} alt="BDC Logo" className="w-full h-auto block" />
          </div>

          <div className="w-[42px] h-[42px] rounded-full border-[1.5px] border-forest flex items-center justify-center bg-panel shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-forest)" strokeWidth="1.6">
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
            </svg>
          </div>
        </header>

        <hr className="mt-5 border-gradient-rule" />

        {/* Season Stats Eyebrow */}
        <div className="flex items-center gap-2 mt-[26px] mb-3">
          <div className="w-[14px] h-[2px] bg-gold-deep"></div>
          <span className="font-sans text-[11px] font-bold tracking-[2.6px] text-forest-deep uppercase">
            Season Stats
          </span>
        </div>

        {/* Stats Panel */}
        <div className="relative bg-panel border border-line border-t-[3px] border-t-forest rounded-[18px] p-[20px_18px_18px] flex">

          <div className="flex-1 px-1.5">
            <div className="font-sans font-extrabold text-[26px] text-forest flex items-baseline gap-0.5 tabular-nums">
              12
            </div>
            <div className="mt-1.5 text-[9.5px] font-bold tracking-[1.6px] text-muted uppercase">Matches</div>
          </div>

          <div className="flex-1 px-1.5 border-l border-line">
            <div className="font-sans font-extrabold text-[26px] text-forest flex items-baseline gap-0.5 tabular-nums">
              67<span className="text-[13px] text-muted font-medium">%</span>
            </div>
            <div className="mt-1.5 text-[9.5px] font-bold tracking-[1.6px] text-muted uppercase">Win Rate</div>
          </div>

          <div className="flex-1 px-1.5 border-l border-line">
            <div className="font-sans font-extrabold text-[26px] text-gold-deep flex items-baseline gap-0.5 tabular-nums">
              112
            </div>
            <div className="mt-1.5 text-[9.5px] font-bold tracking-[1.6px] text-muted uppercase">High Out</div>
          </div>

        </div>

        {/* Resume banner */}
        {gameState?.status === 'ongoing' && (
          <button
            onClick={() => navigate('/game')}
            className="mt-4 w-full flex items-center justify-between p-4 rounded-[18px] bg-forest/5 border border-forest hover:bg-forest/10 transition-colors"
          >
            <div className="text-left">
              <p className="font-sans text-[10px] font-bold tracking-[2px] text-forest uppercase mb-1">Active Game</p>
              <p className="text-forest-deep font-display font-semibold text-lg tracking-wide">
                Round {gameState.currentRound} <span className="text-muted mx-1 font-sans font-normal">—</span> {gameState.players.length} players
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
          </button>
        )}

        {/* Play Eyebrow */}
        <div className="flex items-center gap-2 mt-[26px] mb-3">
          <div className="w-[14px] h-[2px] bg-gold-deep"></div>
          <span className="font-sans text-[11px] font-bold tracking-[2.6px] text-forest-deep uppercase">
            Play
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3">

          {/* X01 */}
          <div
            onClick={() => setShowX01Setup(true)}
            className="relative bg-panel border border-line rounded-[20px] p-[18px_16px_16px] cursor-pointer transition-all hover:-translate-y-[2px] hover:border-gold hover:shadow-[0_6px_16px_rgba(15,58,34,0.08)] group overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] bg-gold scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"></div>

            <div className="w-[38px] h-[38px] border border-line rounded-[10px] flex items-center justify-center mb-4 bg-cream">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M4 20 L15 9" stroke="#1A5833" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="16.5" cy="7.5" r="2" fill="#BFA464" />
                <path d="M18 6 L21 3 M19 8 L22 7 M17 4 L19 1" stroke="#96793A" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="font-display font-black text-[19px] tracking-[0.1px] text-forest-deep">X01</h3>
            <p className="mt-1 text-xs text-muted">301 / 501 / 701</p>
          </div>

          {/* LOBBY */}
          <div className="relative bg-panel border border-line rounded-[20px] p-[18px_16px_16px] cursor-pointer transition-all hover:-translate-y-[2px] hover:border-gold hover:shadow-[0_6px_16px_rgba(15,58,34,0.08)] group overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] bg-gold scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"></div>

            <div className="absolute top-3 right-3 flex items-center gap-[5px] p-[3px_9px_3px_7px] bg-cream border border-forest rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
              <span className="font-sans text-[9px] font-bold tracking-[1.2px] text-forest-deep uppercase">ONLINE</span>
            </div>

            <div className="w-[38px] h-[38px] border border-line rounded-[10px] flex items-center justify-center mb-4 bg-cream">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path d="M4 19 L13 9" stroke="#1A5833" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="14.3" cy="7.7" r="1.7" fill="#BFA464" />
                <path d="M20 19 L11 9" stroke="#75806F" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="9.7" cy="7.7" r="1.7" fill="#0F3A22" />
              </svg>
            </div>
            <h3 className="font-display font-black text-[19px] tracking-[0.1px] text-forest-deep">Lobby</h3>
            <p className="mt-1 text-xs text-muted">Play with friends</p>
          </div>

          {/* AROUND THE CLOCK */}
          <div
            onClick={() => setShowATCSetup(true)}
            className="relative bg-panel border border-line rounded-[20px] p-[18px_16px_16px] cursor-pointer transition-all hover:-translate-y-[2px] hover:border-gold hover:shadow-[0_6px_16px_rgba(15,58,34,0.08)] group overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] bg-gold scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"></div>

            <div className="w-[38px] h-[38px] border border-line rounded-[10px] flex items-center justify-center mb-4 bg-cream">
              <RingsEmblem size={22} />
            </div>
            <h3 className="font-display font-black text-[19px] tracking-[0.1px] text-forest-deep">Around Clock</h3>
            <p className="mt-1 text-xs text-muted">Hit 1 to 20</p>
          </div>

          {/* ROUND THE WORLD */}
          <div
            onClick={() => setShowRTWSetup(true)}
            className="relative bg-panel border border-line rounded-[20px] p-[18px_16px_16px] cursor-pointer transition-all hover:-translate-y-[2px] hover:border-gold hover:shadow-[0_6px_16px_rgba(15,58,34,0.08)] group overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] bg-gold scale-x-0 origin-left transition-transform duration-200 group-hover:scale-x-100"></div>

            <div className="w-[38px] h-[38px] border border-line rounded-[10px] flex items-center justify-center mb-4 bg-cream">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A5833" strokeWidth="1.6" strokeLinecap="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3 v18" />
                <path d="M3 12 h18" />
              </svg>
            </div>
            <h3 className="font-display font-black text-[19px] tracking-[0.1px] text-forest-deep">Round World</h3>
            <p className="mt-1 text-xs text-muted">Score points on targets</p>
          </div>

          {/* CRICKET */}
          <div className="relative bg-panel border border-line rounded-[20px] p-[18px_16px_16px] opacity-70">
            <div className="w-[38px] h-[38px] border border-line rounded-[10px] flex items-center justify-center mb-4 bg-cream">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1A5833" strokeWidth="1.6" strokeLinecap="round" className="w-5 h-5">
                <line x1="6" y1="5" x2="6" y2="17" />
                <line x1="10" y1="5" x2="10" y2="17" />
                <line x1="14" y1="5" x2="14" y2="17" />
                <line x1="5" y1="17" x2="15" y2="5" stroke="#BFA464" />
              </svg>
            </div>
            <h3 className="font-display font-black text-[19px] tracking-[0.1px] text-forest-deep">Cricket</h3>
            <p className="mt-1 text-xs text-muted">Close numbers</p>
          </div>

        </div>

        <footer className="mt-8 pt-4 border-t border-line text-center">
          <span className="font-sans text-[10px] font-semibold tracking-[2px] text-muted uppercase">SCOREBOARD — V1.0</span>
        </footer>

      </div>

      {/* X01 Setup Modal */}
      {showX01Setup && (
        <div className="fixed inset-0 z-50 bg-forest-deep/60 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">

          <div className="bg-cream rounded-t-[28px] w-full max-w-md mx-auto overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in slide-in-from-bottom-8 duration-300">

            <div className="flex justify-between items-center p-6 pb-2 border-b border-line bg-panel">
              <h2 className="font-display font-black text-[22px] text-forest-deep">Setup X01</h2>
              <button
                onClick={() => setShowX01Setup(false)}
                className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-muted hover:text-forest transition-colors"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

              {/* Starting Score */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Starting Score
                </label>
                <div className="flex gap-2">
                  {([301, 501, 701] as const).map((score) => (
                    <button
                      key={score}
                      onClick={() => setStartingScore(score)}
                      className={`
                        flex-1 py-3 rounded-xl border font-sans font-extrabold text-lg transition-all
                        ${startingScore === score
                          ? 'bg-forest border-forest text-white shadow-md'
                          : 'bg-panel border-line text-muted hover:border-gold'
                        }
                      `}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of players */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Players
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumPlayers(n)}
                      className={`
                        flex-1 py-3 rounded-xl border font-sans font-extrabold text-lg transition-all
                        ${numPlayers === n
                          ? 'bg-forest border-forest text-white shadow-md'
                          : 'bg-panel border-line text-muted hover:border-gold'
                        }
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Names */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Select Players ({selectedPlayers.length} / {numPlayers})
                </label>
                <PlayerSelector 
                  numPlayers={numPlayers} 
                  selectedPlayers={selectedPlayers} 
                  onChange={setSelectedPlayers} 
                />
              </div>

              {/* Rules */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Rules
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Double Out', desc: 'Must finish on a double', val: doubleOut, set: setDoubleOut },
                    { label: 'Double In', desc: 'Must start with a double', val: doubleIn, set: setDoubleIn },
                  ].map(({ label, desc, val, set }) => (
                    <div
                      key={label}
                      onClick={() => set(!val)}
                      className="flex items-center justify-between p-4 rounded-xl bg-panel border border-line cursor-pointer hover:border-gold transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-forest-deep">{label}</span>
                        <span className="text-[11px] font-medium text-muted mt-0.5">{desc}</span>
                      </div>
                      <div className={`
                        w-11 h-6 rounded-full relative transition-colors duration-300
                        ${val ? 'bg-forest' : 'bg-line'}
                      `}>
                        <div className={`
                          absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm
                          ${val ? 'left-6' : 'left-1'}
                        `} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-6 bg-panel border-t border-line">
              <button
                onClick={handleStart}
                className="
                  w-full py-4 rounded-xl bg-gold
                  font-sans font-bold text-lg text-white
                  hover:bg-gold-deep active:scale-[0.98] transition-all duration-200
                  shadow-[0_4px_14px_rgba(191,164,100,0.4)]
                "
              >
                START MATCH
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ATC Setup Modal */}
      {showATCSetup && (
        <div className="fixed inset-0 z-50 bg-forest-deep/60 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">

          <div className="bg-cream rounded-t-[28px] w-full max-w-md mx-auto overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in slide-in-from-bottom-8 duration-300">

            <div className="flex justify-between items-center p-6 pb-2 border-b border-line bg-panel">
              <h2 className="font-display font-black text-[22px] text-forest-deep">Setup Around Clock</h2>
              <button
                onClick={() => setShowATCSetup(false)}
                className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-muted hover:text-forest transition-colors"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

              {/* Number of players */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Players
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumPlayers(n)}
                      className={`
                        flex-1 py-3 rounded-xl border font-sans font-extrabold text-lg transition-all
                        ${numPlayers === n
                          ? 'bg-forest border-forest text-white shadow-md'
                          : 'bg-panel border-line text-muted hover:border-gold'
                        }
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Names */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Select Players ({selectedPlayers.length} / {numPlayers})
                </label>
                <PlayerSelector 
                  numPlayers={numPlayers} 
                  selectedPlayers={selectedPlayers} 
                  onChange={setSelectedPlayers} 
                />
              </div>

              {/* Game Settings */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Game Mode Settings
                </label>
                
                {/* Hit Type */}
                <div className="flex gap-2 mb-2">
                  {([
                    { value: 'any', label: 'Any Hit' },
                    { value: 'singles', label: 'Singles Only' }
                  ] as const).map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setAtcHitType(mode.value)}
                      className={`
                        flex-1 py-3 rounded-xl border font-sans font-extrabold text-[15px] transition-all
                        ${atcHitType === mode.value
                          ? 'bg-forest border-forest text-white shadow-md'
                          : 'bg-panel border-line text-muted hover:border-gold'
                        }
                      `}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setAtcIncludesBull(!atcIncludesBull)}
                    className="flex items-center justify-between p-4 rounded-xl bg-panel border border-line cursor-pointer hover:border-gold transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-forest-deep">Include Bullseye</span>
                      <span className="text-[11px] font-medium text-muted mt-0.5">End the game on 25</span>
                    </div>
                    <div className={`
                      w-11 h-6 rounded-full relative transition-colors duration-300
                      ${atcIncludesBull ? 'bg-forest' : 'bg-line'}
                    `}>
                      <div className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm
                        ${atcIncludesBull ? 'left-6' : 'left-1'}
                      `} />
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <div className="p-6 bg-panel border-t border-line">
              <button
                onClick={handleStartATC}
                className="
                  w-full py-4 rounded-xl bg-gold
                  font-sans font-bold text-lg text-white
                  hover:bg-gold-deep active:scale-[0.98] transition-all duration-200
                  shadow-[0_4px_14px_rgba(191,164,100,0.4)]
                "
              >
                START MATCH
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RTW Setup Modal */}
      {showRTWSetup && (
        <div className="fixed inset-0 z-50 bg-forest-deep/60 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">

          <div className="bg-cream rounded-t-[28px] w-full max-w-md mx-auto overflow-hidden shadow-2xl flex flex-col h-[90vh] animate-in slide-in-from-bottom-8 duration-300">

            <div className="flex justify-between items-center p-6 pb-2 border-b border-line bg-panel">
              <h2 className="font-display font-black text-[22px] text-forest-deep">Setup Round The World</h2>
              <button
                onClick={() => setShowRTWSetup(false)}
                className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-muted hover:text-forest transition-colors"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

              {/* Number of players */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Players
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumPlayers(n)}
                      className={`
                        flex-1 py-3 rounded-xl border font-sans font-extrabold text-lg transition-all
                        ${numPlayers === n
                          ? 'bg-forest border-forest text-white shadow-md'
                          : 'bg-panel border-line text-muted hover:border-gold'
                        }
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Names */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Select Players ({selectedPlayers.length} / {numPlayers})
                </label>
                <PlayerSelector 
                  numPlayers={numPlayers} 
                  selectedPlayers={selectedPlayers} 
                  onChange={setSelectedPlayers} 
                />
              </div>

              {/* Game Settings */}
              <div className="flex flex-col gap-2">
                <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                  Game Mode Settings
                </label>
                
                <div className="flex flex-col gap-2">
                  <div
                    onClick={() => setRtwIncludesBull(!rtwIncludesBull)}
                    className="flex items-center justify-between p-4 rounded-xl bg-panel border border-line cursor-pointer hover:border-gold transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-forest-deep">Include Bullseye</span>
                      <span className="text-[11px] font-medium text-muted mt-0.5">End the game on 25</span>
                    </div>
                    <div className={`
                      w-11 h-6 rounded-full relative transition-colors duration-300
                      ${rtwIncludesBull ? 'bg-forest' : 'bg-line'}
                    `}>
                      <div className={`
                        absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm
                        ${rtwIncludesBull ? 'left-6' : 'left-1'}
                      `} />
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <div className="p-6 bg-panel border-t border-line">
              <button
                onClick={handleStartRTW}
                className="
                  w-full py-4 rounded-xl bg-gold
                  font-sans font-bold text-lg text-white
                  hover:bg-gold-deep active:scale-[0.98] transition-all duration-200
                  shadow-[0_4px_14px_rgba(191,164,100,0.4)]
                "
              >
                START MATCH
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
