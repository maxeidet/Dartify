import { Clock3, Globe } from 'lucide-react';

export function DartIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21 L8 16" strokeWidth="1.8" />
      <path d="M8 16 L12.5 11.5" strokeWidth="3.4" />
      <path d="M12.5 11.5 L15.5 8.5" strokeWidth="1.8" />
      <path d="M15.5 8.5 L16.2 3.2 L20.8 3.2 L20.8 7.8 Z" fill="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function CricketIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 5v14M12 5v14M17 5v14" />
      <path d="M4.5 17 L19.5 7" strokeWidth="1.7" />
    </svg>
  );
}

/** Glyph for a game mode id (x01, around_the_clock, round_the_world, cricket) */
export function ModeIcon({ mode, size = 22 }: { mode: string; size?: number }) {
  switch (mode) {
    case 'around_the_clock': return <Clock3 size={size} strokeWidth={2.2} />;
    case 'round_the_world': return <Globe size={size} strokeWidth={2.2} />;
    case 'cricket': return <CricketIcon size={size} />;
    default: return <DartIcon size={size} />;
  }
}
