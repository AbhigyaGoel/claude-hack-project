"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Conversation } from "@11labs/client";
import type { DiagnosticResult } from "@/types/patient";
import type { BodyRegion } from "@/types/exercise";

interface ConversationalIntakeProps {
  onComplete: (result: DiagnosticResult) => void;
  onFallbackToText: () => void;
  /** Fired whenever the agent captures a field — lets parent pre-fill the survey in real time */
  onLiveUpdate?: (data: { region?: BodyRegion; responses?: Record<string, string> }) => void;
}

type ConvStatus = "idle" | "connecting" | "active" | "processing" | "error";
type SpeakMode = "listening" | "speaking";

interface TranscriptEntry {
  id: string;
  source: "ai" | "user";
  text: string;
}

export default function ConversationalIntake({
  onComplete,
  onFallbackToText,
  onLiveUpdate,
}: ConversationalIntakeProps) {
  const [status, setStatus] = useState<ConvStatus>("idle");
  const [mode, setMode] = useState<SpeakMode>("listening");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const conversationRef = useRef<Conversation | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Structured intake data accumulated via client tools
  const bodyRegionRef = useRef<BodyRegion | null>(null);
  const redFlagsRef = useRef<string[]>([]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const appendTranscript = useCallback((source: "ai" | "user", text: string) => {
    setTranscript((prev) => [
      ...prev,
      { id: `${source}_${Date.now()}_${Math.random()}`, source, text },
    ]);
  }, []);

  const startConversation = useCallback(async () => {
    setStatus("connecting");
    setErrorMsg(null);

    try {
      // Get signed URL from our server (keeps API key server-side)
      const res = await fetch("/api/elevenlabs/signed-url", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Signed URL request failed: ${res.status}`);
      }
      const { signedUrl } = await res.json();

      const conversation = await Conversation.startSession({
        signedUrl,

        clientTools: {
          /** Agent calls this once it identifies the body region */
          record_body_region: ({ region }: { region: BodyRegion }) => {
            bodyRegionRef.current = region;
            onLiveUpdate?.({ region });
            return "recorded";
          },

          /** Agent calls this after red flag screening */
          record_red_flags: ({ flags }: { flags: string[] }) => {
            redFlagsRef.current = flags;
            // Map flags to survey response format so the survey reflects red flag answers
            const flagResponses: Record<string, string> = {
              numbness: flags.includes("numbness_tingling") ? "Yes" : "No",
              bowel_bladder: flags.includes("bowel_bladder_changes") ? "Yes" : "No",
              night_pain: flags.includes("night_pain") ? "Yes" : "No",
              fever: flags.includes("fever") ? "Yes" : "No",
              weight_loss: flags.includes("unexplained_weight_loss") ? "Yes" : "No",
            };
            onLiveUpdate?.({ responses: flagResponses });
            return "recorded";
          },

          /** Agent calls this when full assessment is collected */
          complete_assessment: async ({
            body_region, side, onset, mechanism, pain_level, functional_responses,
          }: {
            body_region: BodyRegion;
            side: string;
            onset: string;
            mechanism?: string;
            pain_level: number;
            functional_responses?: Record<string, string>;
          }) => {
            setStatus("processing");

            try {
              const responses = {
                side,
                onset,
                mechanism: mechanism ?? "unknown",
                pain_level: String(pain_level),
                ...(functional_responses ?? {}),
              };

              // Push final assessment data to the survey before processing
              onLiveUpdate?.({ region: body_region, responses });

              const intakeRes = await fetch("/api/intake", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bodyRegion: body_region,
                  responses,
                  redFlags: redFlagsRef.current,
                }),
              });

              if (!intakeRes.ok) throw new Error("Intake API failed");
              const data = await intakeRes.json();
              onComplete(data.diagnostic as DiagnosticResult);
            } catch (err) {
              console.error("[ConversationalIntake] complete_assessment error:", err);
              // Fallback: build a minimal DiagnosticResult from what we have
              onComplete({
                body_region: body_region ?? bodyRegionRef.current ?? "shoulder",
                side: (side as "left" | "right" | "bilateral") ?? "bilateral",
                onset: onset ?? "unknown",
                mechanism: mechanism ?? "unknown",
                severity_score: Math.round(pain_level * 10),
                instrument_used: "voice",
                functional_deficits: [],
                contraindications: [],
                red_flags: redFlagsRef.current,
                cleared_for_exercise: redFlagsRef.current.length === 0,
              });
            }

            return "complete";
          },
        },

        onConnect: () => setStatus("active"),

        onDisconnect: () => {
          conversationRef.current = null;
          // If still active (agent ended), leave status as-is so processing spinner stays
          setStatus((prev) => (prev === "active" ? "idle" : prev));
        },

        onError: (msg) => {
          console.error("[ConversationalIntake] error:", msg);
          setErrorMsg(typeof msg === "string" ? msg : "Connection error");
          setStatus("error");
        },

        onMessage: ({ message, source }) => {
          if (message) appendTranscript(source, message);
        },

        onModeChange: ({ mode: m }) => setMode(m),
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error("[ConversationalIntake] startSession error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect");
      setStatus("error");
    }
  }, [appendTranscript, onComplete]);

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setStatus("idle");
    setTranscript([]);
    bodyRegionRef.current = null;
    redFlagsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversationRef.current?.endSession();
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (status === "processing") {
    return (
      <div className="glass-card p-10 text-center animate-fade-in">
        <div className="spinner mx-auto mb-5" />
        <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Analyzing your responses...
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          Building your personalized exercise plan
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="glass-card p-8 text-center animate-fade-in">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "var(--color-danger-dim)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-danger)" }}>
          {errorMsg ?? "Connection failed"}
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>
          Check that your microphone is allowed in browser settings.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setStatus("idle"); setErrorMsg(null); }} className="btn-ghost text-sm">
            Try Again
          </button>
          <button onClick={onFallbackToText} className="btn-accent text-sm">
            Type Instead
          </button>
        </div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="glass-card p-10 text-center animate-fade-in flex flex-col items-center gap-5">
        {/* Mic icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-accent-dim)", border: "1px solid var(--color-accent)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Talk to Vero
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Answer a few quick questions by voice — takes about 60 seconds.
          </p>
        </div>

        <button onClick={startConversation} className="btn-accent px-8">
          Start Voice Intake
        </button>

        <button
          onClick={onFallbackToText}
          className="text-xs transition-colors duration-200"
          style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer" }}
        >
          prefer text? → Type instead
        </button>
      </div>
    );
  }

  // connecting or active
  return (
    <div className="glass-card p-5 flex flex-col gap-4 animate-fade-in" style={{ minHeight: "360px" }}>
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "connecting" ? (
            <div className="spinner" style={{ width: 14, height: 14 }} />
          ) : mode === "speaking" ? (
            <div className="flex gap-0.5 items-end h-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full animate-pulse"
                  style={{
                    background: "var(--color-accent)",
                    height: `${8 + i * 4}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ background: "var(--color-success)" }}
            />
          )}
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {status === "connecting"
              ? "Connecting to Vero..."
              : mode === "speaking"
              ? "Vero is speaking..."
              : "Listening..."}
          </span>
        </div>

        <button
          onClick={endConversation}
          className="text-xs px-2 py-1 rounded"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          End
        </button>
      </div>

      {/* Transcript */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "260px" }}>
        {transcript.length === 0 && status === "active" && (
          <p className="text-xs italic text-center mt-8" style={{ color: "var(--color-text-muted)" }}>
            Conversation will appear here...
          </p>
        )}
        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={`flex ${entry.source === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed"
              style={{
                background:
                  entry.source === "ai"
                    ? "var(--color-surface-raised)"
                    : "var(--color-accent-dim)",
                color:
                  entry.source === "ai"
                    ? "var(--color-text-secondary)"
                    : "var(--color-accent)",
                border: `1px solid ${entry.source === "ai" ? "var(--color-border)" : "var(--color-accent)"}`,
              }}
            >
              {entry.text}
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Fallback link */}
      <button
        onClick={() => { endConversation(); onFallbackToText(); }}
        className="text-xs self-center transition-colors duration-200"
        style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer" }}
      >
        switch to text intake
      </button>
    </div>
  );
}
