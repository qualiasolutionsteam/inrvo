import { Mic } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
  isRecording?: boolean;
  onToggle?: (recording: boolean) => void;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
  isRecording: externalIsRecording,
  onToggle
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);
  const prevRecordingRef = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Use external recording state if provided, otherwise use internal state
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : submitted;

  useEffect(() => {
    setIsClient(true);
  }, []);

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
          // Auto-stop at 30 seconds
          if (newTime >= 30 && externalIsRecording !== undefined) {
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

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "group relative w-20 h-20 rounded-full flex items-center justify-center transition-all",
            isRecording
              ? "bg-none"
              : "bg-white/5 border-2 border-white/30 hover:border-white/50 hover:bg-white/10 hover:scale-105 active:scale-95"
          )}
          type="button"
          onClick={handleClick}
        >
          {isRecording ? (
            <div
              className="w-6 h-6 rounded-sm animate-spin bg-white cursor-pointer pointer-events-auto"
              style={{ animationDuration: "3s" }}
            />
          ) : (
            <Mic className="w-6 h-6 text-white/70" />
          )}
          {!isRecording && (
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse" />
          )}
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300 text-white/70",
            !isRecording && "text-white/30"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full transition-all duration-300",
                isRecording
                  ? "bg-white/50 animate-pulse"
                  : "bg-white/10 h-1"
              )}
              style={
                isRecording && isClient
                  ? {
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.05}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>

        <p className="h-4 text-xs text-white/70">
          {isRecording ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
}

