"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BodyRegion } from "@/types/exercise";
import type { DiagnosticResult } from "@/types/patient";
import { speakNonBlocking, type PlaybackHandle } from "@/lib/elevenLabs";

interface IntakeViewProps {
  onComplete: (result: DiagnosticResult) => void;
  /** Pre-filled region from voice conversation — user clicks override */
  liveRegion?: BodyRegion | null;
  /** Pre-filled responses from voice conversation — user clicks override */
  liveResponses?: Record<string, string>;
}

interface Question {
  id: string;
  text: string;
  type: "select" | "text" | "pain_scale";
  options?: string[];
}

const BODY_REGIONS: { value: BodyRegion; label: string }[] = [
  { value: "cervical", label: "Neck" },
  { value: "shoulder", label: "Shoulder" },
  { value: "lumbar", label: "Lower Back" },
  { value: "hip", label: "Hip" },
  { value: "knee", label: "Knee" },
  { value: "ankle", label: "Ankle" },
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

/** Front-view anatomical silhouette with clickable region hot-spots.
 *  Accepts optional `hoveredRegion` to highlight a body part from outside
 *  (e.g. when the user hovers a named pill in the parent list).
 */
function BodySilhouette({
  regions,
  onSelect,
  hoveredRegion: externalHover,
  onHoverChange,
}: {
  regions: BodyRegion[];
  onSelect: (region: BodyRegion) => void;
  hoveredRegion?: BodyRegion | null;
  onHoverChange?: (r: BodyRegion | null) => void;
}) {
  const [internalHover, setInternalHover] = useState<BodyRegion | null>(null);
  const hovered = externalHover ?? internalHover;

  const setHover = (r: BodyRegion | null) => {
    setInternalHover(r);
    onHoverChange?.(r);
  };

  const HOTSPOTS: Record<BodyRegion, { cx: number; cy: number; label: string }> = {
    cervical: { cx: 110, cy: 76, label: "Neck" },
    shoulder: { cx: 66, cy: 104, label: "Shoulder" },
    lumbar: { cx: 110, cy: 240, label: "Lower Back" },
    hip: { cx: 110, cy: 290, label: "Hip" },
    knee: { cx: 88, cy: 408, label: "Knee" },
    ankle: { cx: 88, cy: 502, label: "Ankle" },
  };

  // Anatomical highlight shapes — bilateral where applicable.
  const HIGHLIGHTS: Record<BodyRegion, React.ReactNode> = {
    cervical: <ellipse cx={110} cy={75} rx={11} ry={12} />,
    shoulder: (
      <>
        <ellipse cx={70} cy={100} rx={15} ry={11} />
        <ellipse cx={150} cy={100} rx={15} ry={11} />
      </>
    ),
    lumbar: <ellipse cx={110} cy={235} rx={38} ry={20} />,
    hip: <ellipse cx={110} cy={285} rx={42} ry={14} />,
    knee: (
      <>
        <ellipse cx={88} cy={408} rx={16} ry={12} />
        <ellipse cx={142} cy={408} rx={16} ry={12} />
      </>
    ),
    ankle: (
      <>
        <ellipse cx={84} cy={500} rx={11} ry={10} />
        <ellipse cx={136} cy={500} rx={11} ry={10} />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 220 560"
      className="h-80 w-auto"
      role="img"
      aria-label="Body diagram — tap a region"
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--color-surface)" />
          <stop offset="50%" stopColor="var(--color-surface-raised)" />
          <stop offset="100%" stopColor="var(--color-surface)" />
        </linearGradient>
        <filter id="bodyShadow" x="-20%" y="-10%" width="140%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="regionGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Soft drop shadow */}
      <g opacity="0.35" filter="url(#bodyShadow)">
        <ellipse cx="110" cy="540" rx="60" ry="6" fill="var(--color-accent)" opacity="0.2" />
      </g>

      <g
        fill="url(#bodyGrad)"
        stroke="var(--color-border-bright)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      >
        {/* Head */}
        <ellipse cx="110" cy="42" rx="22" ry="26" />

        {/* Neck */}
        <path d="M 102 64 L 118 64 L 116 84 Q 110 88 104 84 Z" />

        {/* Torso — sloping shoulders, ribcage, tapered waist, hips */}
        <path
          d="
            M 70 96
            Q 70 82 86 82
            L 134 82
            Q 150 82 150 96
            C 156 116 158 140 156 168
            C 154 195 152 220 148 248
            C 146 262 146 274 148 286
            L 72 286
            C 74 274 74 262 72 248
            C 68 220 66 195 64 168
            C 62 140 64 116 70 96
            Z
          "
        />

        {/* Left arm — deltoid bulge, taper to wrist */}
        <path
          d="
            M 70 100
            C 58 108 50 132 46 168
            C 42 200 42 232 44 256
            C 45 264 56 264 58 256
            C 60 232 62 200 66 170
            C 70 140 76 120 82 108
            Z
          "
        />

        {/* Right arm — mirror */}
        <path
          d="
            M 150 100
            C 162 108 170 132 174 168
            C 178 200 178 232 176 256
            C 175 264 164 264 162 256
            C 160 232 158 200 154 170
            C 150 140 144 120 138 108
            Z
          "
        />

        {/* Left leg — thigh, knee, calf bulge, taper to ankle */}
        <path
          d="
            M 76 286
            L 108 286
            C 106 326 102 376 98 416
            C 96 444 92 476 90 506
            C 90 514 80 514 78 506
            C 76 476 72 444 70 416
            C 68 376 70 326 76 286
            Z
          "
        />

        {/* Right leg — mirror */}
        <path
          d="
            M 112 286
            L 144 286
            C 150 326 152 376 150 416
            C 148 444 144 476 142 506
            C 142 514 132 514 130 506
            C 128 476 124 444 122 416
            C 118 376 114 326 112 286
            Z
          "
        />

        {/* Left foot — heel + forefoot */}
        <path d="M 76 506 C 64 510 60 522 78 522 L 92 522 C 92 514 90 510 90 506 Z" />

        {/* Right foot — mirror */}
        <path d="M 144 506 C 156 510 160 522 142 522 L 128 522 C 128 514 130 510 130 506 Z" />

        {/* Subtle midline for body symmetry hint */}
        <line
          x1="110"
          y1="92"
          x2="110"
          y2="282"
          stroke="var(--color-border)"
          strokeWidth="0.6"
          strokeDasharray="2 4"
          opacity="0.5"
          fill="none"
        />
      </g>

      {/* Region highlight — body part lights up when its hot-spot or pill is hovered */}
      {hovered && (
        <>
          {/* Soft outer glow */}
          <g
            fill="var(--color-accent)"
            opacity="0.45"
            filter="url(#regionGlow)"
            style={{ pointerEvents: "none" }}
            className="animate-fade-in"
          >
            {HIGHLIGHTS[hovered]}
          </g>
          {/* Inner crisp tint */}
          <g
            fill="var(--color-accent)"
            opacity="0.35"
            stroke="var(--color-accent)"
            strokeWidth="1"
            style={{ pointerEvents: "none" }}
            className="animate-fade-in"
          >
            {HIGHLIGHTS[hovered]}
          </g>
        </>
      )}

      {/* Hot-spots */}
      {regions.map((r) => {
        const spot = HOTSPOTS[r];
        const isHovered = hovered === r;
        return (
          <g
            key={r}
            className="cursor-pointer"
            onClick={() => onSelect(r)}
            onMouseEnter={() => setHover(r)}
            onMouseLeave={() => setHover(null)}
          >
            {/* Larger invisible hit target */}
            <circle cx={spot.cx} cy={spot.cy} r="20" fill="transparent" />

            {/* Pulse ring — visible on hover only */}
            {isHovered && (
              <circle
                cx={spot.cx}
                cy={spot.cy}
                r="10"
                fill="var(--color-accent)"
                opacity="0.3"
              >
                <animate
                  attributeName="r"
                  values="8;16;8"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0.05;0.4"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Halo behind dot */}
            <circle
              cx={spot.cx}
              cy={spot.cy}
              r={isHovered ? 8 : 6}
              fill="var(--color-accent)"
              opacity={isHovered ? 0.25 : 0.18}
              style={{ transition: "r 200ms ease, opacity 200ms ease" }}
            />

            {/* Solid dot */}
            <circle
              cx={spot.cx}
              cy={spot.cy}
              r={isHovered ? 5 : 3.8}
              fill="var(--color-accent)"
              stroke="var(--color-background)"
              strokeWidth="1.4"
              style={{ transition: "r 200ms ease" }}
            />

            {/* Label tooltip on hover */}
            {isHovered && (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={spot.cx + 14}
                  y={spot.cy - 12}
                  width={spot.label.length * 6.8 + 12}
                  height="22"
                  rx="6"
                  fill="var(--color-background)"
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                />
                <text
                  x={spot.cx + 20}
                  y={spot.cy + 3}
                  fontSize="11"
                  fontWeight="500"
                  fill="var(--color-accent)"
                >
                  {spot.label}
                </text>
              </g>
            )}

            <title>{spot.label}</title>
          </g>
        );
      })}
    </svg>
  );
}

/** Region picker: body diagram + named pill list, with bidirectional hover sync. */
function RegionPicker({ onSelect }: { onSelect: (region: BodyRegion) => void }) {
  const [hovered, setHovered] = useState<BodyRegion | null>(null);

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Where does it hurt?
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
        Tap the body diagram or pick from the list.
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
        <BodySilhouette
          regions={BODY_REGIONS.map((r) => r.value)}
          onSelect={onSelect}
          hoveredRegion={hovered}
          onHoverChange={setHovered}
        />
        <div className="grid grid-cols-1 gap-2 stagger-children">
          {BODY_REGIONS.map((region) => {
            const isActive = hovered === region.value;
            return (
              <button
                key={region.value}
                onClick={() => onSelect(region.value)}
                onMouseEnter={() => setHovered(region.value)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(region.value)}
                onBlur={() => setHovered(null)}
                className="px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all duration-200 flex items-center justify-between gap-3"
                style={{
                  background: isActive ? "var(--color-accent-glow)" : "var(--color-surface-raised)",
                  border: `1px solid ${isActive ? "var(--color-accent)" : "var(--color-border)"}`,
                  color: "var(--color-text-primary)",
                  transform: isActive ? "translateX(2px)" : undefined,
                }}
              >
                <span>{region.label}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full transition-opacity duration-200"
                  style={{
                    background: "var(--color-accent)",
                    opacity: isActive ? 1 : 0,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

export default function IntakeView({ onComplete, liveRegion, liveResponses }: IntakeViewProps) {
  const router = useRouter();
  const [step, setStep] = useState<IntakeStep>("region");
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [redFlagDetected, setRedFlagDetected] = useState(false);

  // Sync live region from voice — advance to red_flags step, but only if user hasn't already picked one
  useEffect(() => {
    if (liveRegion && !bodyRegion) {
      setBodyRegion(liveRegion);
      setStep("red_flags");
    }
  }, [liveRegion, bodyRegion]);

  // Sync live responses from voice — user-clicked values always win (prev takes precedence)
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
        <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>
          Please consult with a physician or physical therapist.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => {
              setResponses({});
              setBodyRegion(null);
              setRedFlagDetected(false);
              lastSpokenStepRef.current = null;
              setStep("region");
            }}
            className="btn-ghost text-sm"
          >
            Start Over
          </button>
          <button
            onClick={() => router.push("/")}
            className="btn-accent text-sm"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // Step progress
  const steps = ["Where", "Red flags", "Movement"];
  const currentStepIndex = step === "region" ? 0 : step === "red_flags" ? 1 : 2;

  return (
    <div className="glass-card p-6 flex flex-col gap-6 animate-fade-in">
      {/* Speaking indicator */}
      {isSpeaking && <SpeakingIndicator />}

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
        <RegionPicker
          onSelect={handleRegionSelect}
        />
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
