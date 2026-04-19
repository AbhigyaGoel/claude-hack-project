"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import IntakeView from "@/components/IntakeView";
import ConversationalIntake from "@/components/ConversationalIntake";
import RepCounter from "@/components/RepCounter";
import VoiceCoach from "@/components/VoiceCoach";
import PainScale from "@/components/PainScale";
import ExerciseGuide from "@/components/ExerciseGuide";
import type { DiagnosticResult } from "@/types/patient";
import type { ExercisePlan, ExercisePlanItem } from "@/types/exercise";
import type { RepQuality } from "@/types/assessment";
import type { Landmark } from "@/types/landmark";
import type { PatientRecord, ExerciseResult } from "@/types/storage";
import { queryExercises } from "@/lib/exercises";
import { mapExerciseAngleKey } from "@/lib/angleCalculator";
import {
  getActivePatient,
  setActivePatientId,
  createPatient,
  listSessions,
  saveSession,
  getCurrentUser,
} from "@/lib/api";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

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

type SessionStep = "loading" | "intake" | "pre_pain" | "exercising" | "rest" | "post_pain" | "summary";

const STEP_LABELS: Record<SessionStep, string> = {
  loading: "Loading",
  intake: "Diagnostic Intake",
  pre_pain: "Pre-Session Rating",
  exercising: "Exercise Session",
  rest: "Rest Period",
  post_pain: "Post-Session Rating",
  summary: "Session Complete",
};

type MovementPhase = "ready" | "lifting" | "holding" | "lowering";

export default function SessionPage() {
  const router = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [useVoiceIntake, setUseVoiceIntake] = useState(true);
  const [liveIntakeRegion, setLiveIntakeRegion] = useState<import("@/types/exercise").BodyRegion | null>(null);
  const [liveIntakeResponses, setLiveIntakeResponses] = useState<Record<string, string>>({});
  const [step, setStep] = useState<SessionStep>("loading");
  const [activeProfile, setActiveProfile] = useState<PatientRecord | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [plan, setPlan] = useState<ExercisePlan | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [lastRepQuality, setLastRepQuality] = useState<RepQuality | undefined>();
  const [painPre, setPainPre] = useState<number | null>(null);
  const [painPost, setPainPost] = useState<number | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [showPlanIntro, setShowPlanIntro] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [movementPhase, setMovementPhase] = useState<MovementPhase>("ready");

  // Tracking refs
  const sessionStartRef = useRef<number>(0);
  const repQualitiesRef = useRef<RepQuality[][]>([[]]);
  const peakAnglesRef = useRef<Record<string, number>[]>([]);
  const repsPerSetRef = useRef<number[]>([]);

  // Rep detection state
  const peakAngleRef = useRef(0);
  const repPhaseRef = useRef<"idle" | "ascending" | "descending">("idle");
  const repStartTimeRef = useRef(0);

  const currentExercise = plan?.exercises[currentExerciseIndex];

  // Check for existing active patient on mount. A cleared returning patient
  // skips the "welcome back" confirmation and goes straight into the session
  // — the demo flow has a single seeded patient, so the picker adds friction
  // without offering real choice.
  useEffect(() => {
    let cancelled = false;
    getActivePatient()
      .then((profile) => {
        if (cancelled) return;
        if (profile?.profile?.diagnostic?.cleared_for_exercise) {
          setActiveProfile(profile);
          const dx = profile.profile.diagnostic;
          setDiagnostic(dx);
          buildPlanFromDiagnostic(dx, profile.session_count + 1);
          setStep("pre_pain");
        } else if (profile) {
          setActiveProfile(profile);
          setStep("intake");
        } else {
          setStep("intake");
        }
      })
      .catch(() => {
        if (!cancelled) setStep("intake");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleIntakeComplete(result: DiagnosticResult) {
    setDiagnostic(result);
    if (!result.cleared_for_exercise) return;

    if (activeProfile) {
      buildPlanFromDiagnostic(result, activeProfile.session_count + 1);
    } else {
      const me = await getCurrentUser().catch(() => null);
      const patientName = me?.username ? titleCase(me.username) : "Patient";
      const created = await createPatient(patientName, result);
      setActivePatientId(created.id);
      setActiveProfile(created);
      buildPlanFromDiagnostic(result, 1);
    }
    setStep("pre_pain");
  }

  function handlePrePain(value: number) {
    setPainPre(value);
    sessionStartRef.current = Date.now();
    repQualitiesRef.current = [[]];
    peakAnglesRef.current = [];
    repsPerSetRef.current = [];
    setShowPlanIntro(true);
    setStep("exercising");
  }

  function completeRep() {
    if (!currentExercise) return;

    const newRep = currentRep + 1;
    setCurrentRep(newRep);

    const targetAngle = Object.values(currentExercise.target_angles)[0];
    const tolerance = Object.values(currentExercise.tolerances)[0] || 10;
    const deficit = Math.abs(peakAngleRef.current - targetAngle);
    const quality: RepQuality = deficit <= tolerance ? "green" : deficit <= tolerance * 2 ? "yellow" : "red";
    setLastRepQuality(quality);

    // Track for persistence
    const exerciseQualities = repQualitiesRef.current[currentExerciseIndex] ?? [];
    exerciseQualities.push(quality);
    repQualitiesRef.current[currentExerciseIndex] = exerciseQualities;

    if (!peakAnglesRef.current[currentExerciseIndex]) {
      peakAnglesRef.current[currentExerciseIndex] = {};
    }
    const key = Object.keys(currentExercise.target_angles)[0];
    if (key) {
      const prev = peakAnglesRef.current[currentExerciseIndex][key] ?? 0;
      peakAnglesRef.current[currentExerciseIndex][key] = Math.max(prev, peakAngleRef.current);
    }

    // Reset
    peakAngleRef.current = 0;
    repPhaseRef.current = "idle";

    if (newRep >= currentExercise.reps) {
      repsPerSetRef.current.push(newRep);
      if (currentSet >= currentExercise.sets) {
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= (plan?.exercises.length ?? 0)) {
          setStep("post_pain");
        } else {
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

      const side = diagnostic?.side === "right" ? "right" : "left";
      const primaryJoint = currentExercise.target_angles
        ? Object.keys(currentExercise.target_angles)[0] || "shoulder_flexion_degrees"
        : "shoulder_flexion_degrees";
      const angleKey = mapExerciseAngleKey(primaryJoint, side);
      const angle = angles[angleKey] || 0;
      setCurrentAngle(angle);

      const targetAngle = Object.values(currentExercise.target_angles)[0];
      const startThreshold = Math.max(targetAngle * 0.25, 15);
      const resetThreshold = Math.max(targetAngle * 0.15, 10);
      const peakThreshold = targetAngle * 0.5;
      const minRepDuration = 800;

      const phase = repPhaseRef.current;

      if (phase === "idle") {
        if (angle > startThreshold) {
          repPhaseRef.current = "ascending";
          repStartTimeRef.current = performance.now();
          peakAngleRef.current = angle;
          setMovementPhase("lifting");
        } else {
          setMovementPhase("ready");
        }
      } else if (phase === "ascending") {
        if (angle > peakAngleRef.current) peakAngleRef.current = angle;
        if (angle < peakAngleRef.current - 12) {
          repPhaseRef.current = "descending";
          setMovementPhase("lowering");
        } else if (angle >= targetAngle * 0.85) {
          setMovementPhase("holding");
        }
      } else if (phase === "descending") {
        if (angle <= resetThreshold) {
          const elapsed = performance.now() - repStartTimeRef.current;
          if (peakAngleRef.current >= peakThreshold && elapsed >= minRepDuration) {
            completeRep();
          }
          repPhaseRef.current = "idle";
          peakAngleRef.current = 0;
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

  async function handlePostPain(value: number) {
    setPainPost(value);
    const savedId = await persistSession(value);
    // Route straight into the report. The report page renders a
    // "Generating session report..." loader while /api/report is running,
    // so the user never sees an intermediate summary stub. If persistence
    // failed (savedId null), fall back to the summary step so the workout
    // data isn't silently lost.
    if (savedId) {
      router.push(`/report/${savedId}?from=session`);
    } else {
      setStep("summary");
    }
  }

  async function persistSession(postPain: number): Promise<string | null> {
    if (!plan || !activeProfile || painPre === null) return null;

    const startedAt = new Date(sessionStartRef.current).toISOString();
    const endedAt = new Date().toISOString();
    const exercisesCompleted = currentExerciseIndex + 1;

    const exerciseRows: ExerciseResult[] = [];
    plan.exercises.slice(0, exercisesCompleted).forEach((ex, i) => {
      const qualities = repQualitiesRef.current[i] ?? [];
      const greenCount = qualities.filter((q) => q === "green").length;
      const formQuality = qualities.length > 0 ? greenCount / qualities.length : 0;
      const setsCompleted = i < currentExerciseIndex ? ex.sets : currentSet;

      for (let setNum = 1; setNum <= setsCompleted; setNum++) {
        exerciseRows.push({
          exercise_id: ex.id,
          exercise_name: ex.name,
          set_number: setNum,
          reps: ex.reps,
          form_score: formQuality,
        });
      }
    });

    try {
      const saved = await saveSession({
        patient_id: activeProfile.id,
        plan_id: null,
        started_at: startedAt,
        ended_at: endedAt,
        pain_pre: painPre,
        pain_post: postPain,
        exercises: exerciseRows,
        summary: null,
      });
      setSavedSessionId(saved.id);

      const fresh = await listSessions(activeProfile.id);
      setActiveProfile({ ...activeProfile, session_count: fresh.length });
      return saved.id;
    } catch {
      // Persistence failure is non-fatal for the in-memory summary view.
      return null;
    }
  }

  const MID_SESSION_STEPS: SessionStep[] = ["exercising", "rest", "post_pain"];

  function performExit() {
    setShowExitConfirm(false);
    // Hard navigation — MediaPipe's WASM loop can stall router.push and
    // the webcam media stream doesn't always release cleanly on soft nav.
    window.location.href = "/";
  }

  function handleExitClick() {
    if (MID_SESSION_STEPS.includes(step)) {
      setShowExitConfirm(true);
    } else {
      performExit();
    }
  }

  async function skipToEnd() {
    let profile = activeProfile;
    if (!profile) {
      const me = await getCurrentUser().catch(() => null);
      const name = me?.username ? titleCase(me.username) : "Test Patient";
      profile = await createPatient(name, {
        body_region: "shoulder",
        side: "right",
        onset: "2 weeks ago",
        mechanism: "overuse",
        severity_score: 30,
        instrument_used: "NPRS",
        functional_deficits: ["overhead reaching"],
        contraindications: [],
        red_flags: [],
        cleared_for_exercise: true,
      });
      setActivePatientId(profile.id);
      setActiveProfile(profile);
    }

    const fakeExercises: ExercisePlanItem[] = [
      {
        id: "scap_retraction",
        name: "Scapular Retraction",
        target_muscles: ["middle trapezius", "rhomboids"],
        target_angles: { shoulder_flexion_degrees: 90 },
        tolerances: { shoulder_flexion_degrees: 10 },
        tempo_seconds: "2-0-2-0",
        sets: 2,
        reps: 10,
        rest_seconds: 60,
        cues: ["Pinch shoulder blades"],
        compensation_patterns: [{ name: "shrugging", detection: "upper traps elevate", landmarks: [], severity: "yellow" }],
        regression: "",
        progression: "",
      },
      {
        id: "wall_slide",
        name: "Wall Slide",
        target_muscles: ["serratus anterior", "lower trapezius"],
        target_angles: { shoulder_flexion_degrees: 160 },
        tolerances: { shoulder_flexion_degrees: 15 },
        tempo_seconds: "2-0-2-0",
        sets: 2,
        reps: 8,
        rest_seconds: 60,
        cues: ["Keep forearms on wall"],
        compensation_patterns: [{ name: "arching low back", detection: "lumbar extension", landmarks: [], severity: "yellow" }],
        regression: "",
        progression: "",
      },
    ];

    const startedAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const endedAt = new Date().toISOString();

    const exerciseRows: ExerciseResult[] = [
      { exercise_id: "scap_retraction", exercise_name: "Scapular Retraction", set_number: 1, reps: 10, form_score: 0.92 },
      { exercise_id: "scap_retraction", exercise_name: "Scapular Retraction", set_number: 2, reps: 10, form_score: 0.88 },
      { exercise_id: "wall_slide", exercise_name: "Wall Slide", set_number: 1, reps: 8, form_score: 0.76 },
      { exercise_id: "wall_slide", exercise_name: "Wall Slide", set_number: 2, reps: 8, form_score: 0.81 },
    ];

    try {
      const saved = await saveSession({
        patient_id: profile.id,
        plan_id: null,
        started_at: startedAt,
        ended_at: endedAt,
        pain_pre: 5,
        pain_post: 3,
        exercises: exerciseRows,
        summary: null,
      });
      setSavedSessionId(saved.id);
      const fresh = await listSessions(profile.id).catch(() => []);
      setActiveProfile({ ...profile, session_count: fresh.length });
    } catch {
      // Still show summary even if persistence fails
    }

    setPlan({ session_number: 1, estimated_duration_minutes: 20, exercises: fakeExercises });
    setCurrentExerciseIndex(fakeExercises.length - 1);
    setPainPre(5);
    setPainPost(3);
    setStep("summary");
  }

  return (
    <main className="flex-1 flex flex-col p-4 gap-4" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={handleExitClick}
          className="flex items-center gap-2 text-sm font-medium transition-colors duration-200 hover:opacity-80"
          style={{ color: "var(--color-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Exit
        </button>

        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: step === "exercising" ? "var(--color-success)" : "var(--color-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{STEP_LABELS[step]}</span>
        </div>

        <div className="flex items-center gap-2">
          {step !== "summary" && (
            <button
              onClick={skipToEnd}
              className="text-xs px-2 py-1 rounded font-mono"
              style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)" }}
              title="Dev: skip to end-of-session summary with fake data"
            >
              Skip to End
            </button>
          )}
          {plan && (
            <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{currentExerciseIndex + 1}/{plan.exercises.length}</span>
          )}
        </div>
      </header>

      {/* Loading */}
      {step === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner" />
        </div>
      )}

      {/* Intake */}
      {step === "intake" && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-y-auto pt-2">
          <div className="w-80 shrink-0">
            <ConversationalIntake
              onComplete={handleIntakeComplete}
              onFallbackToText={() => setUseVoiceIntake(false)}
              onLiveUpdate={({ region, responses }) => {
                if (region) setLiveIntakeRegion(region);
                if (responses) setLiveIntakeResponses((prev) => ({ ...responses, ...prev }));
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <IntakeView
              onComplete={handleIntakeComplete}
              liveRegion={liveIntakeRegion}
              liveResponses={liveIntakeResponses}
            />
          </div>
        </div>
      )}

      {/* Pre-pain */}
      {step === "pre_pain" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <PainScale label="How would you rate your pain right now?" onSelect={handlePrePain} />
        </div>
      )}

      {/* Exercise — 2-panel layout */}
      {step === "exercising" && currentExercise && (
        <div className="flex-1 flex gap-4 min-h-0 animate-fade-in relative">
          {/* Webcam (center) */}
          <div
            className="flex-1 min-h-0 transition-all duration-300"
            style={showPlanIntro ? { filter: "blur(12px)", pointerEvents: "none" } : undefined}
          >
            <Suspense fallback={<WebcamLoading />}>
              <WebcamView showAngles onLandmarksDetected={handleLandmarks} />
            </Suspense>
          </div>

          {/* Controls sidebar (right) */}
          <aside
            className="w-80 flex flex-col gap-3 overflow-y-auto transition-all duration-300"
            style={showPlanIntro ? { filter: "blur(12px)", pointerEvents: "none" } : undefined}
          >
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

          {/* Plan intro overlay — shows once when entering exercising step */}
          {showPlanIntro && plan && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20 animate-fade-in"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <div
                className="glass-card-bright p-8 max-w-lg w-full mx-4 max-h-[88vh] overflow-y-auto"
                style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--color-accent-dim)", border: "1px solid var(--color-accent)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Today&apos;s Plan
                  </h2>
                </div>
                <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
                  Vero recommends {plan.exercises.length} exercise{plan.exercises.length === 1 ? "" : "s"} · ~{plan.estimated_duration_minutes} min
                </p>

                <ol className="flex flex-col gap-2.5 mb-6">
                  {plan.exercises.map((ex, i) => (
                    <li
                      key={ex.id}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{
                        background: "var(--color-surface-raised)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold shrink-0 mt-0.5"
                        style={{
                          background: "var(--color-accent-dim)",
                          color: "var(--color-accent)",
                          border: "1px solid var(--color-accent)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                          {ex.name}
                        </div>
                        <div className="text-xs flex items-center gap-3 flex-wrap" style={{ color: "var(--color-text-muted)" }}>
                          <span className="font-mono">{ex.sets} × {ex.reps}</span>
                          {ex.target_muscles.length > 0 && (
                            <span className="truncate">{ex.target_muscles.slice(0, 2).join(", ")}</span>
                          )}
                        </div>
                        {ex.cues.length > 0 && (
                          <p className="text-xs mt-1.5 italic" style={{ color: "var(--color-text-secondary)" }}>
                            “{ex.cues[0]}”
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                <button
                  onClick={() => setShowPlanIntro(false)}
                  className="btn-accent w-full"
                  autoFocus
                >
                  Begin Workout
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rest */}
      {step === "rest" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-12 text-center max-w-md">
            <div className="text-6xl font-light font-mono mb-2" style={{ color: "var(--color-accent)" }}>Rest</div>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>Take a 60-second break before the next set</p>
            {plan && currentExerciseIndex < plan.exercises.length && (
              <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                Next: <span style={{ color: "var(--color-accent)" }}>{plan.exercises[currentExerciseIndex]?.name}</span>
              </p>
            )}
            <button onClick={resumeFromRest} className="btn-accent">Continue Exercise</button>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <h2 className="text-2xl font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>Session Complete</h2>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="text-3xl font-semibold font-mono" style={{ color: "var(--color-accent)" }}>{plan?.exercises.length}</div>
                <div className="data-label mt-1">Exercises</div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="text-3xl font-semibold font-mono" style={{
                  color: painPre !== null && painPost !== null && painPre > painPost ? "var(--color-success)" : "var(--color-text-primary)"
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
                <div><span className="data-label mr-1.5">Before</span><span className="font-mono" style={{ color: "var(--color-text-primary)" }}>{painPre}/10</span></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                <div><span className="data-label mr-1.5">After</span><span className="font-mono" style={{ color: "var(--color-text-primary)" }}>{painPost}/10</span></div>
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/" className="btn-ghost text-sm">Return Home</Link>
              <Link href="/progress" className="btn-ghost text-sm">View Progress</Link>
              {savedSessionId && (
                <Link href={`/report/${savedSessionId}`} className="btn-accent">
                  View Full Report
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VoiceCoach — persisted across exercising/rest to prevent session remount */}
      {currentExercise && (step === "exercising" || step === "rest") && (
        <div
          className="fixed bottom-4 right-4 w-72 z-40"
          style={{ display: step === "exercising" ? "block" : "none" }}
        >
          <VoiceCoach
            currentRep={currentRep}
            totalReps={currentExercise.reps}
            currentSet={currentSet}
            totalSets={currentExercise.sets}
            lastRepQuality={lastRepQuality}
            movementPhase={movementPhase}
            exerciseName={currentExercise.name}
            currentAngle={currentAngle}
            targetAngle={Object.values(currentExercise.target_angles)[0]}
            isPaused={step === "rest"}
          />
        </div>
      )}

      {/* Exit confirmation */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
          style={{ background: "rgba(6,10,14,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="glass-card-bright p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
              Exit session?
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
              Your progress in this session won&apos;t be saved.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExitConfirm(false)} className="btn-ghost text-sm">
                Keep Going
              </button>
              <button onClick={performExit} className="btn-accent text-sm">
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
