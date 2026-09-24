import type { InputHTMLAttributes, ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ACCENTS, SLOT_ACCENTS } from './softTokens';
import type { Accent } from './softTokens';

// ─────────────────────────────────────────────
// Card title — gray icon + gray title, as used on every shell
// ─────────────────────────────────────────────

export function ShellTitle({ icon: Icon, children, trailing }: { icon: LucideIcon; children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-slate-soft">
        <Icon size={20} strokeWidth={2.2} className="shrink-0" fill="currentColor" fillOpacity={0.18} />
        <h2 className="text-[21px] font-semibold tracking-display leading-none">{children}</h2>
      </div>
      {trailing}
    </div>
  );
}

// ─────────────────────────────────────────────
// Badge — tinted pill ("In 41 D", "Draft")
// ─────────────────────────────────────────────

export function Badge({ accent, children }: { accent: Accent; children: ReactNode }) {
  const a = ACCENTS[accent];
  return (
    <span
      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap"
      style={{ background: a.tint, color: a.ink }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// Avatar — initial on a pastel disc, color derived from the name
// ─────────────────────────────────────────────

function hashAccent(name: string): Accent {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return SLOT_ACCENTS[Math.abs(h) % SLOT_ACCENTS.length];
}

export function Avatar({ name, size = 32, accent }: { name: string; size?: number; accent?: Accent }) {
  const a = ACCENTS[accent ?? hashAccent(name)];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 font-semibold ring-2 ring-white"
      style={{ width: size, height: size, background: a.tint, color: a.ink, fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

// ─────────────────────────────────────────────
// Segmented control — sliding white thumb on a gray track
// ─────────────────────────────────────────────

interface SegmentedProps<T extends string | number> {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** 'sm' is the compact in-game variant */
  size?: 'md' | 'sm';
}

export function Segmented<T extends string | number>({ options, value, onChange, ariaLabel, size = 'md' }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex(o => o.value === value));
  const width = 100 / options.length;

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="relative flex p-1 rounded-full bg-track">
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full soft-float transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: `calc(${width}% - ${8 / options.length}px)`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map(o => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 rounded-full font-semibold ${size === 'sm' ? 'h-7 text-[13px]' : 'h-10 text-[15px]'} tabular-nums transition-colors duration-200 [-webkit-tap-highlight-color:transparent] ${
              selected ? 'text-slate' : 'text-subtle hover:text-slate-soft'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Toggle — iOS-style switch row
// ─────────────────────────────────────────────

export function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 py-3 text-left [-webkit-tap-highlight-color:transparent]"
    >
      <span className="flex flex-col">
        <span className={`text-[16px] font-medium transition-colors ${checked ? 'text-slate' : 'text-slate-soft'}`}>{label}</span>
        {description && <span className="text-[13px] text-subtle mt-0.5">{description}</span>}
      </span>
      <span
        className={`relative shrink-0 w-[51px] h-[31px] rounded-full transition-colors duration-300 ${checked ? 'bg-mint-ink' : 'bg-track'}`}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────
// Page header — round back button, centered title, optional trailing action
// ─────────────────────────────────────────────

export function PageHeader({ title, onBack, backLabel = 'Back', trailing }: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="justify-self-start w-11 h-11 rounded-full soft-float soft-press flex items-center justify-center text-slate"
      >
        <ChevronLeft size={22} strokeWidth={2.4} className="-ml-0.5" />
      </button>
      <h1 className="text-[17px] font-semibold text-slate">{title}</h1>
      <div className="justify-self-end">{trailing}</div>
    </header>
  );
}

// ─────────────────────────────────────────────
// Confirm dialog — centered card over a dimmed, blurred backdrop
// ─────────────────────────────────────────────

export function ConfirmDialog({ icon: Icon, title, message, cancelLabel, confirmLabel, destructive, onCancel, onConfirm }: {
  icon: LucideIcon;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-[rgba(20,24,32,0.32)] backdrop-blur-[6px] soft-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="soft-shell w-full max-w-sm p-2 soft-rise" onClick={e => e.stopPropagation()}>
        <div className="soft-card px-6 pt-7 pb-6 text-center">
          <span
            className="mx-auto w-14 h-14 rounded-[18px] flex items-center justify-center"
            style={destructive
              ? { background: '#FCE9E7', color: '#C4413A' }
              : { background: 'var(--color-track)', color: 'var(--color-slate-soft)' }}
          >
            <Icon size={24} strokeWidth={2.1} />
          </span>
          <h2 className="mt-4 text-[22px] font-semibold tracking-display text-slate">{title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-subtle">{message}</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-[52px] rounded-full soft-float soft-press text-[16px] font-semibold text-slate"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-[52px] rounded-full soft-press text-[16px] font-semibold text-white ${destructive ? 'bg-[#D6453D] shadow-[0_10px_24px_-10px_rgba(214,69,61,0.6)]' : 'soft-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Text field — pill input with a leading icon
// ─────────────────────────────────────────────

export function SoftInput({ icon: Icon, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  return (
    <label className={`flex items-center gap-3 h-[52px] px-4 rounded-full bg-track/70 border border-[#E4E5E8] focus-within:bg-white focus-within:border-[#D5D7DC] transition-colors ${className}`}>
      <Icon size={18} strokeWidth={2} className="text-subtle shrink-0" />
      <input
        {...props}
        className="flex-1 min-w-0 bg-transparent text-[16px] font-medium text-slate placeholder:text-subtle focus:outline-none"
      />
    </label>
  );
}

// ─────────────────────────────────────────────
// Stat tile — tinted icon chip, big colored number, small label
// ─────────────────────────────────────────────

export function StatTile({ icon: Icon, accent, value, label, divider }: {
  icon: LucideIcon;
  accent: Accent;
  value: number | null;
  label: string;
  divider?: boolean;
}) {
  const a = ACCENTS[accent];
  const empty = value === null || value <= 0;
  return (
    <div className={`relative px-3 py-3 ${divider ? 'before:absolute before:left-0 before:top-4 before:bottom-4 before:w-px before:bg-line/80' : ''}`}>
      <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.tint, color: a.ink }}>
        <Icon size={18} strokeWidth={2.3} />
      </span>
      <div
        className="mt-3 text-[26px] leading-none font-semibold tracking-display tabular-nums"
        style={{ color: empty ? 'var(--color-subtle)' : a.ink }}
      >
        {empty ? '–' : value}
      </div>
      <div className="mt-1.5 text-[13px] font-medium text-subtle">{label}</div>
    </div>
  );
}
