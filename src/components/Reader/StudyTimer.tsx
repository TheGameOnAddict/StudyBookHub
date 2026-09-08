import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  X,
  Clock,
  Sparkles,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { addStudyTime } from '../../services/db';

interface StudyTimerProps {
  bookId: string;
  initialStudyTimeSeconds?: number;
  onStudyTimeUpdate?: (totalSeconds: number) => void;
}

export const StudyTimer: React.FC<StudyTimerProps> = ({
  bookId,
  initialStudyTimeSeconds = 0,
  onStudyTimeUpdate,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');
  const [isActive, setIsActive] = useState<boolean>(false);

  // Stopwatch state (counts up)
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);

  // Pomodoro state (counts down)
  const POMODORO_WORK = 25 * 60; // 25 minutes
  const POMODORO_BREAK = 5 * 60; // 5 minutes
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(POMODORO_WORK);
  const [isBreak, setIsBreak] = useState<boolean>(false);

  // Total session & book time
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [totalStudySeconds, setTotalStudySeconds] = useState<number>(initialStudyTimeSeconds);

  // Interval reference
  const timerRef = useRef<number | null>(null);
  const unsavedSecondsRef = useRef<number>(0);

  // Sync initial total
  useEffect(() => {
    setTotalStudySeconds(initialStudyTimeSeconds);
  }, [initialStudyTimeSeconds]);

  // Persist accrued study time to IndexedDB
  const syncStudyTimeToDb = useCallback(async () => {
    if (unsavedSecondsRef.current > 0) {
      const delta = unsavedSecondsRef.current;
      unsavedSecondsRef.current = 0;
      const updated = await addStudyTime(bookId, delta);
      setTotalStudySeconds(updated);
      onStudyTimeUpdate?.(updated);
    }
  }, [bookId, onStudyTimeUpdate]);

  // Gentle audio chime using Web Audio API (zero external assets needed)
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Two gentle harmonious sine notes (E5 -> B5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.2); // B5
      gain2.gain.setValueAtTime(0.25, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 1.0);
    } catch {
      // Audio context may be restricted before user interaction
    }
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        unsavedSecondsRef.current += 1;
        setSessionSeconds((prev) => prev + 1);

        if (mode === 'stopwatch') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          // Pomodoro mode
          setPomodoroSeconds((prev) => {
            if (prev <= 1) {
              // Timer completed
              playChime();
              if (!isBreak) {
                // Focus session ended, start break
                confetti({
                  particleCount: 60,
                  spread: 60,
                  origin: { y: 0.2 },
                  colors: ['#8B5CF6', '#10B981', '#F59E0B'],
                });
                setIsBreak(true);
                return POMODORO_BREAK;
              } else {
                // Break ended, reset to focus
                setIsBreak(false);
                return POMODORO_WORK;
              }
            }
            return prev - 1;
          });
        }

        // Auto-persist to DB every 30 seconds
        if (unsavedSecondsRef.current >= 30) {
          syncStudyTimeToDb();
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      syncStudyTimeToDb();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      syncStudyTimeToDb();
    };
  }, [isActive, mode, isBreak, playChime, syncStudyTimeToDb]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSecs: number): string => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format hours and minutes for friendly stats display
  const formatHoursMinutes = (totalSecs: number): string => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Display text in the navbar button
  const displayTime =
    mode === 'stopwatch'
      ? formatTime(stopwatchSeconds)
      : formatTime(pomodoroSeconds);

  return (
    <div className="relative">
      {/* Navbar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isActive ? 'Study timer running - click for controls' : 'Start Study Timer'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
          isActive
            ? isBreak
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-purple-600 text-white shadow-xs'
            : sessionSeconds > 0
            ? 'bg-purple-100 text-purple-800 border border-purple-200'
            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100'
        }`}
      >
        {isActive ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        ) : (
          <Timer className="w-3.5 h-3.5 text-purple-600" />
        )}
        <span className="font-mono">{sessionSeconds > 0 || isActive ? displayTime : 'Study'}</span>
      </button>

      {/* Popover / Controls Modal */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-purple-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-purple-50 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Study Focus Timer</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-purple-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 bg-purple-50/70 p-1 rounded-2xl text-[11px] font-semibold text-gray-600">
            <button
              onClick={() => {
                setMode('stopwatch');
                setIsActive(false);
              }}
              className={`py-1.5 rounded-xl transition-all ${
                mode === 'stopwatch'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'hover:text-purple-700'
              }`}
            >
              Stopwatch
            </button>
            <button
              onClick={() => {
                setMode('pomodoro');
                setIsActive(false);
                setIsBreak(false);
                setPomodoroSeconds(POMODORO_WORK);
              }}
              className={`py-1.5 rounded-xl transition-all ${
                mode === 'pomodoro'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'hover:text-purple-700'
              }`}
            >
              Pomodoro (25m)
            </button>
          </div>

          {/* Digital Timer Display */}
          <div className="py-4 bg-gradient-to-br from-purple-50 to-purple-100/40 rounded-2xl border border-purple-200/60 text-center space-y-1">
            {mode === 'pomodoro' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 inline-flex items-center gap-1">
                {isBreak ? (
                  <>
                    <Coffee className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Break Time (5m)</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-3 h-3 text-purple-600" />
                    <span>Focus Interval</span>
                  </>
                )}
              </span>
            )}
            <div className="font-mono text-4xl font-extrabold text-purple-950 tracking-tight">
              {displayTime}
            </div>
            <p className="text-[10px] text-gray-500">
              {isActive ? 'Session in progress' : 'Ready to start studying'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{sessionSeconds > 0 ? 'Resume' : 'Start Study'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsActive(false);
                if (mode === 'stopwatch') {
                  setStopwatchSeconds(0);
                } else {
                  setIsBreak(false);
                  setPomodoroSeconds(POMODORO_WORK);
                }
                syncStudyTimeToDb();
              }}
              title="Reset timer"
              className="p-2.5 rounded-xl border border-purple-200 text-gray-500 hover:text-purple-700 hover:bg-purple-50 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Study Statistics Footer */}
          <div className="border-t border-purple-100 pt-2.5 space-y-1 text-[11px] text-gray-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="w-3 h-3 text-purple-400" />
                This Session
              </span>
              <span className="font-semibold text-purple-800 font-mono">
                {formatHoursMinutes(sessionSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-gray-500">
                <Flame className="w-3 h-3 text-purple-400" />
                Total for this book
              </span>
              <span className="font-semibold text-purple-800 font-mono">
                {formatHoursMinutes(totalStudySeconds + unsavedSecondsRef.current)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
