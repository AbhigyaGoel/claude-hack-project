"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BodyRegion } from "@/types/exercise";
import type { DiagnosticResult } from "@/types/patient";
import { speakNonBlocking, type PlaybackHandle } from "@/lib/elevenLabs";

interface IntakeViewProps {
  onComplete: (result: DiagnosticResult) => void;
  /** Pre-filled region from voice conversation — user clicks override */
  liveRegion?: BodyRegion | null;
  /** Pre-filled responses from voice conversation — user clicks override */
  liveResponses?: Record<string, string>;
  /** Suppress TTS narration — set when ConversationalIntake is already speaking */
  disableTTS?: boolean;
}

interface Question {
  id: string;
  text: string;
  type: "select" | "text" | "pain_scale";
  options?: string[];
}

const BODY_REGIONS: { value: BodyRegion; label: string; icon: string }[] = [
  { value: "shoulder", label: "Shoulder", icon: "M12 4v4M8 8l8 0M8 8l-2 8M16 8l2 8" },
  { value: "knee", label: "Knee", icon: "M12 4v8M12 12l-3 8M12 12l3 8" },
  { value: "hip", label: "Hip", icon: "M8 6h8M8 6l-2 6h12l-2-6M8 12l-2 8M16 12l2 8" },
  { value: "ankle", label: "Ankle", icon: "M12 4v12M12 16l-4 4M12 16l4 2" },
  { value: "lumbar", label: "Lower Back", icon: "M12 4v16M8 8h8M8 12h8M8 16h8" },
  { value: "cervical", label: "Neck", icon: "M12 8a4 4 0 100-8 4 4 0 000 8zM12 8v12" },
];

const RED_FLAG_QUESTIONS: Question[] = [
  { id: "numbness", text: "Do you experience numbness or tingling?", type: "select", options: ["No", "Yes"] },
  { id: "bowel_bladder", text: "Any changes in bowel or bladder function?", type: "select", options: ["No", "Yes"] },
  { id: "night_pain", text: "Do you have pain that wakes you at night?", type: "select", options: ["No", "Yes"] },
  { id: "fever", text: "Do you have a fever or feel unwell?", type: "select", options: ["No", "Yes"] },
  { id: "trauma", text: "Was there a recent injury or trauma?", type: "select", options: ["No", "Yes — minor", "Yes — significant"] },
  { id: "weight_loss", text: "Any unexplained weight loss recently?", type: "select", options: ["No", "Yes"] },
];

const SHOULDER_QUESTIONS: Question[] = [
  { id: "side", text: "Which side is affected?", type: "select", options: ["Left", "Right", "Both"] },
  { id: "onset", text: "When did the pain start?", type: "select", options: ["Less than 1 week", "1-2 weeks", "2-4 weeks", "1-3 months", "More than 3 months"] },
  { id: "mechanism", text: "What caused the pain?", type: "select", options: ["Overhead lifting", "Repetitive motion", "Fall or impact", "Gradual onset", "Unknown"] },
  { id: "overhead", text: "How much difficulty reaching overhead?", type: "select", options: ["None", "Mild", "Moderate", "Severe", "Unable"] },
  { id: "carrying", text: "How much difficulty carrying objects?", type: "select", options: ["None", "Mild", "Moderate", "Severe", "Unable"] },
  { id: "dressing", text: "How much difficulty dressing?", type: "select", options: ["None", "Mild", "Moderate", "Severe", "Unable"] },
  { id: "pain_level", text: "Rate your current pain (0-10):", type: "pain_scale" },
];

// Voice narration messages
const WELCOME_MESSAGE =
  "Hi, I'm Vero. I'll be guiding you through a quick assessment. Let's start by identifying the area that's bothering you.";
const SAFETY_INTRO =
  "I need to ask you a few safety questions before we begin.";
const TRANSITION_MESSAGE = "Great, let's move on.";

type IntakeStep = "region" | "red_flags" | "assessment" | "complete";

/** Pulsing speaker icon shown while TTS is playing */
function SpeakingIndicator() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="relative flex items-center justify-center w-8 h-8">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 010 7.07" />
          <path d="M19.07 4.93a10 10 0 010 14.14" />
        </svg>
        {/* pulsing ring */}
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: "var(--color-accent)", opacity: 0.2 }}
        />
      </div>
      <span
        className="text-xs font-medium"
        style={{ color: "var(--color-accent)" }}
      >
        Vero is speaking...
      </span>
    </div>
  );
}

export default function IntakeView({ onComplete, liveRegion, liveResponses, disableTTS = false }: IntakeViewProps) {
  const [step, setStep] = useState<IntakeStep>("region");
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [redFlagDetected, setRedFlagDetected] = useState(false);
  const [voiceAutofilled, setVoiceAutofilled] = useState(false);

  // Sync live region + responses from voice — smart auto-advance based on what was filled
  useEffect(() => {
    if (!liveRegion || !liveResponses || Object.keys(liveResponses).length === 0) return;

    const allRedFlagsFilled = RED_FLAG_QUESTIONS.every((q) => liveResponses[q.id]);

    if (allRedFlagsFilled && !bodyRegion) {
      setBodyRegion(liveRegion);
      setVoiceAutofilled(true);

      const hasRedFlag =
        liveResponses.numbness === "Yes" ||
        liveResponses.bowel_bladder === "Yes" ||
        liveResponses.night_pain === "Yes" ||
        liveResponses.fever === "Yes" ||
        liveResponses.weight_loss === "Yes" ||
        liveResponses.trauma?.startsWith("Yes");

      // All clear — skip straight to assessment; otherwise pause at red_flags for review
      setStep(hasRedFlag ? "red_flags" : "assessment");
    } else if (liveRegion && !bodyRegion) {
      setBodyRegion(liveRegion);
      setStep("red_flags");
    }
  }, [liveRegion, liveResponses, bodyRegion]);

  // Sync live responses — user-clicked values always win (prev takes precedence)
  useEffect(() => {
    if (liveResponses && Object.keys(liveResponses).length > 0) {
      setResponses((prev) => ({ ...liveResponses, ...prev }));
    }
  }, [liveResponses]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Track the current playback so we can cancel it
  const playbackRef = useRef<PlaybackHandle | null>(null);
  // Track whether the welcome message has been spoken
  const welcomeSpokenRef = useRef(false);
  // Track last spoken step to avoid re-speaking on re-renders
  const lastSpokenStepRef = useRef<string | null>(null);

  /** Stop any ongoing TTS playback */
  const stopPlayback = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
  }, []);

  /** Speak text via ElevenLabs TTS (non-blocking, cancellable) */
  const speak = useCallback(
    (text: string) => {
      stopPlayback();
      const handle = speakNonBlocking(text, setIsSpeaking);
      playbackRef.current = handle;
    },
    [stopPlayback],
  );

  // Speak welcome message on mount
  useEffect(() => {
    if (disableTTS) return;
    if (!welcomeSpokenRef.current) {
      welcomeSpokenRef.current = true;
      speak(WELCOME_MESSAGE);
    }
    // cleanup on unmount
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speak step-transition narration when step changes
  useEffect(() => {
    if (disableTTS) return;
    if (lastSpokenStepRef.current === step) return;
    lastSpokenStepRef.current = step;

    if (step === "red_flags") {
      speak(SAFETY_INTRO);
    } else if (step === "assessment") {
      speak(
        TRANSITION_MESSAGE +
          " Now let's assess your " +
          (bodyRegion ?? "condition") +
          ".",
      );
    }
  }, [step, bodyRegion, speak]);

  function handleRegionSelect(region: BodyRegion) {
    stopPlayback();
    setBodyRegion(region);
    setStep("red_flags");
  }

  function handleResponse(questionId: string, value: string) {
    stopPlayback();
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleRedFlagsComplete() {
    stopPlayback();
    const flags: string[] = [];
    if (responses.numbness === "Yes") flags.push("numbness_tingling");
    if (responses.bowel_bladder === "Yes") flags.push("bowel_bladder_changes");
    if (responses.night_pain === "Yes") flags.push("night_pain");
    if (responses.fever === "Yes") flags.push("fever");
    if (responses.trauma === "Yes — significant") flags.push("significant_trauma");
    if (responses.weight_loss === "Yes") flags.push("unexplained_weight_loss");

    if (flags.length > 0) {
      setRedFlagDetected(true);
      onComplete({
        body_region: bodyRegion!,
        side: "bilateral",
        onset: "",
        mechanism: "",
        severity_score: 0,
        instrument_used: "screening",
        functional_deficits: [],
        contraindications: [],
        red_flags: flags,
        cleared_for_exercise: false,
      });
      return;
    }

    setStep("assessment");
  }

  function handleAssessmentComplete() {
    stopPlayback();
    const sideMap: Record<string, "left" | "right" | "bilateral"> = {
      Left: "left", Right: "right", Both: "bilateral",
    };

    const severityMap: Record<string, number> = {
      None: 0, Mild: 25, Moderate: 50, Severe: 75, Unable: 100,
    };

    const deficits: string[] = [];
    if (severityMap[responses.overhead] >= 50) deficits.push("overhead_reaching");
    if (severityMap[responses.carrying] >= 50) deficits.push("carrying");
    if (severityMap[responses.dressing] >= 50) deficits.push("dressing");

    const avgSeverity = Math.round(
      ([responses.overhead, responses.carrying, responses.dressing]
        .map((r) => severityMap[r] || 0)
        .reduce((a, b) => a + b, 0)) / 3,
    );

    onComplete({
      body_region: bodyRegion!,
      side: sideMap[responses.side] || "bilateral",
      onset: responses.onset || "",
      mechanism: responses.mechanism || "",
      severity_score: avgSeverity,
      instrument_used: "DASH",
      functional_deficits: deficits,
      contraindications: [],
      red_flags: [],
      cleared_for_exercise: true,
    });
  }

  if (redFlagDetected) {
    return (
      <div className="glass-card p-8 text-center animate-fade-in" style={{ borderColor: "rgba(248,113,113,0.3)" }}>
        <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--color-danger-dim)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--color-danger)" }}>
          Medical Evaluation Recommended
        </h2>
        <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--color-text-secondary)" }}>
          Your responses indicate potential red flags that require professional
          medical evaluation before beginning an exercise program.
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Please consult with a physician or physical therapist.
        </p>
      </div>
    );
  }

  // Step progress
  const steps = ["Region", "Safety", "Assessment"];
  const currentStepIndex = step === "region" ? 0 : step === "red_flags" ? 1 : 2;

  return (
    <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in">
      {/* Speaking indicator */}
      {isSpeaking && <SpeakingIndicator />}

      {/* Voice autofill banner */}
      {voiceAutofilled && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "var(--color-success-dim)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Vero pre-filled this from your description — adjust anything that looks off
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold shrink-0 transition-all duration-300"
                style={{
                  background: i <= currentStepIndex ? "var(--color-accent)" : "var(--color-surface-raised)",
                  color: i <= currentStepIndex ? "var(--color-background)" : "var(--color-text-muted)",
                  border: `1px solid ${i <= currentStepIndex ? "var(--color-accent)" : "var(--color-border)"}`,
                }}
              >
                {i + 1}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: i <= currentStepIndex ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-px flex-1 transition-all duration-300"
                style={{ background: i < currentStepIndex ? "var(--color-accent)" : "var(--color-border)" }}
              />
            )}
          </div>
        ))}
      </div>

      {step === "region" && (
        <div className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Where are you experiencing pain?
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            Select the primary area of discomfort.
          </p>
          <div className="grid grid-cols-2 gap-3 stagger-children">
            {BODY_REGIONS.map((region) => (
              <button
                key={region.value}
                onClick={() => handleRegionSelect(region.value)}
                className="p-4 rounded-xl text-left transition-all duration-200 group"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border-bright)";
                  e.currentTarget.style.background = "var(--color-accent-glow)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.background = "var(--color-surface-raised)";
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--color-accent-dim)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
                      <path d={region.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {region.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "red_flags" && (
        <div className="animate-fade-in">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Safety Screening
            </h2>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  const allClear: Record<string, string> = {};
                  RED_FLAG_QUESTIONS.forEach((q) => { allClear[q.id] = "No"; });
                  setResponses((prev) => ({ ...prev, ...allClear }));
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                style={{ background: "var(--color-success-dim)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}
              >
                All Clear
              </button>
              <button
                onClick={() => {
                  const rand: Record<string, string> = {};
                  RED_FLAG_QUESTIONS.forEach((q) => {
                    rand[q.id] = q.options![Math.floor(Math.random() * q.options!.length)];
                  });
                  setResponses((prev) => ({ ...prev, ...rand }));
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
              >
                Randomize
              </button>
            </div>
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            These questions help us ensure exercise is safe for you.
          </p>
          <div className="flex flex-col gap-4 stagger-children">
            {RED_FLAG_QUESTIONS.map((q) => (
              <div key={q.id} className="p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <p className="text-sm font-medium mb-2.5" style={{ color: "var(--color-text-primary)" }}>{q.text}</p>
                <div className="flex gap-2 flex-wrap">
                  {q.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleResponse(q.id, opt)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                      style={{
                        background: responses[q.id] === opt ? "var(--color-accent-dim)" : "var(--color-surface)",
                        color: responses[q.id] === opt ? "var(--color-accent)" : "var(--color-text-secondary)",
                        border: `1px solid ${responses[q.id] === opt ? "var(--color-accent)" : "var(--color-border)"}`,
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleRedFlagsComplete}
            disabled={RED_FLAG_QUESTIONS.some((q) => !responses[q.id])}
            className="btn-accent w-full mt-5"
          >
            Continue
          </button>
        </div>
      )}

      {step === "assessment" && (
        <div className="animate-fade-in">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {bodyRegion && bodyRegion.charAt(0).toUpperCase() + bodyRegion.slice(1)} Assessment
            </h2>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  const defaults: Record<string, string> = {
                    side: "Right", onset: "1-2 weeks", mechanism: "Gradual onset",
                    overhead: "Mild", carrying: "Mild", dressing: "None", pain_level: "3",
                  };
                  setResponses((prev) => ({ ...prev, ...defaults }));
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                style={{ background: "var(--color-success-dim)", color: "var(--color-success)", border: "1px solid var(--color-success)" }}
              >
                Auto-fill
              </button>
              <button
                onClick={() => {
                  const rand: Record<string, string> = {};
                  SHOULDER_QUESTIONS.forEach((q) => {
                    if (q.type === "select") {
                      rand[q.id] = q.options![Math.floor(Math.random() * q.options!.length)];
                    } else if (q.type === "pain_scale") {
                      rand[q.id] = String(Math.floor(Math.random() * 11));
                    }
                  });
                  setResponses((prev) => ({ ...prev, ...rand }));
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
              >
                Randomize
              </button>
            </div>
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            Rate your functional limitations to personalize your program.
          </p>
          <div className="flex flex-col gap-4 stagger-children">
            {SHOULDER_QUESTIONS.map((q) => (
              <div key={q.id} className="p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <p className="text-sm font-medium mb-2.5" style={{ color: "var(--color-text-primary)" }}>{q.text}</p>
                {q.type === "select" && (
                  <div className="flex flex-wrap gap-2">
                    {q.options?.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleResponse(q.id, opt)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                        style={{
                          background: responses[q.id] === opt ? "var(--color-accent-dim)" : "var(--color-surface)",
                          color: responses[q.id] === opt ? "var(--color-accent)" : "var(--color-text-secondary)",
                          border: `1px solid ${responses[q.id] === opt ? "var(--color-accent)" : "var(--color-border)"}`,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "pain_scale" && (
                  <div className="flex gap-1.5">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => handleResponse(q.id, String(i))}
                        className="w-8 h-8 rounded-lg text-xs font-mono font-medium transition-all duration-200"
                        style={{
                          background: responses[q.id] === String(i)
                            ? (i <= 3 ? "var(--color-success-dim)" : i <= 6 ? "var(--color-warning-dim)" : "var(--color-danger-dim)")
                            : "var(--color-surface)",
                          color: responses[q.id] === String(i)
                            ? (i <= 3 ? "var(--color-success)" : i <= 6 ? "var(--color-warning)" : "var(--color-danger)")
                            : "var(--color-text-muted)",
                          border: `1px solid ${responses[q.id] === String(i)
                            ? (i <= 3 ? "var(--color-success)" : i <= 6 ? "var(--color-warning)" : "var(--color-danger)")
                            : "var(--color-border)"}`,
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleAssessmentComplete}
            disabled={SHOULDER_QUESTIONS.some((q) => !responses[q.id])}
            className="btn-accent w-full mt-5"
          >
            Generate Exercise Plan
          </button>
        </div>
      )}

      {step === "complete" && (
        <div className="text-center py-12 animate-fade-in">
          <div className="spinner mx-auto mb-5" />
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Generating your personalized exercise plan...
          </p>
        </div>
      )}
    </div>
  );
}
