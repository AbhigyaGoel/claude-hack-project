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
import ProfileSelector from "@/components/ProfileSelector";
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
} from "@/lib/api";

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

type SessionStep = "profile" | "returning" | "intake" | "pre_pain" | "exercising" | "rest" | "post_pain" | "summary" | "halted";

const STEP_LABELS: Record<SessionStep, string> = {
  profile: "Select Profile",
  returning: "Welcome Back",
  intake: "Diagnostic Intake",
  pre_pain: "Pre-Session Rating",
  exercising: "Exercise Session",
  rest: "Rest Period",
  post_pain: "Post-Session Rating",
  summary: "Session Complete",
  halted: "Session Halted",
};

type MovementPhase = "ready" | "lifting" | "holding" | "lowering";

interface NarratorEntry {
  id: string;
  text: string;
  timestamp: number;
}

export default function SessionPage() {
  const router = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [useVoiceIntake, setUseVoiceIntake] = useState(true);
  const [liveIntakeRegion, setLiveIntakeRegion] = useState<import("@/types/exercise").BodyRegion | null>(null);
  const [liveIntakeResponses, setLiveIntakeResponses] = useState<Record<string, string>>({});
  const narratorAbortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<SessionStep>("profile");
  const [activeProfile, setActiveProfile] = useState<PatientRecord | null>(null);
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

  // Clinical Narrator state
  const [narratorEntries, setNarratorEntries] = useState<NarratorEntry[]>([]);
  const [showNarrator, setShowNarrator] = useState(true);

  // Safety Monitor
  const [haltReason, setHaltReason] = useState<string | null>(null);

  // Vision faults
  const [visionFaults, setVisionFaults] = useState<string[]>([]);

  // Tracking refs
  const sessionStartRef = useRef<number>(0);
  const repQualitiesRef = useRef<RepQuality[][]>([[]]);
  const peakAnglesRef = useRef<Record<string, number>[]>([]);
  const repsPerSetRef = useRef<number[]>([]);

  // Auto rep detection state
  const peakAngleRef = useRef(0);
  const repPhaseRef = useRef<"idle" | "ascending" | "descending">("idle");
  const repStartTimeRef = useRef(0);

  // Vision sampling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVisionTime = useRef(0);

  const currentExercise = plan?.exercises[currentExerciseIndex];

  // Clinical Narrator — streams reasoning after each rep
  const streamNarrator = useCallback(async (repContext: Record<string, unknown>) => {
    if (!activeProfile) return;

    // Abort any prior in-flight narrator stream before starting a new one.
    narratorAbortRef.current?.abort();
    const controller = new AbortController();
    narratorAbortRef.current = controller;

    try {
      const res = await fetch("/api/narrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: `session_${sessionStartRef.current}`,
          patient_id: activeProfile.id,
          ...repContext,
        }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const entryId = `nar_${Date.now()}`;

      while (true) {
        if (controller.signal.aborted) {
          await reader.cancel().catch(() => {});
          return;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setNarratorEntries((prev) => {
                  const existing = prev.find((e) => e.id === entryId);
                  if (existing) {
                    return prev.map((e) =>
                      e.id === entryId ? { ...e, text: e.text + data.text } : e
                    );
                  }
                  return [...prev.slice(-9), { id: entryId, text: data.text, timestamp: Date.now() }];
                });
              }
            } catch {
              // Ignore malformed SSE
            }
          }
        }
      }
    } catch {
      // Narrator failure is non-fatal (includes aborts)
    }
  }, [activeProfile]);

  // Vision sampling — 1fps
  const sendVisionFrame = useCallback(async () => {
    if (!videoRef.current || !currentExercise) return;
    const now = Date.now();
    if (now - lastVisionTime.current < 1000) return;
    lastVisionTime.current = now;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 384;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, 512, 384);
      const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

      // Run form-critic and safety-monitor in parallel
      const [formRes, safetyRes] = await Promise.all([
        fetch("/api/form-critic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exercise: currentExercise,
            frame_base64: base64,
            rep_data: { peak_angle: peakAngleRef.current },
          }),
        }).catch(() => null),
        fetch("/api/safety-monitor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: `session_${sessionStartRef.current}`,
            frame_base64: base64,
          }),
        }).catch(() => null),
      ]);

      if (formRes) {
        const formData = await formRes.json();
        if (formData.faults?.length > 0) {
          setVisionFaults(formData.faults.map((f: { description?: string; type?: string }) => f.description || f.type || ""));
        }
      }

      if (safetyRes) {
        const safetyData = await safetyRes.json();
        if (safetyData.halt) {
          setHaltReason(safetyData.red_flag_type || "Red flag detected");
          setStep("halted");
        }
      }
    } catch {
      // Vision is best-effort
    }
  }, [currentExercise]);

  // Check for existing active patient on mount
  useEffect(() => {
    getActivePatient()
      .then((profile) => {
        if (profile && profile.profile?.diagnostic?.cleared_for_exercise) {
          setActiveProfile(profile);
          setStep("returning");
        }
      })
      .catch(() => {
        // No active profile — selector UI stays visible
      });
  }, []);

  function handleProfileSelect(profile: PatientRecord) {
    setActiveProfile(profile);
    if (profile.profile?.diagnostic?.cleared_for_exercise) {
      setStep("returning");
    } else {
      setStep("intake");
    }
  }

  function handleContinueAsReturning() {
    if (!activeProfile?.profile?.diagnostic) return;
    const dx = activeProfile.profile.diagnostic;
    setDiagnostic(dx);
    buildPlanFromDiagnostic(dx, activeProfile.session_count + 1);
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

  async function handleIntakeComplete(result: DiagnosticResult) {
    setDiagnostic(result);
    if (!result.cleared_for_exercise) return;

    if (activeProfile) {
      buildPlanFromDiagnostic(result, activeProfile.session_count + 1);
    } else {
      const created = await createPatient("Patient", result);
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
    setNarratorEntries([]);
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

    // Stream narrator reasoning (non-blocking)
    streamNarrator({
      current_exercise: currentExercise.name,
      rep_number: newRep,
      set_number: currentSet,
      peak_angle: peakAngleRef.current,
      target_angle: targetAngle,
      quality,
    });

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

      sendVisionFrame();

      // Map exercise's primary joint angle to the correct calculated angle
      const side = diagnostic?.side === "right" ? "right" : "left";
      const primaryJoint = currentExercise.target_angles
        ? Object.keys(currentExercise.target_angles)[0] || "shoulder_flexion_degrees"
        : "shoulder_flexion_degrees";
      const angleKey = mapExerciseAngleKey(primaryJoint, side);
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
        if (angle > peakAngleRef.current) peakAngleRef.current = angle;
        if (angle < peakAngleRef.current - 8) {
          repPhaseRef.current = "descending";
          setMovementPhase("lowering");
        } else if (angle >= targetAngle * 0.9) {
          setMovementPhase("holding");
        }
      } else if (phase === "descending") {
        if (angle <= threshold) {
          if (peakAngleRef.current >= peakThreshold) completeRep();
          repPhaseRef.current = "idle";
          setMovementPhase("ready");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentExercise, diagnostic, currentRep, currentSet, currentExerciseIndex, plan, sendVisionFrame],
  );

  function resumeFromRest() {
    peakAngleRef.current = 0;
    repPhaseRef.current = "idle";
    setMovementPhase("ready");
    setStep("exercising");
  }

  async function handlePostPain(value: number) {
    setPainPost(value);
    await persistSession(value);
    setStep("summary");
  }

  async function persistSession(postPain: number) {
    if (!plan || !activeProfile || painPre === null) return;

    const startedAt = new Date(sessionStartRef.current).toISOString();
    const endedAt = new Date().toISOString();
    const exercisesCompleted = currentExerciseIndex + 1;

    // Flatten per-exercise results into set-level rows.
    const exerciseRows: ExerciseResult[] = [];
    plan.exercises.slice(0, exercisesCompleted).forEach((ex, i) => {
      const qualities = repQualitiesRef.current[i] ?? [];
      const greenCount = qualities.filter((q) => q === "green").length;
      const formQuality = qualities.length > 0 ? greenCount / qualities.length : 0;
      const setsCompleted = i < currentExerciseIndex ? ex.sets : currentSet;

      // Preserve the old "one row per set" structure for the DB.
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
      await saveSession({
        patient_id: activeProfile.id,
        plan_id: null,
        started_at: startedAt,
        ended_at: endedAt,
        pain_pre: painPre,
        pain_post: postPain,
        exercises: exerciseRows,
        summary: null,
      });

      // Refresh the cached session_count so Home/Progress pick up the new run.
      const fresh = await listSessions(activeProfile.id);
      setActiveProfile({ ...activeProfile, session_count: fresh.length });
    } catch {
      // Persistence failure is non-fatal for the in-memory summary view.
    }
  }

  // Steps where exiting loses unsaved work — we ask for confirmation.
  const MID_SESSION_STEPS: SessionStep[] = ["exercising", "rest", "post_pain"];

  function performExit() {
    narratorAbortRef.current?.abort();
    narratorAbortRef.current = null;
    setShowExitConfirm(false);
    // Hard navigation — MediaPipe's WASM loop can stall router.push and
    // the webcam media stream doesn't always release cleanly on soft nav.
    // A full reload tears everything down in one shot.
    window.location.href = "/";
  }

  function handleExitClick() {
    if (MID_SESSION_STEPS.includes(step)) {
      setShowExitConfirm(true);
    } else {
      performExit();
    }
  }

  // On unmount, make sure the narrator SSE stream is released.
  useEffect(() => {
    return () => {
      narratorAbortRef.current?.abort();
      narratorAbortRef.current = null;
    };
  }, []);

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
          <div className="w-2 h-2 rounded-full" style={{ background: step === "exercising" ? "var(--color-success)" : step === "halted" ? "#ef4444" : "var(--color-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{STEP_LABELS[step]}</span>
        </div>

        <div className="flex items-center gap-2">
          {step === "exercising" && (
            <button
              onClick={() => setShowNarrator(!showNarrator)}
              className="text-xs px-2 py-1 rounded"
              style={{ background: showNarrator ? "var(--color-accent-dim)" : "var(--color-surface-raised)", color: showNarrator ? "var(--color-accent)" : "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
            >
              Narrator
            </button>
          )}
          {plan && (
            <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>{currentExerciseIndex + 1}/{plan.exercises.length}</span>
          )}
        </div>
      </header>

      {/* Profile Selection */}
      {step === "profile" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <ProfileSelector onSelect={handleProfileSelect} onCreateNew={handleNewIntake} />
        </div>
      )}

      {/* Returning User */}
      {step === "returning" && activeProfile && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-8 max-w-md text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>Welcome back, {activeProfile.name}</h2>
            <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
              {activeProfile.profile?.diagnostic?.body_region ?? "general"} program
            </p>
            <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>{activeProfile.session_count} session{activeProfile.session_count !== 1 ? "s" : ""} completed</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleContinueAsReturning} className="btn-accent">Continue Program</button>
              <button onClick={handleNewIntake} className="btn-ghost text-sm">New Assessment</button>
            </div>
          </div>
        </div>
      )}

      {/* Intake */}
      {step === "intake" && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-y-auto pt-2">
          {/* Voice panel — left */}
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

          {/* Survey panel — right */}
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

      {/* Exercise — main 3-panel layout */}
      {step === "exercising" && currentExercise && (
        <div className="flex-1 flex gap-4 min-h-0 animate-fade-in">
          {/* Clinical Narrator panel (left) */}
          {showNarrator && (
            <aside className="w-72 flex flex-col gap-2 overflow-y-auto glass-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-accent)" }} />
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>Clinical Reasoning</span>
              </div>
              {narratorEntries.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>Reasoning will stream here as you exercise...</p>
              ) : (
                narratorEntries.map((entry) => (
                  <div key={entry.id} className="text-xs leading-relaxed p-2 rounded-lg" style={{ background: "var(--color-surface-raised)", color: "var(--color-text-secondary)" }}>
                    {entry.text}
                  </div>
                ))
              )}
            </aside>
          )}

          {/* Webcam (center) */}
          <div className="flex-1 min-h-0">
            <Suspense fallback={<WebcamLoading />}>
              <WebcamView showAngles onLandmarksDetected={handleLandmarks} onVideoReady={(v) => { videoRef.current = v; }} />
            </Suspense>
          </div>

          {/* Controls sidebar (right) */}
          <aside className="w-80 flex flex-col gap-3 overflow-y-auto">
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
                <div className="text-xs font-medium mb-1" style={{ color: "#eab308" }}>Vision Detection</div>
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

      {/* Session Halted — Red Flag */}
      {step === "halted" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-8 max-w-lg w-full text-center" style={{ borderColor: "#ef4444" }}>
            <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3" style={{ color: "#ef4444" }}>Session Halted</h2>
            <p className="text-sm mb-2" style={{ color: "var(--color-text-primary)" }}>
              Safety Monitor detected: <strong>{haltReason}</strong>
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
              This session has been stopped for your safety. Please consult with a licensed physical therapist or healthcare provider before continuing.
            </p>
            <Link href="/" className="btn-accent">Return Home</Link>
          </div>
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

            {/* Narrator summary */}
            {narratorEntries.length > 0 && (
              <div className="glass-card p-4 mb-6 text-left">
                <div className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>Clinical Notes</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {narratorEntries.slice(-3).map((e) => e.text).join(" ")}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link href="/progress" className="btn-ghost text-sm">View Progress</Link>
              <Link href="/" className="btn-accent">Return Home</Link>
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
            visionFaults={visionFaults}
            isPaused={step === "rest"}
          />
        </div>
      )}

      {/* Exit confirmation — only shown mid-session */}
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
