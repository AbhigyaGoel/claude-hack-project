"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import Link from "next/link";
import IntakeView from "@/components/IntakeView";
import RepCounter from "@/components/RepCounter";
import VoiceCoach from "@/components/VoiceCoach";
import PainScale from "@/components/PainScale";
import ExerciseGuide from "@/components/ExerciseGuide";
import ProfileSelector from "@/components/ProfileSelector";
import type { DiagnosticResult } from "@/types/patient";
import type { ExercisePlan, ExercisePlanItem } from "@/types/exercise";
import type { RepQuality } from "@/types/assessment";
import type { Landmark } from "@/types/landmark";
import type { StoredProfile, StoredSession, StoredExerciseResult } from "@/types/storage";
import { queryExercises } from "@/lib/exercises";
import {
  getActiveProfile,
  setActiveProfileId,
  saveProfile,
  saveSession,
  getSessionsForProfile,
} from "@/lib/storage";

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

type SessionStep = "profile" | "returning" | "intake" | "pre_pain" | "exercising" | "rest" | "post_pain" | "summary";

const STEP_LABELS: Record<SessionStep, string> = {
  profile: "Select Profile",
  returning: "Welcome Back",
  intake: "Diagnostic Intake",
  pre_pain: "Pre-Session Rating",
  exercising: "Exercise Session",
  rest: "Rest Period",
  post_pain: "Post-Session Rating",
  summary: "Session Complete",
};

type MovementPhase = "ready" | "lifting" | "holding" | "lowering";

export default function SessionPage() {
  const [step, setStep] = useState<SessionStep>("profile");
  const [activeProfile, setActiveProfile] = useState<StoredProfile | null>(null);
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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visionFaults, setVisionFaults] = useState<string[]>([]);
  const [halted, setHalted] = useState(false);

  // Tracking refs for persistence
  const sessionStartRef = useRef<number>(0);
  const repQualitiesRef = useRef<RepQuality[][]>([[]]); // grouped by exercise index
  const peakAnglesRef = useRef<Record<string, number>[]>([]); // per exercise
  const repsPerSetRef = useRef<number[]>([]); // reps completed per set

  // Auto rep detection state
  const peakAngleRef = useRef(0);
  const repPhaseRef = useRef<"idle" | "ascending" | "descending">("idle");
  const repStartTimeRef = useRef(0);

  const currentExercise = plan?.exercises[currentExerciseIndex];

  // Vision sampling — 1fps webcam frame analysis
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVisionTime = useRef(0);

  const sendVisionFrame = useCallback(async () => {
    if (!videoRef.current || !currentExercise || halted) return;
    const now = Date.now();
    if (now - lastVisionTime.current < 1000) return; // 1fps cap
    lastVisionTime.current = now;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 384;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, 512, 384);
      const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame_base64: base64,
          exercise_context: currentExercise.name,
        }),
      });
      const data = await res.json();

      if (data.faults && data.faults.length > 0) {
        setVisionFaults(data.faults.map((f: { description: string }) => f.description));
      }

      // Severity 5 = halt session
      if (data.overall_severity >= 5) {
        setHalted(true);
        setStep("post_pain");
      }
    } catch {
      // Vision is best-effort, don't break the session
    }
  }, [currentExercise, halted]);

  // Check for existing active profile on mount
  useEffect(() => {
    const profile = getActiveProfile();
    if (profile && profile.diagnostic.cleared_for_exercise) {
      setActiveProfile(profile);
      setStep("returning");
    }
  }, []);

  function handleProfileSelect(profile: StoredProfile) {
    setActiveProfile(profile);
    if (profile.diagnostic.cleared_for_exercise) {
      setStep("returning");
    } else {
      setStep("intake");
    }
  }

  function handleContinueAsReturning() {
    if (!activeProfile) return;
    setDiagnostic(activeProfile.diagnostic);
    buildPlanFromDiagnostic(activeProfile.diagnostic, activeProfile.session_count + 1);
    setStep("pre_pain");
  }

  function handleNewIntake() {
    setStep("intake");
  }

  function buildPlanFromDiagnostic(result: DiagnosticResult, sessionNumber: number) {
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
      session_number: sessionNumber,
      estimated_duration_minutes: 25,
      exercises: planItems,
    });
  }

  function handleIntakeComplete(result: DiagnosticResult) {
    setDiagnostic(result);
    if (result.cleared_for_exercise) {
      // Update or create profile with diagnostic
      if (activeProfile) {
        const updated: StoredProfile = {
          ...activeProfile,
          diagnostic: result,
          updated_at: new Date().toISOString(),
        };
        saveProfile(updated);
        setActiveProfile(updated);
        buildPlanFromDiagnostic(result, updated.session_count + 1);
      } else {
        // No profile — create one from intake
        const newProfile: StoredProfile = {
          id: `profile_${Date.now()}`,
          name: `Patient`,
          diagnostic: result,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          session_count: 0,
        };
        saveProfile(newProfile);
        setActiveProfileId(newProfile.id);
        setActiveProfile(newProfile);
        buildPlanFromDiagnostic(result, 1);
      }
      setStep("pre_pain");
    }
  }

  function handlePrePain(value: number) {
    setPainPre(value);
    sessionStartRef.current = Date.now();
    repQualitiesRef.current = [[]];
    peakAnglesRef.current = [];
    repsPerSetRef.current = [];
    setStep("exercising");
  }

  function completeRep() {
    if (!currentExercise) return;

    const newRep = currentRep + 1;
    setCurrentRep(newRep);

    // Determine quality
    const targetAngle = Object.values(currentExercise.target_angles)[0];
    const tolerance = Object.values(currentExercise.tolerances)[0] || 10;
    const deficit = Math.abs(peakAngleRef.current - targetAngle);
    const quality: RepQuality = deficit <= tolerance ? "green" : deficit <= tolerance * 2 ? "yellow" : "red";
    setLastRepQuality(quality);

    // Track for persistence
    const exerciseQualities = repQualitiesRef.current[currentExerciseIndex] ?? [];
    exerciseQualities.push(quality);
    repQualitiesRef.current[currentExerciseIndex] = exerciseQualities;

    // Track peak angle for this exercise
    if (!peakAnglesRef.current[currentExerciseIndex]) {
      peakAnglesRef.current[currentExerciseIndex] = {};
    }
    const key = Object.keys(currentExercise.target_angles)[0];
    if (key) {
      const prev = peakAnglesRef.current[currentExerciseIndex][key] ?? 0;
      peakAnglesRef.current[currentExerciseIndex][key] = Math.max(prev, peakAngleRef.current);
    }

    // Reset for next rep
    peakAngleRef.current = 0;
    repPhaseRef.current = "idle";

    if (newRep >= currentExercise.reps) {
      repsPerSetRef.current.push(newRep);

      if (currentSet >= currentExercise.sets) {
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= (plan?.exercises.length ?? 0)) {
          setStep("post_pain");
        } else {
          // Initialize tracking for next exercise
          repQualitiesRef.current[nextIndex] = [];
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

      // Trigger vision sampling (1fps, non-blocking)
      sendVisionFrame();

      const side = diagnostic?.side === "right" ? "right" : "left";
      const angleKey = `${side}_shoulder_flexion`;
      const angle = angles[angleKey] || 0;
      setCurrentAngle(angle);

      const targetAngle = Object.values(currentExercise.target_angles)[0];
      const threshold = targetAngle * 0.3;
      const peakThreshold = targetAngle * 0.7;

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
        if (angle < peakAngleRef.current - 8) {
          repPhaseRef.current = "descending";
          setMovementPhase("lowering");
        } else if (angle >= targetAngle * 0.9) {
          setMovementPhase("holding");
        }
      } else if (phase === "descending") {
        if (angle <= threshold) {
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
    persistSession(value);
    setStep("summary");
  }

  function persistSession(postPain: number) {
    if (!plan || !activeProfile || painPre === null) return;

    const durationMinutes = Math.round((Date.now() - sessionStartRef.current) / 60000);
    const exercisesCompleted = currentExerciseIndex + 1;

    const exerciseResults: StoredExerciseResult[] = plan.exercises
      .slice(0, exercisesCompleted)
      .map((ex, i) => {
        const qualities = repQualitiesRef.current[i] ?? [];
        const greenCount = qualities.filter((q) => q === "green").length;
        const formQuality = qualities.length > 0 ? Math.round((greenCount / qualities.length) * 100) : 0;

        return {
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets_completed: i < currentExerciseIndex ? ex.sets : currentSet,
          sets_prescribed: ex.sets,
          reps_per_set: repsPerSetRef.current.slice(
            plan.exercises.slice(0, i).reduce((sum, e) => sum + e.sets, 0),
            plan.exercises.slice(0, i + 1).reduce((sum, e) => sum + e.sets, 0),
          ),
          form_quality_pct: formQuality,
          peak_angles: peakAnglesRef.current[i] ?? {},
          target_angles: ex.target_angles,
          compensations: [],
        };
      });

    const totalQualities = repQualitiesRef.current.flat();
    const totalGreen = totalQualities.filter((q) => q === "green").length;
    const avgFormQuality = totalQualities.length > 0 ? Math.round((totalGreen / totalQualities.length) * 100) : 0;

    const existingSessions = getSessionsForProfile(activeProfile.id);

    const session: StoredSession = {
      id: `session_${Date.now()}`,
      profile_id: activeProfile.id,
      session_number: existingSessions.length + 1,
      date: new Date().toISOString(),
      duration_minutes: Math.max(durationMinutes, 1),
      pain_pre: painPre,
      pain_post: postPain,
      exercises: exerciseResults,
      total_reps: totalQualities.length,
      avg_form_quality: avgFormQuality,
    };

    saveSession(session);
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

      {/* Profile Selection */}
      {step === "profile" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <ProfileSelector
            onSelect={handleProfileSelect}
            onCreateNew={handleNewIntake}
          />
        </div>
      )}

      {/* Returning User */}
      {step === "returning" && activeProfile && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
              Welcome back, {activeProfile.name}
            </h2>
            <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
              {activeProfile.diagnostic.body_region} program
            </p>
            <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>
              {activeProfile.session_count} session{activeProfile.session_count !== 1 ? "s" : ""} completed
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleContinueAsReturning} className="btn-accent">
                Continue Program
              </button>
              <button onClick={handleNewIntake} className="btn-ghost text-sm">
                New Assessment
              </button>
            </div>
          </div>
        </div>
      )}

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
              <WebcamView showAngles onLandmarksDetected={handleLandmarks} onVideoReady={(v) => { videoRef.current = v; }} />
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
            {/* Vision faults */}
            {visionFaults.length > 0 && (
              <div className="glass-card p-3" style={{ borderColor: "var(--color-warning)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--color-warning)" }}>
                  Vision Detection
                </div>
                {visionFaults.map((f, i) => (
                  <div key={i} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{f}</div>
                ))}
              </div>
            )}
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

            <div className="flex gap-3 justify-center">
              <Link href="/progress" className="btn-ghost text-sm">
                View Progress
              </Link>
              <Link href="/" className="btn-accent">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
