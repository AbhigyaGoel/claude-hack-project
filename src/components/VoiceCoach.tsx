"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Conversation } from "@11labs/client";
import { speakNonBlocking } from "@/lib/elevenLabs";
import type { PlaybackHandle, TTSConfig } from "@/lib/elevenLabs";
import type { RepQuality } from "@/types/assessment";

type MovementPhase = "ready" | "lifting" | "holding" | "lowering";
type CoachMode = "coaching" | "talking";
type TalkStatus = "idle" | "connecting" | "active" | "error";

interface VoiceCoachProps {
  readonly currentRep: number;
  readonly totalReps: number;
  readonly currentSet: number;
  readonly totalSets: number;
  readonly lastRepQuality?: RepQuality;
  readonly movementPhase: MovementPhase;
  readonly exerciseName: string;
  readonly currentAngle?: number;
  readonly targetAngle?: number;
  readonly visionFaults?: string[];
  readonly isPaused?: boolean;
}

/** Emotion → ElevenLabs voice settings */
const EMOTION_TTS: Record<string, Partial<TTSConfig>> = {
  calm:        { stability: 0.7, similarityBoost: 0.8 },
  encouraging: { stability: 0.5, similarityBoost: 0.75 },
  urgent:      { stability: 0.9, similarityBoost: 0.9 },
};

export default function VoiceCoach({
  currentRep,
  totalReps,
  currentSet,
  totalSets,
  lastRepQuality,
  exerciseName,
  currentAngle,
  targetAngle,
  visionFaults,
  isPaused = false,
}: VoiceCoachProps) {
  const [mode, setMode] = useState<CoachMode>("coaching");
  /** True while a TTS audio clip is playing in coaching mode */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [talkStatus, setTalkStatus] = useState<TalkStatus>("idle");
  const [talkConvoMode, setTalkConvoMode] = useState<"listening" | "speaking">("listening");

  // Coaching mode refs
  const currentPlaybackRef = useRef<PlaybackHandle | null>(null);
  const prevRepRef = useRef(0);
  const prevSetRef = useRef(1);
  const setQualitiesRef = useRef<RepQuality[]>([]);
  const prevVisionFaultsRef = useRef<string[]>([]);
  /** Timestamp of last mid-set cue — enforces minimum gap between interruptions */
  const lastMidCueTimeRef = useRef(0);
  const MID_CUE_COOLDOWN_MS = 7_500;

  // Talk mode refs
  const conversationRef = useRef<Conversation | null>(null);
  const connectingRef = useRef(false);
  /** Synchronous guard — prevents double-fire before modeRef updates via useEffect */
  const togglingRef = useRef(false);

  // Stable ref copies of props used in callbacks that fire as side-effects
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Startup greeting when exercise begins ────────────────────────────────
  useEffect(() => {
    const handle = speakNonBlocking(
      `Alright — ${exerciseName}. ${totalReps} reps, ${totalSets} set${totalSets > 1 ? "s" : ""}. Start when you're ready.`,
      setIsSpeaking,
      EMOTION_TTS.encouraging,
    );
    currentPlaybackRef.current = handle;
    return () => handle.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fires once on mount

  // ── Coaching: call /api/cue then play TTS ──────────────────────────────────
  /**
   * Fetches a coaching cue from the Haiku-powered /api/cue endpoint
   * and plays it via ElevenLabs TTS. Non-blocking — fire and forget.
   */
  const playCue = useCallback(async (
    assessment: Record<string, unknown>,
    repNumber: number,
    setNumber: number,
    exName: string,
    forceInterrupt = false,
  ) => {
    try {
      const res = await fetch("/api/cue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment,
          rep_number: repNumber,
          set_number: setNumber,
          exercise_name: exName,
        }),
      });
      if (!res.ok) return;
      const cue = await res.json() as { text?: string; emotion?: string; interrupt_current?: boolean };
      if (!cue.text) return;

      if (forceInterrupt || cue.interrupt_current) {
        currentPlaybackRef.current?.stop();
      }

      const ttsConfig = EMOTION_TTS[cue.emotion ?? "encouraging"] ?? {};
      currentPlaybackRef.current = speakNonBlocking(cue.text, setIsSpeaking, ttsConfig);
    } catch {
      // Non-fatal: cue failure never breaks the session
    }
  }, []);

  // ── Coaching: fire cue on rep complete (throttled) ─────────────────────────
  useEffect(() => {
    if (modeRef.current !== "coaching") return;
    if (currentRep === 0 || currentRep <= prevRepRef.current) {
      prevRepRef.current = currentRep;
      return;
    }
    prevRepRef.current = currentRep;

    const quality = lastRepQuality ?? "green";
    setQualitiesRef.current.push(quality);

    if (isPaused) return;

    const faults = visionFaults ?? [];

    if (currentRep >= totalReps) {
      // SET COMPLETE — always speak with quality breakdown
      const quals = setQualitiesRef.current;
      const green = quals.filter((q) => q === "green").length;
      const yellow = quals.filter((q) => q === "yellow").length;
      const red = quals.filter((q) => q === "red").length;
      setQualitiesRef.current = [];

      playCue(
        { quality, faults, set_complete: true, quality_summary: { green, yellow, red }, angle: currentAngle, target_angle: targetAngle },
        currentRep, currentSet, exerciseName, true,
      );
    } else {
      // Mid-set: only speak at midway (if not green) or on red quality/faults,
      // and never more than once per MID_CUE_COOLDOWN_MS to avoid spam
      const isMidway = currentRep === Math.ceil(totalReps / 2);
      const isBad = quality === "red" || faults.length > 0;
      if (!isBad && !isMidway) return;          // skip green reps without faults
      if (isMidway && !isBad) return;           // skip midway if form is perfect
      const now = Date.now();
      if (now - lastMidCueTimeRef.current < MID_CUE_COOLDOWN_MS) return;
      lastMidCueTimeRef.current = now;

      playCue(
        { quality, faults, angle: currentAngle, target_angle: targetAngle },
        currentRep, currentSet, exerciseName, false,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRep, totalReps, currentSet, lastRepQuality, currentAngle, targetAngle, visionFaults, isPaused, exerciseName, playCue]);

  // ── Coaching: reset set quality tracking and cooldown on new set ──────────
  useEffect(() => {
    if (currentSet <= prevSetRef.current) { prevSetRef.current = currentSet; return; }
    prevSetRef.current = currentSet;
    setQualitiesRef.current = [];
    lastMidCueTimeRef.current = 0; // allow first bad-form cue of new set immediately
  }, [currentSet]);

  // ── Coaching: urgent cue on new vision faults (cooldown-gated) ───────────
  useEffect(() => {
    if (!visionFaults?.length || modeRef.current !== "coaching" || isPaused) return;
    const prev = prevVisionFaultsRef.current;
    const newFaults = visionFaults.filter((f) => !prev.includes(f));
    prevVisionFaultsRef.current = visionFaults;
    if (!newFaults.length) return;

    // Reuse the same cooldown — don't interrupt rep cues with vision cues constantly
    const now = Date.now();
    if (now - lastMidCueTimeRef.current < MID_CUE_COOLDOWN_MS) return;
    lastMidCueTimeRef.current = now;

    playCue(
      { quality: lastRepQuality ?? "green", faults: newFaults, urgent: true },
      currentRep, currentSet, exerciseName, true,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visionFaults]);

  // ── Talk mode: connect ElevenLabs ConvAI with mic active ──────────────────
  const enterTalkMode = useCallback(async () => {
    currentPlaybackRef.current?.stop();
    setMode("talking");
    if (conversationRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setTalkStatus("connecting");

    try {
      const res = await fetch("/api/elevenlabs/coach-signed-url", { method: "POST" });
      if (!res.ok) throw new Error("Signed URL failed");
      const { signedUrl } = await res.json();

      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => {
          setTalkStatus("active");
          // setMicMuted is called after await resolves to avoid TDZ reference
        },
        onDisconnect: () => {
          conversationRef.current = null;
          connectingRef.current = false;
          setTalkStatus("idle");
        },
        onError: (msg) => {
          console.error("[VoiceCoach talk]", msg);
          connectingRef.current = false;
          setTalkStatus("error");
        },
        onModeChange: ({ mode: m }) => setTalkConvoMode(m),
      });

      conversationRef.current = conversation;
      connectingRef.current = false;
      togglingRef.current = false;
      conversation.setMicMuted(false); // mic live in talk mode
      // Give the agent context about the current exercise state
      conversation.sendContextualUpdate(
        `PATIENT PAUSED TO ASK | exercise: ${exerciseName} | rep: ${currentRep}/${totalReps} | set: ${currentSet}/${totalSets} | last quality: ${lastRepQuality ?? "green"}`,
      );
    } catch (err) {
      if (err instanceof CloseEvent) {
        console.error(`[VoiceCoach] WebSocket closed: code=${err.code} reason="${err.reason}" wasClean=${err.wasClean}`);
      } else {
        console.error("[VoiceCoach] enterTalkMode error:", err);
      }
      connectingRef.current = false;
      togglingRef.current = false;
      setTalkStatus("error");
      setMode("coaching");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseName, currentRep, totalReps, currentSet, totalSets, lastRepQuality]);

  const exitTalkMode = useCallback(() => {
    conversationRef.current?.endSession();
    conversationRef.current = null;
    connectingRef.current = false;
    setTalkStatus("idle");
    setMode("coaching");
  }, []);

  const toggleMode = useCallback(() => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    if (modeRef.current === "coaching") {
      enterTalkMode().finally(() => { togglingRef.current = false; });
    } else {
      exitTalkMode();
      togglingRef.current = false;
    }
  }, [enterTalkMode, exitTalkMode]);

  // ── Keyboard shortcut: V to toggle talk mode ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "KeyV" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Don't hijack if user is typing in an input
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
        e.preventDefault();
        toggleMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleMode]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      currentPlaybackRef.current?.stop();
      conversationRef.current?.endSession();
    };
  }, []);

  // ── UI ────────────────────────────────────────────────────────────────────
  const isTalking = mode === "talking";
  const talkIsSpeaking = talkStatus === "active" && talkConvoMode === "speaking";
  const talkIsListening = talkStatus === "active" && talkConvoMode === "listening";

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-xl text-xs"
      style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
    >
      {/* Status row */}
      <div className="flex items-center gap-2">
        {isTalking && talkStatus === "connecting" ? (
          <div className="spinner" style={{ width: 12, height: 12 }} />
        ) : isTalking && talkIsSpeaking ? (
          <div className="flex gap-0.5 items-end h-3.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-full animate-pulse"
                style={{ background: "var(--color-accent)", height: `${6 + i * 3}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        ) : isTalking && talkIsListening ? (
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-success)", boxShadow: "0 0 6px var(--color-success)" }} />
        ) : isSpeaking ? (
          <div className="flex gap-0.5 items-end h-3.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 rounded-full animate-pulse"
                style={{ background: "var(--color-accent)", height: `${4 + i * 2}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-border)" }} />
        )}

        <span
          style={{
            color: isTalking
              ? talkIsSpeaking ? "var(--color-accent)" : "var(--color-success)"
              : isSpeaking
              ? "var(--color-accent)"
              : "var(--color-text-muted)",
          }}
        >
          {isTalking
            ? talkStatus === "connecting"
              ? "Connecting..."
              : talkStatus === "error"
              ? "Connection error"
              : talkIsSpeaking
              ? "Vero speaking..."
              : "Listening..."
            : isSpeaking
            ? "Vero coaching..."
            : "Auto-coaching on"}
        </span>
      </div>

      {/* Talk mode toggle button */}
      <button
        onClick={toggleMode}
        disabled={isTalking && talkStatus === "connecting"}
        className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-medium transition-all"
        style={{
          background: isTalking ? "var(--color-success)" : "var(--color-surface)",
          color: isTalking ? "#fff" : "var(--color-text-muted)",
          border: `1px solid ${isTalking ? "var(--color-success)" : "var(--color-border)"}`,
          boxShadow: isTalking ? "0 0 8px var(--color-success)" : "none",
          opacity: isTalking && talkStatus === "connecting" ? 0.6 : 1,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        {isTalking ? "Stop talking (V)" : "Ask Vero (V)"}
      </button>
    </div>
  );
}
