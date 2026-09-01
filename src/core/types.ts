// ============================================================
// Core Types — Pure TypeScript, no React dependencies
// Designed to be portable to React Native
// ============================================================

// ─────────────────────────────────────────────
// Primitive throw data
// ─────────────────────────────────────────────

/** Dart multiplier ring */
export type Multiplier = 1 | 2 | 3;

/**
 * Board segment:
 *  0  = miss (off board)
 *  1–20 = numbered segments
 *  25 = bull (inner/outer handled by multiplier: 1=outer 25, 2=inner 50)
 */
export type Segment = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25;

export interface DartThrow {
  segment: Segment;
  multiplier: Multiplier;
  boardPoint?: {
    x: number;
    y: number;
  };
}

/** Compute the integer score of a dart throw */
export function throwScore(t: DartThrow): number {
  if (t.segment === 0) return 0;           // miss
  if (t.segment === 25) {
    return t.multiplier === 2 ? 50 : 25;  // bullseye or bull
  }
  return t.segment * t.multiplier;
}

/** Human-readable label for a throw (e.g. "T20", "D16", "S5", "BULL", "D-BULL") */
export function throwLabel(t: DartThrow): string {
  if (t.segment === 0) return 'MISS';
  if (t.segment === 25) return t.multiplier === 2 ? 'D-BULL' : 'BULL';
  const prefix = t.multiplier === 3 ? 'T' : t.multiplier === 2 ? 'D' : 'S';
  return `${prefix}${t.segment}`;
}

// ─────────────────────────────────────────────
// Player state
// ─────────────────────────────────────────────

export interface PlayerState {
  participantId: string;
  displayName: string;
  avatarUrl?: string;
  // Generic score object — each game mode defines what "score" means
  score: Record<string, number | string | boolean>;
  dartsThrown: number;       // total across the whole match
  legsWon: number;
}

// ─────────────────────────────────────────────
// Round history entry
// ─────────────────────────────────────────────

export interface RoundEntry {
  participantId: string;
  roundNumber: number;
  throws: DartThrow[];
  actualThrows: number;
  isBust: boolean;
  scoreDeducted: number;   // X01 specific; other modes can use 0
  snapshot: Record<string, number | string | boolean>; // player score AFTER round
}

// ─────────────────────────────────────────────
// Game state — generic across all game modes
// ─────────────────────────────────────────────

export type GameStatus = 'waiting' | 'ongoing' | 'finished';

export interface GameState {
  matchId: string;
  gameMode: string;          // 'x01' | 'around_the_clock' | 'cricket' | etc.
  config: GameConfig;        // Mode-specific config
  status: GameStatus;
  players: PlayerState[];
  currentPlayerIndex: number;
  currentRound: number;
  currentDartsInRound: DartThrow[];  // 0–2 darts thrown so far this turn
  isCurrentRoundBust: boolean;
  roundHistory: RoundEntry[];
  winnerId?: string;
}

// ─────────────────────────────────────────────
// Game Mode Configuration — union type
// Add new modes here without touching the engine
// ─────────────────────────────────────────────

export type GameConfig = X01Config | AroundTheClockConfig | RoundTheWorldConfig | CricketConfig;

export interface X01Config {
  mode: 'x01';
  startingScore: 301 | 501 | 701;
  doubleOut: boolean;
  doubleIn: boolean;
  legs: number;   // legs needed to win match
}

export interface AroundTheClockConfig {
  mode: 'around_the_clock';
  /** 'singles' only, or include doubles/trebles as valid hits */
  hitType: 'singles' | 'any' | 'double' | 'trebles';
  includesBull: boolean;
}

export interface CricketConfig {
  mode: 'cricket';
  targets: (15 | 16 | 17 | 18 | 19 | 20 | 25)[];
  cutThroat: boolean;
}

export interface RoundTheWorldConfig {
  mode: 'round_the_world';
  hitType: 'singles' | 'any';
  includesBull: boolean;
}

// ─────────────────────────────────────────────
// Game Mode Interface — implement this for every game mode
// ─────────────────────────────────────────────

export interface GameModeEngine<TConfig extends GameConfig = GameConfig> {
  /** Unique identifier matching GameConfig.mode */
  readonly modeId: string;

  /** Human-readable name */
  readonly displayName: string;

  /** Initialize player scores for this mode */
  initPlayerScore(config: TConfig): Record<string, number | string | boolean>;

  /**
   * Apply a throw to the game state. Returns the new state.
   * Must be a PURE function — no mutations.
   */
  applyThrow(state: GameState, throw_: DartThrow): GameState;

  /** Determine if a player has won given current state */
  checkWin(state: GameState, playerId: string): boolean;

  /** After 3 darts (or earlier if won/bust), advance to next player */
  advanceRound(state: GameState): GameState;

  /**
   * Optional: Compute suggested checkout for current player.
   * Shown as a hint in the UI. Return null if not applicable.
   */
  getCheckoutHint?(state: GameState): string | null;
}

// ─────────────────────────────────────────────
// Lobby & Multiplayer types
// ─────────────────────────────────────────────

export type ParticipantType = 'online' | 'local';

export interface Participant {
  id: string;
  type: ParticipantType;
  displayName: string;
  avatarUrl?: string;
  displayOrder: number;
}

export interface Lobby {
  id: string;
  hostId: string;
  name?: string;
  participants: Participant[];
  createdAt: string;
}

export interface Match {
  id: string;
  lobbyId: string;
  gameMode: string;
  config: GameConfig;
  status: GameStatus;
  winnerId?: string;
  startedAt: string;
  finishedAt?: string;
}

// ─────────────────────────────────────────────
// Auth / Profile types
// ─────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface LocalPlayer {
  id: string;
  ownerId: string;
  name: string;
  avatarUrl?: string;
}

// ─────────────────────────────────────────────
// Voice recognition
// ─────────────────────────────────────────────

export interface ParsedVoiceCommand {
  throw_: DartThrow;
  rawTranscript: string;
}
