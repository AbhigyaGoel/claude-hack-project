"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Conversation } from "@11labs/client";
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
  /** Current joint angle from pose detection */
  readonly currentAngle?: number;
  /** Target angle for the current exercise */
  readonly targetAngle?: number;
  /** Pause contextual updates (e.g. during rest period) without disconnecting */
  readonly isPaused?: boolean;
}

type CoachStatus = "idle" | "connecting" | "active" | "error";

export default function VoiceCoach({
  currentRep,
  totalReps,
  currentSet,
  totalSets,
  lastRepQuality,
  exerciseName,
  currentAngle,
  targetAngle,
  isPaused = false,
}: VoiceCoachProps) {
  const [status, setStatus] = useState<CoachStatus>("idle");
  const [mode, setMode] = useState<"listening" | "speaking">("listening");
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const conversationRef = useRef<Conversation | null>(null);
  /** Prevents race-condition double-connect (Strict Mode double-mount or rapid remount) */
  const connectingRef = useRef(false);
  const prevRepRef = useRef(0);
  const prevSetRef = useRef(1);
  const mutableMuted = useRef(muted);

  useEffect(() => { mutableMuted.current = muted; }, [muted]);

  // ── Start conversational AI session ────────────────────────────────────────
  const startCoach = useCallback(async () => {
    if (conversationRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setStatus("connecting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/elevenlabs/coach-signed-url", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Signed URL failed: ${res.status}`);
      }
      const { signedUrl } = await res.json();

      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => setStatus("active"),
        onDisconnect: () => {
          conversationRef.current = null;
          connectingRef.current = false;
          setStatus("idle");
        },
        onError: (msg) => {
          console.error("[VoiceCoach]", msg);
          setErrorMsg(typeof msg === "string" ? msg : "Connection error");
          connectingRef.current = false;
          setStatus("error");
        },
        onModeChange: ({ mode: m }) => setMode(m),
      });

      conversationRef.current = conversation;
      connectingRef.current = false;
      // Send initial exercise context now that the reference is fully initialized
      conversation.sendContextualUpdate(
        `EXERCISE START | name: ${exerciseName} | target: ${totalReps} reps x ${totalSets} sets`,
      );
    } catch (err) {
      console.error("[VoiceCoach] startCoach error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect");
      connectingRef.current = false;
      setStatus("error");
    }
  }, [exerciseName, totalReps, totalSets]);

  // Auto-start when component mounts (exercise begins)
  useEffect(() => {
    startCoach();
    return () => {
      conversationRef.current?.endSession();
      conversationRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Push rep data after each rep ───────────────────────────────────────────
  useEffect(() => {
    if (currentRep === 0 || currentRep <= prevRepRef.current) {
      prevRepRef.current = currentRep;
      return;
    }
    prevRepRef.current = currentRep;

    if (!conversationRef.current || mutableMuted.current || isPaused) return;

    const angleInfo =
      currentAngle !== undefined && targetAngle !== undefined
        ? ` | angle: ${Math.round(currentAngle)}deg / target: ${Math.round(targetAngle)}deg`
        : "";

    if (currentRep >= totalReps) {
      conversationRef.current.sendContextualUpdate(
        `SET COMPLETE | set: ${currentSet}/${totalSets} | quality: ${lastRepQuality ?? "green"}`,
      );
    } else {
      conversationRef.current.sendContextualUpdate(
        `REP COMPLETE | rep: ${currentRep}/${totalReps} | quality: ${lastRepQuality ?? "green"}${angleInfo}`,
      );
    }
  }, [currentRep, totalReps, currentSet, totalSets, lastRepQuality, currentAngle, targetAngle, isPaused]);

  // ── Push new set start ─────────────────────────────────────────────────────
  useEffect(() => {
    if (currentSet <= prevSetRef.current) { prevSetRef.current = currentSet; return; }
    prevSetRef.current = currentSet;
    if (!conversationRef.current || mutableMuted.current || isPaused) return;
    conversationRef.current.sendContextualUpdate(
      `SET START | set: ${currentSet}/${totalSets} | exercise: ${exerciseName}`,
    );
  }, [currentSet, totalSets, exerciseName, isPaused]);

  // ── Mute: stop mic but keep connection alive ───────────────────────────────
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      conversationRef.current?.setMicMuted(next);
      return next;
    });
  }, []);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const isSpeaking = status === "active" && mode === "speaking";
  const isListening = status === "active" && mode === "listening" && !muted;

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-xl text-xs"
      style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Animated status indicator */}
          {status === "connecting" ? (
            <div className="spinner" style={{ width: 12, height: 12 }} />
          ) : isSpeaking ? (
            <div className="flex gap-0.5 items-end h-3.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full animate-pulse"
                  style={{
                    background: "var(--color-accent)",
                    height: `${6 + i * 3}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
          ) : isListening ? (
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--color-success)", boxShadow: "0 0 6px var(--color-success)" }}
            />
          ) : (
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-border)" }} />
          )}

          <span
            style={{
              color: isSpeaking
                ? "var(--color-accent)"
                : isListening
                ? "var(--color-success)"
                : "var(--color-text-muted)",
            }}
          >
            {status === "connecting"
              ? "Connecting..."
              : status === "error"
              ? "Coach offline"
              : isSpeaking
              ? "Vero speaking..."
              : isListening
              ? "Listening"
              : muted
              ? "Muted"
              : "Voice coach"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="w-6 h-6 flex items-center justify-center rounded"
            style={{ background: muted ? "var(--color-danger-dim)" : "transparent" }}
          >
            {muted ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isListening ? "var(--color-success)" : "var(--color-text-muted)"} strokeWidth="2" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Retry if errored */}
          {status === "error" && (
            <button
              onClick={startCoach}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Error detail */}
      {status === "error" && errorMsg && (
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-danger)" }}>
          {errorMsg}
        </p>
      )}

      {/* Hint when active */}
      {status === "active" && !muted && (
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          Speak any time — Vero is listening.
        </p>
      )}
    </div>
  );
}
