// ============================================================
// Voice Command Parser
// "score triple twenty" → { segment: 20, multiplier: 3 }
// "score double bull"   → { segment: 25, multiplier: 2 }
// "score eighteen"      → { segment: 18, multiplier: 1 }
// ============================================================

import type { DartThrow, ParsedVoiceCommand, Segment, Multiplier } from './types';

const WORD_TO_NUMBER: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
  // Ordinals too
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};

const MULTIPLIER_WORDS: Record<string, Multiplier> = {
  single: 1, singles: 1, 's': 1,
  double: 2, doubles: 2, 'd': 2,
  triple: 3, treble: 3, trebles: 3, triples: 3, 't': 3,
};

/**
 * Parse a voice transcript containing a score command.
 * Returns null if no valid throw could be parsed.
 *
 * Examples:
 *   "score triple twenty"    → { segment: 20, multiplier: 3 }
 *   "score double bull"      → { segment: 25, multiplier: 2 }
 *   "score bullseye"         → { segment: 25, multiplier: 2 }
 *   "score bull"             → { segment: 25, multiplier: 1 }
 *   "score eighteen"         → { segment: 18, multiplier: 1 }
 *   "score 20"               → { segment: 20, multiplier: 1 }
 *   "score miss"             → { segment: 0,  multiplier: 1 }
 */
export function parseVoiceCommand(rawTranscript: string): ParsedVoiceCommand | null {
  const transcript = rawTranscript.toLowerCase().trim();

  // Must contain "score" keyword
  const scoreMatch = transcript.match(/\bscore[d]?\b/);
  if (!scoreMatch) return null;

  // Get the portion after "score"
  const afterScore = transcript.slice(transcript.indexOf(scoreMatch[0]) + scoreMatch[0].length).trim();

  // Special cases: miss, bull, bullseye
  if (/\bmiss(ed)?\b/.test(afterScore)) {
    return makeResult({ segment: 0, multiplier: 1 }, rawTranscript);
  }

  if (/\bbullseye\b/.test(afterScore)) {
    return makeResult({ segment: 25, multiplier: 2 }, rawTranscript);
  }

  // "double bull" or just "bull"
  const bullMatch = afterScore.match(/\b(single|double|triple|treble)?\s*bull\b/);
  if (bullMatch) {
    const mult = bullMatch[1] ? (MULTIPLIER_WORDS[bullMatch[1]] ?? 1) : 1;
    // Treble bull doesn't exist — clamp to double
    const clampedMult = Math.min(mult, 2) as Multiplier;
    return makeResult({ segment: 25, multiplier: clampedMult }, rawTranscript);
  }

  // Pattern: [multiplier word] [number word or digit]
  const words = afterScore.split(/\s+/);
  let multiplier: Multiplier = 1;
  let segment: number | null = null;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z0-9]/g, '');

    if (MULTIPLIER_WORDS[word] !== undefined) {
      multiplier = MULTIPLIER_WORDS[word];
      continue;
    }

    // Try numeric digit
    const num = parseInt(word, 10);
    if (!isNaN(num) && num >= 1 && num <= 20) {
      segment = num;
      break;
    }

    // Try word-to-number
    if (WORD_TO_NUMBER[word] !== undefined) {
      segment = WORD_TO_NUMBER[word];
      break;
    }
  }

  if (segment === null) return null;

  return makeResult({ segment: segment as Segment, multiplier }, rawTranscript);
}

function makeResult(throw_: DartThrow, rawTranscript: string): ParsedVoiceCommand {
  return { throw_, rawTranscript };
}
