import { Mic } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AudioLevelData } from "@/src/lib/audioAnalyzer";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
  isRecording?: boolean;
  onToggle?: (recording: boolean) => void;
  /** Real-time audio level data from AudioAnalyzer */
  audioLevelData?: AudioLevelData | null;
  /** Hide the timer display */
  hideTimer?: boolean;
  /** Hide the instruction text */
  hideInstructions?: boolean;
  /** Disable the 30-second auto-stop (for voice cloning which needs 60+ seconds) */
  disableAutoStop?: boolean;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
  isRecording: externalIsRecording,
  onToggle,
  audioLevelData,
  hideTimer = false,
  hideInstructions = false,
  disableAutoStop = false,
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const prevRecordingRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store demo bar heights to avoid re-computing every render
  const [demoBarHeights, setDemoBarHeights] = useState<number[]>([]);

  // Use external recording state if provided, otherwise use internal state
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : submitted;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate demo bar heights for animation
  useEffect(() => {
    if (!isRecording || audioLevelData) return;

    // Only use random heights for demo mode when no real audio data
    const updateDemoHeights = () => {
      setDemoBarHeights(
        Array.from({ length: visualizerBars }, () => 20 + Math.random() * 80)
      );
    };

    updateDemoHeights();
    const interval = setInterval(updateDemoHeights, 100); // Update at ~10fps for demo

    return () => clearInterval(interval);
  }, [isRecording, audioLevelData, visualizerBars]);

  useEffect(() => {
    // Handle recording state changes
    if (isRecording && !prevRecordingRef.current) {
      // Started recording
      if (!submitted && externalIsRecording === undefined) {
        setSubmitted(true);
      }
      setTime(0); // Reset time when starting
      onStart?.();
      intervalRef.current = setInterval(() => {
        setTime((t) => {
          const newTime = t + 1;
          // Auto-stop at 30 seconds (unless disabled for voice cloning)
          if (newTime >= 30 && externalIsRecording !== undefined && !disableAutoStop) {
            onToggle?.(false);
          }
          return newTime;
        });
      }, 1000);
    } else if (!isRecording && prevRecordingRef.current) {
      // Stopped recording
      if (submitted && externalIsRecording === undefined) {
        setSubmitted(false);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Capture time before resetting
      const currentTime = time;
      if (currentTime > 0) {
        onStop?.(currentTime);
      }
      setTime(0);
    }

    prevRecordingRef.current = isRecording;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording]); // Only depend on isRecording, not time

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
      onToggle?.(false);
    } else {
      if (externalIsRecording !== undefined) {
        // Controlled mode - use onToggle callback
        onToggle?.(!isRecording);
      } else {
        // Uncontrolled mode - use internal state
        setSubmitted((prev) => !prev);
      }
    }
  };

  /**
   * Get bar height for visualizer
   * Uses real audio data if available, otherwise falls back to demo animation
   */
  const getBarHeight = (index: number): number => {
    if (!isRecording) return 4; // Idle state

    // If we have real audio data, use frequency bins
    if (audioLevelData?.frequencyBins) {
      const bins = audioLevelData.frequencyBins;
      // Map visualizer bar index to frequency bin index
      // Use lower frequencies (first half) as they contain more voice info
      const binIndex = Math.floor((index / visualizerBars) * (bins.length / 2));
      const value = bins[binIndex] || 0;
      // Scale from 0-255 to reasonable bar height (4-64%)
      return 4 + (value / 255) * 60;
    }

    // Demo/fallback mode - use animated random heights
    return demoBarHeights[index] || 20;
  };

  // Memoize bar heights to avoid recalculating every render
  const barHeights = useMemo(() => {
    if (!isRecording || !isClient) return null;
    return Array.from({ length: visualizerBars }, (_, i) => getBarHeight(i));
  }, [isRecording, isClient, audioLevelData?.frequencyBins, demoBarHeights, visualizerBars]);

  // Determine visualizer color based on audio level
  const visualizerColor = useMemo(() => {
    if (!isRecording || !audioLevelData) return "bg-white/50";

    if (audioLevelData.isClipping) return "bg-rose-400";
    if (audioLevelData.isOptimal) return "bg-emerald-400";
    if (audioLevelData.isGood) return "bg-sky-500";
    if (audioLevelData.isTooQuiet) return "bg-amber-400";

    return "bg-white/50";
  }, [isRecording, audioLevelData]);

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
            isRecording
              ? "active:scale-95"
              : "hover:scale-105 active:scale-95"
          )}
          type="button"
          onClick={handleClick}
        >
          {/* Outer glow ring */}
          {isRecording && (
            <div
              className="absolute inset-[-8px] rounded-full opacity-30 blur-xl transition-all duration-500"
              style={{
                background: audioLevelData?.isClipping
                  ? 'radial-gradient(circle, #f43f5e 0%, transparent 70%)'
                  : audioLevelData?.isOptimal
                  ? 'radial-gradient(circle, #10b981 0%, transparent 70%)'
                  : 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
              }}
            />
          )}

          {/* Main button background */}
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              isRecording
                ? "bg-gradient-to-br from-slate-800 to-slate-900"
                : "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10"
            )}
          />

          {/* Gradient border ring */}
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              isRecording ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: audioLevelData?.isClipping
                ? 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
                : audioLevelData?.isOptimal
                ? 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                : audioLevelData?.isGood
                ? 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              padding: '2px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />

          {/* Inner content */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-1">
            {isRecording ? (
              <>
                <div className="w-5 h-5 rounded bg-white shadow-lg" />
                <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider">Stop</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
                  <Mic className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Subtle pulse animation */}
          {!isRecording && (
            <div className="absolute inset-0 rounded-full border border-sky-500/30 animate-[pulse_2s_ease-in-out_infinite]" />
          )}
        </button>

        {!hideTimer && (
          <span
            className={cn(
              "font-mono text-sm transition-opacity duration-300 text-white/70",
              !isRecording && "text-white/30"
            )}
          >
            {formatTime(time)}
          </span>
        )}

        {/* Audio Visualizer */}
        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all",
                isRecording ? visualizerColor : "bg-white/10",
                // Use faster transition for real audio data
                audioLevelData ? "duration-75" : "duration-300"
              )}
              style={{
                height: barHeights ? `${barHeights[i]}%` : '4px',
              }}
            />
          ))}
        </div>

        {!hideInstructions && (
          <p className="h-4 text-xs text-white/70">
            {isRecording
              ? audioLevelData?.isClipping
                ? "Too loud - move back"
                : audioLevelData?.isTooQuiet
                ? "Speak louder"
                : "Listening..."
              : "Click to speak"}
          </p>
        )}
      </div>
    </div>
  );
}
