"use client";

import { useState, useCallback, useRef, lazy, Suspense } from "react";
import Link from "next/link";
import IntakeView from "@/components/IntakeView";
import RepCounter from "@/components/RepCounter";
import VoiceCoach from "@/components/VoiceCoach";
import PainScale from "@/components/PainScale";
import ExerciseGuide from "@/components/ExerciseGuide";
import type { DiagnosticResult } from "@/types/patient";
import type { ExercisePlan, ExercisePlanItem } from "@/types/exercise";
import type { RepQuality } from "@/types/assessment";
import type { Landmark } from "@/types/landmark";
import { queryExercises } from "@/lib/exercises";

const WebcamView = lazy(() => import("@/components/WebcamView"));

function WebcamLoading() {
  return (
    <div className="flex-1 flex items-center justify-center glass-card">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Preparing camera...</p>
      </div>
    </div>
  );
}

type SessionStep = "intake" | "pre_pain" | "exercising" | "rest" | "post_pain" | "summary";

const STEP_LABELS: Record<SessionStep, string> = {
  intake: "Diagnostic Intake",
  pre_pain: "Pre-Session Rating",
  exercising: "Exercise Session",
  rest: "Rest Period",
  post_pain: "Post-Session Rating",
  summary: "Session Complete",
};

type MovementPhase = "ready" | "lifting" | "holding" | "lowering";

export default function SessionPage() {
  const [step, setStep] = useState<SessionStep>("intake");
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [plan, setPlan] = useState<ExercisePlan | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [lastRepQuality, setLastRepQuality] = useState<RepQuality | undefined>();
  const [painPre, setPainPre] = useState<number | null>(null);
  const [painPost, setPainPost] = useState<number | null>(null);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [movementPhase, setMovementPhase] = useState<MovementPhase>("ready");

  // Auto rep detection state (refs to avoid re-renders every frame)
  const peakAngleRef = useRef(0);
  const repPhaseRef = useRef<"idle" | "ascending" | "descending">("idle");
  const repStartTimeRef = useRef(0);

  const currentExercise = plan?.exercises[currentExerciseIndex];

  function handleIntakeComplete(result: DiagnosticResult) {
    setDiagnostic(result);
    if (result.cleared_for_exercise) {
      const exercises = queryExercises({
        body_region: result.body_region,
        difficulty_range: [1, result.severity_score > 50 ? 2 : 3],
      });

      const planItems: ExercisePlanItem[] = exercises.slice(0, 5).map((ex) => ({
        id: ex.id,
        name: ex.name,
        target_muscles: ex.target_muscles,
        target_angles: ex.target_angles,
        tolerances: ex.tolerances,
        tempo_seconds: ex.tempo_seconds,
        sets: ex.default_sets,
        reps: ex.default_reps,
        rest_seconds: 60,
        cues: ex.cues,
        compensation_patterns: ex.compensation_patterns,
        regression: ex.regression,
        progression: ex.progression,
      }));

      setPlan({
        session_number: 1,
        estimated_duration_minutes: 25,
        exercises: planItems,
      });

      setStep("pre_pain");
    }
  }

  function handlePrePain(value: number) {
    setPainPre(value);
    setStep("exercising");
  }

  function completeRep() {
    if (!currentExercise) return;

    const newRep = currentRep + 1;
    setCurrentRep(newRep);

    // Determine quality based on peak angle vs target
    const targetAngle = Object.values(currentExercise.target_angles)[0];
    const tolerance = Object.values(currentExercise.tolerances)[0] || 10;
    const deficit = Math.abs(peakAngleRef.current - targetAngle);
    const quality: RepQuality = deficit <= tolerance ? "green" : deficit <= tolerance * 2 ? "yellow" : "red";
    setLastRepQuality(quality);

    // Reset for next rep
    peakAngleRef.current = 0;
    repPhaseRef.current = "idle";

    if (newRep >= currentExercise.reps) {
      if (currentSet >= currentExercise.sets) {
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= (plan?.exercises.length ?? 0)) {
          setStep("post_pain");
        } else {
          setCurrentExerciseIndex(nextIndex);
          setCurrentSet(1);
          setCurrentRep(0);
          setStep("rest");
        }
      } else {
        setCurrentSet(currentSet + 1);
        setCurrentRep(0);
        setStep("rest");
      }
    }
  }

  const handleLandmarks = useCallback(
    (_landmarks: Landmark[], angles: Record<string, number>) => {
      if (!currentExercise) return;

      const side = diagnostic?.side === "right" ? "right" : "left";
      const angleKey = `${side}_shoulder_flexion`;
      const angle = angles[angleKey] || 0;
      setCurrentAngle(angle);

      // Auto rep detection
      const targetAngle = Object.values(currentExercise.target_angles)[0];
      const threshold = targetAngle * 0.3; // Start threshold
      const peakThreshold = targetAngle * 0.7; // Must reach 70% of target to count

      const phase = repPhaseRef.current;

      if (phase === "idle") {
        if (angle > threshold) {
          repPhaseRef.current = "ascending";
          repStartTimeRef.current = performance.now();
          peakAngleRef.current = angle;
          setMovementPhase("lifting");
        } else {
          setMovementPhase("ready");
        }
      } else if (phase === "ascending") {
        if (angle > peakAngleRef.current) {
          peakAngleRef.current = angle;
        }
        // Detect peak — angle dropping significantly
        if (angle < peakAngleRef.current - 8) {
          repPhaseRef.current = "descending";
          setMovementPhase("lowering");
        } else if (angle >= targetAngle * 0.9) {
          setMovementPhase("holding");
        }
      } else if (phase === "descending") {
        if (angle <= threshold) {
          // Rep complete — only count if peak was high enough
          if (peakAngleRef.current >= peakThreshold) {
            completeRep();
          }
          repPhaseRef.current = "idle";
          setMovementPhase("ready");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentExercise, diagnostic, currentRep, currentSet, currentExerciseIndex, plan],
  );

  function resumeFromRest() {
    peakAngleRef.current = 0;
    repPhaseRef.current = "idle";
    setMovementPhase("ready");
    setStep("exercising");
  }

  function handlePostPain(value: number) {
    setPainPost(value);
    setStep("summary");
  }

  return (
    <main className="flex-1 flex flex-col p-4 gap-4" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          style={{ color: "var(--color-text-muted)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Exit
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: step === "exercising" ? "var(--color-success)" : "var(--color-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {STEP_LABELS[step]}
          </span>
        </div>

        {plan && (
          <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            {currentExerciseIndex + 1}/{plan.exercises.length}
          </span>
        )}
        {!plan && <div className="w-12" />}
      </header>

      {/* Intake */}
      {step === "intake" && (
        <div className="flex-1 flex items-start justify-center pt-4 overflow-y-auto">
          <div className="w-full max-w-2xl">
            <IntakeView onComplete={handleIntakeComplete} />
          </div>
        </div>
      )}

      {/* Pre-pain */}
      {step === "pre_pain" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <PainScale label="How would you rate your pain right now?" onSelect={handlePrePain} />
        </div>
      )}

      {/* Exercise */}
      {step === "exercising" && currentExercise && (
        <div className="flex-1 flex gap-4 min-h-0 animate-fade-in">
          <div className="flex-1 min-h-0">
            <Suspense fallback={<WebcamLoading />}>
              <WebcamView showAngles onLandmarksDetected={handleLandmarks} />
            </Suspense>
          </div>
          <aside className="w-80 flex flex-col gap-3 overflow-y-auto">
            <VoiceCoach
              currentRep={currentRep}
              totalReps={currentExercise.reps}
              currentSet={currentSet}
              totalSets={currentExercise.sets}
              lastRepQuality={lastRepQuality}
              movementPhase={movementPhase}
              exerciseName={currentExercise.name}
            />
            <RepCounter
              currentRep={currentRep}
              totalReps={currentExercise.reps}
              currentSet={currentSet}
              totalSets={currentExercise.sets}
              lastRepQuality={lastRepQuality}
              currentAngle={currentAngle}
              targetAngle={Object.values(currentExercise.target_angles)[0]}
            />
            <ExerciseGuide
              exercise={currentExercise}
              currentAngle={currentAngle}
              targetAngle={Object.values(currentExercise.target_angles)[0]}
              phase={movementPhase}
            />
          </aside>
        </div>
      )}

      {/* Rest */}
      {step === "rest" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-12 text-center max-w-md">
            <div className="text-6xl font-light font-mono mb-2" style={{ color: "var(--color-accent)" }}>
              Rest
            </div>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
              Take a 60-second break before the next set
            </p>
            {plan && currentExerciseIndex < plan.exercises.length && (
              <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Next: <span style={{ color: "var(--color-accent)" }}>{plan.exercises[currentExerciseIndex]?.name}</span>
              </p>
            )}
            <button onClick={resumeFromRest} className="btn-accent">
              Continue Exercise
            </button>
          </div>
        </div>
      )}

      {/* Post-pain */}
      {step === "post_pain" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <PainScale label="How would you rate your pain now?" onSelect={handlePostPain} />
        </div>
      )}

      {/* Summary */}
      {step === "summary" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-8 max-w-lg w-full text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "var(--color-success-dim)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>

            <h2 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
              Session Complete
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="text-3xl font-semibold font-mono" style={{ color: "var(--color-accent)" }}>
                  {plan?.exercises.length}
                </div>
                <div className="data-label mt-1">Exercises</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="text-3xl font-semibold font-mono" style={{
                  color: painPre !== null && painPost !== null && painPre > painPost
                    ? "var(--color-success)"
                    : "var(--color-text-primary)"
                }}>
                  {painPre !== null && painPost !== null
                    ? (painPre - painPost > 0 ? `-${painPre - painPost}` : painPre - painPost === 0 ? "0" : `+${painPost - painPre}`)
                    : "—"}
                </div>
                <div className="data-label mt-1">Pain Change</div>
              </div>
            </div>

            {painPre !== null && painPost !== null && (
              <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                <div>
                  <span className="data-label mr-1.5">Before</span>
                  <span className="font-mono" style={{ color: "var(--color-text-primary)" }}>{painPre}/10</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <div>
                  <span className="data-label mr-1.5">After</span>
                  <span className="font-mono" style={{ color: "var(--color-text-primary)" }}>{painPost}/10</span>
                </div>
              </div>
            )}

            <Link href="/" className="btn-accent inline-block">
              Return Home
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
