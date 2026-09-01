// ============================================================
// Game Mode Registry
// Register new game modes here — the UI will pick them up automatically
// ============================================================

import type { GameModeEngine, GameConfig } from './types';
import { x01Engine } from './x01Engine';
import { aroundTheClockEngine } from './aroundTheClockEngine';
// Future: import { cricketEngine } from './cricketEngine';

const registry = new Map<string, GameModeEngine<GameConfig>>();

function register(engine: GameModeEngine<GameConfig>) {
  registry.set(engine.modeId, engine);
}

// Register all known modes
register(x01Engine as GameModeEngine<GameConfig>);
register(aroundTheClockEngine as GameModeEngine<GameConfig>);
// register(cricketEngine);

/**
 * Retrieve the engine for a given mode ID.
 * Throws if the mode is not registered (fail-fast to catch typos).
 */
export function getEngine(modeId: string): GameModeEngine<GameConfig> {
  const engine = registry.get(modeId);
  if (!engine) throw new Error(`Unknown game mode: "${modeId}". Register it in gameModeRegistry.ts`);
  return engine;
}

/** All registered mode IDs (for UI dropdowns) */
export function listModes(): string[] {
  return Array.from(registry.keys());
}
