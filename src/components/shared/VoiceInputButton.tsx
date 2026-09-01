import { useRef, useEffect, useState } from 'react';
import type { ParsedVoiceCommand } from '../../core/types';
import { parseVoiceCommand } from '../../core/voiceParser';
import { throwLabel } from '../../core/types';

interface VoiceInputButtonProps {
  isActive: boolean;
  onToggle: () => void;
  onCommand: (cmd: ParsedVoiceCommand) => void;
}

// Check if Web Speech API is available
const isSpeechSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function VoiceInputButton({ isActive, onToggle, onCommand }: VoiceInputButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [lastParsed, setLastParsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start/stop recognition based on isActive
  useEffect(() => {
    if (!isSpeechSupported) return;

    if (isActive) {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join(' ');

        const parsed = parseVoiceCommand(transcript);
        if (parsed) {
          setLastParsed(throwLabel(parsed.throw_));
          setError(null);
          onCommand(parsed);
          // Clear the "last parsed" display after 2s
          setTimeout(() => setLastParsed(null), 2000);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setError(event.error);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setLastParsed(null);
      setError(null);
    }

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [isActive, onCommand]);

  if (!isSpeechSupported) {
    return (
      <div className="text-xs text-slate-500 px-3 py-1 text-center">
        Voice not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        id="voice-input-toggle"
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl
          font-display font-semibold text-sm tracking-wide
          border transition-all duration-200 active:scale-95
          ${isActive
            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 voice-pulse'
            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
          }
        `}
        aria-label={isActive ? 'Stop voice input' : 'Start voice input'}
        aria-pressed={isActive}
      >
        <span className={`text-base ${isActive ? 'animate-pulse' : ''}`}>🎙️</span>
        <span>{isActive ? 'Listening...' : 'Voice Input'}</span>
        {isActive && (
          <span className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-0.5 bg-orange-400 rounded-full"
                style={{
                  height: `${8 + i * 4}px`,
                  animation: `voiceBar ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </span>
        )}
      </button>

      {/* Feedback */}
      {lastParsed && (
        <div className="text-xs font-display font-semibold text-green-400 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/20 animate-in fade-in">
          ✓ {lastParsed}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400 px-2">
          Error: {error}
        </div>
      )}
    </div>
  );
}
