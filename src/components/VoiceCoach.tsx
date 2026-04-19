"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RepQuality } from "@/types/assessment";

type MovementPhase = "ready" | "lifting" | "holding" | "lowering";

interface VoiceCoachProps {
  readonly currentRep: number;
  readonly totalReps: number;
  readonly currentSet: number;
  readonly totalSets: number;
  readonly lastRepQuality?: RepQuality;
  readonly movementPhase: MovementPhase;
  readonly exerciseName: string;
}

// Short, varied cues to avoid repetition
const GREEN_CUES = [
  "[calmly] Good rep.",
  "[calmly] Nice form.",
  "[calmly] That's it.",
  "[calmly] Solid.",
  "[calmly] Right there.",
];

const YELLOW_CUES = [
  "[firmly] Watch your form. Try to reach the full range.",
  "[firmly] Almost there. Extend a bit further.",
  "[firmly] Focus on your range of motion.",
];

const RED_CUES = [
  "[firmly] Let's reset. Focus on controlled movement.",
  "[firmly] Slow it down. Quality over speed.",
  "[firmly] Take a breath, then try again with control.",
];

function pickRandom(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRepCue(
  rep: number,
  quality: RepQuality,
): string {
  if (quality === "green") {
    if (rep <= 3) {
      return "[encouragingly] Great start, keep that form.";
    }
    return pickRandom(GREEN_CUES);
  }
  if (quality === "yellow") {
    return pickRandom(YELLOW_CUES);
  }
  return pickRandom(RED_CUES);
}

function buildFatigueCue(rep: number, quality: RepQuality): string {
  if (quality === "red") {
    return "[firmly] Almost done. Reset your position and finish strong.";
  }
  if (quality === "yellow") {
    return "[firmly] Stay focused. Keep pushing through with good form.";
  }
  return "[firmly] Strong finish. Keep it steady.";
}

export default function VoiceCoach({
  currentRep,
  totalReps,
  currentSet,
  totalSets,
  lastRepQuality,
  movementPhase,
  exerciseName,
}: VoiceCoachProps) {
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Queue and playback refs (stable across renders)
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const prevRepRef = useRef(0);
  const prevSetRef = useRef(1);
  const hasStartedRef = useRef(false);
  const mutedRef = useRef(muted);

  // Keep mutedRef in sync
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Process the speech queue sequentially
  const processQueue = useCallback(async () => {
    if (isSpeakingRef.current) return;
    if (queueRef.current.length === 0) return;

    isSpeakingRef.current = true;
    setSpeaking(true);

    while (queueRef.current.length > 0) {
      if (mutedRef.current) {
        queueRef.current = [];
        break;
      }

      const text = queueRef.current.shift()!;
      try {
        const { speakCoachingCue } = await import("@/lib/elevenLabs");
        await speakCoachingCue(text);
      } catch (err) {
        // TTS failure (invalid API key, network, etc.) -- skip silently
        console.warn("VoiceCoach: TTS failed, skipping cue.", err);
      }
    }

    isSpeakingRef.current = false;
    setSpeaking(false);
  }, []);

  const enqueue = useCallback(
    (text: string) => {
      queueRef.current.push(text);
      processQueue();
    },
    [processQueue],
  );

  // --- Exercise start cue ---
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    prevRepRef.current = currentRep;
    prevSetRef.current = currentSet;

    enqueue(
      `[encouragingly] Let's begin with ${exerciseName}. Take your time getting into position.`,
    );
  }, [exerciseName, enqueue, currentRep, currentSet]);

  // --- Rep completion cues ---
  useEffect(() => {
    // Only fire when rep count actually increments
    if (currentRep === 0 || currentRep <= prevRepRef.current) {
      prevRepRef.current = currentRep;
      return;
    }

    prevRepRef.current = currentRep;
    const quality = lastRepQuality ?? "green";

    // Check for set completion
    if (currentRep >= totalReps) {
      enqueue("[warmly] Great set! Take a rest.");
      return;
    }

    // Fatigue zone (reps 8+)
    if (currentRep >= 8) {
      enqueue(buildFatigueCue(currentRep, quality));
      return;
    }

    // Normal rep cue
    enqueue(buildRepCue(currentRep, quality));
  }, [currentRep, totalReps, lastRepQuality, enqueue]);

  // --- Set change detection ---
  useEffect(() => {
    if (currentSet <= prevSetRef.current) {
      prevSetRef.current = currentSet;
      return;
    }
    prevSetRef.current = currentSet;
    // New set starting after rest
    enqueue(
      `[encouragingly] Set ${currentSet} of ${totalSets}. Let's go.`,
    );
  }, [currentSet, totalSets, enqueue]);

  // --- Toggle mute ---
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        // Clear pending queue on mute
        queueRef.current = [];
      }
      return next;
    });
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Speaker / mute indicator */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute voice coach" : "Mute voice coach"}
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
        style={{
          background: muted
            ? "var(--color-danger-dim, rgba(239,68,68,0.15))"
            : "transparent",
        }}
      >
        {muted ? (
          // Muted icon
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          // Speaker icon with optional "active" pulse
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={
              speaking
                ? "var(--color-accent)"
                : "var(--color-text-muted)"
            }
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
          </svg>
        )}
      </button>

      <span
        style={{
          color: speaking
            ? "var(--color-accent)"
            : "var(--color-text-muted)",
        }}
      >
        {muted
          ? "Voice muted"
          : speaking
            ? "Speaking..."
            : "Voice coach"}
      </span>
    </div>
  );
}
