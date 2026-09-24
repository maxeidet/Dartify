// ─────────────────────────────────────────────
// Accent palette — each accent has a solid, an ink (text) and a tint (chip bg)
// ─────────────────────────────────────────────

export type Accent = 'mint' | 'azure' | 'coral' | 'orchid';

export const ACCENTS: Record<Accent, { solid: string; ink: string; tint: string }> = {
  mint:   { solid: 'var(--color-mint)',   ink: 'var(--color-mint-ink)',   tint: 'var(--color-mint-tint)' },
  azure:  { solid: 'var(--color-azure)',  ink: 'var(--color-azure-ink)',  tint: 'var(--color-azure-tint)' },
  coral:  { solid: 'var(--color-coral)',  ink: 'var(--color-coral-ink)',  tint: 'var(--color-coral-tint)' },
  orchid: { solid: 'var(--color-orchid)', ink: 'var(--color-orchid-ink)', tint: 'var(--color-orchid-tint)' },
};

/** Player slot colors, in throw order (P1, P2, P3, P4) */
export const SLOT_ACCENTS: Accent[] = ['mint', 'azure', 'coral', 'orchid'];

/** Each game mode keeps one accent everywhere it appears */
export const MODE_ACCENTS: Record<string, Accent> = {
  x01: 'mint',
  around_the_clock: 'azure',
  round_the_world: 'orchid',
  cricket: 'coral',
};

export const MODE_NAMES: Record<string, string> = {
  x01: 'X01',
  around_the_clock: 'Around the Clock',
  round_the_world: 'Round the World',
  cricket: 'Cricket',
};
