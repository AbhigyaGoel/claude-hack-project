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

type SessionStep = "loading" | "returning" | "intake" | "diagnosis" | "plan_review" | "pre_pain" | "exercising" | "rest" | "post_pain" | "summary";

const STEP_LABELS: Record<SessionStep, string> = {
  loading: "Loading",
  returning: "Welcome Back",
  intake: "Diagnostic Intake",
  diagnosis: "Assessment Results",
  plan_review: "Exercise Plan",
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
  const [currentAngle, setCurrentAngle] = useState(0);
  const [movementPhase, setMovementPhase] = useState<MovementPhase>("ready");

  // Agent state
  const [narratorEntries, setNarratorEntries] = useState<{ id: string; text: string }[]>([]);
  const [safetyHalt, setSafetyHalt] = useState<string | null>(null);
  const [formCriticFaults, setFormCriticFaults] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVisionTimeRef = useRef(0);

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

  // --- Agent calls (non-blocking, fire-and-forget during exercise) ---

  /** Form Critic: analyze rep quality via Claude after each completed rep */
  const callFormCritic = useCallback(async (exercise: ExercisePlanItem, peakAngle: number, repNum: number) => {
    try {
      const res = await fetch("/api/form-critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: { id: exercise.id, name: exercise.name, target_angles: exercise.target_angles, tolerances: exercise.tolerances, compensation_patterns: exercise.compensation_patterns },
          rep_data: { peak_angle: peakAngle, rep_number: repNum },
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.faults?.length > 0) {
        setFormCriticFaults(data.faults.map((f: { description?: string; type?: string }) => f.description || f.type || ""));
      } else {
        setFormCriticFaults([]);
      }
    } catch { /* non-blocking */ }
  }, []);

  /** Safety Monitor: check for red flags via Haiku — runs on vision frames */
  const callSafetyMonitor = useCallback(async (frameBase64?: string) => {
    try {
      const res = await fetch("/api/safety-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: `session_${sessionStartRef.current}`,
          frame_base64: frameBase64,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.halt) {
        setSafetyHalt(data.red_flag_type || "Red flag detected");
        setStep("summary");
      }
    } catch { /* non-blocking */ }
  }, []);

  /** Clinical Narrator: stream reasoning to side panel after each rep */
  const callNarrator = useCallback(async (exercise: ExercisePlanItem, repNum: number, quality: string, peakAngle: number) => {
    if (!activeProfile) return;
    try {
      const res = await fetch("/api/narrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: `session_${sessionStartRef.current}`,
          patient_id: activeProfile.id,
          current_exercise: exercise.name,
          rep_data: { rep_number: repNum, peak_angle: peakAngle, quality },
        }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const entryId = `nar_${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(line.slice(6));
            if (chunk.content) {
              setNarratorEntries(prev => {
                const existing = prev.find(e => e.id === entryId);
                if (existing) {
                  return prev.map(e => e.id === entryId ? { ...e, text: e.text + chunk.content } : e);
                }
                return [...prev.slice(-4), { id: entryId, text: chunk.content }];
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch { /* non-blocking */ }
  }, [activeProfile]);

  /** Vision sampling: capture frame at 1fps for safety monitor */
  const sendVisionFrame = useCallback(async () => {
    if (!videoRef.current) return;
    const now = Date.now();
    if (now - lastVisionTimeRef.current < 3000) return; // every 3s
    lastVisionTimeRef.current = now;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      const base64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
      callSafetyMonitor(base64);
    } catch { /* non-blocking */ }
  }, [callSafetyMonitor]);

  // Check for existing active patient on mount.
  useEffect(() => {
    let cancelled = false;
    getActivePatient()
      .then((profile) => {
        if (cancelled) return;
        if (profile) {
          setActiveProfile(profile);
          setStep(profile.profile?.diagnostic?.cleared_for_exercise ? "returning" : "intake");
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

  function handleContinueAsReturning() {
    if (!activeProfile?.profile?.diagnostic) return;
    const dx = activeProfile.profile.diagnostic;
    setDiagnostic(dx);
    buildPlanFromDiagnostic(dx, activeProfile.session_count + 1);
    setStep("plan_review");
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
      const me = await getCurrentUser().catch(() => null);
      const patientName = me?.username ? titleCase(me.username) : "Patient";
      const created = await createPatient(patientName, result);
      setActivePatientId(created.id);
      setActiveProfile(created);
      buildPlanFromDiagnostic(result, 1);
    }
    setStep("diagnosis");
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

    // Fire agents (non-blocking)
    const savedPeak = peakAngleRef.current;
    callFormCritic(currentExercise, savedPeak, newRep);
    callNarrator(currentExercise, newRep, quality, savedPeak);

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

      // Run safety monitor on vision frames (every 3s, non-blocking)
      sendVisionFrame();

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

  function skipExercise() {
    if (!plan) return;
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= plan.exercises.length) {
      setStep("post_pain");
    } else {
      repQualitiesRef.current[nextIndex] = [];
      setCurrentExerciseIndex(nextIndex);
      setCurrentSet(1);
      setCurrentRep(0);
      peakAngleRef.current = 0;
      repPhaseRef.current = "idle";
      setMovementPhase("ready");
    }
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

      const fresh = await listSessions(activeProfile.id);
      setActiveProfile({ ...activeProfile, session_count: fresh.length });
    } catch {
      // Persistence failure is non-fatal for the in-memory summary view.
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

      {/* Diagnosis Results */}
      {step === "diagnosis" && diagnostic && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="glass-card-bright p-8 max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
              Assessment Results
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="data-label mb-1">Region</div>
                <div className="text-sm font-medium capitalize" style={{ color: "var(--color-text-primary)" }}>{diagnostic.body_region}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="data-label mb-1">Side</div>
                <div className="text-sm font-medium capitalize" style={{ color: "var(--color-text-primary)" }}>{diagnostic.side}</div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="data-label mb-1">Severity</div>
                <div className="text-sm font-mono font-semibold" style={{ color: diagnostic.severity_score > 60 ? "#ef4444" : diagnostic.severity_score > 30 ? "#eab308" : "var(--color-success)" }}>
                  {diagnostic.severity_score}/100
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                <div className="data-label mb-1">Instrument</div>
                <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{diagnostic.instrument_used}</div>
              </div>
            </div>

            {diagnostic.functional_deficits.length > 0 && (
              <div className="mb-4">
                <div className="data-label mb-2">Functional Deficits</div>
                <div className="flex flex-wrap gap-1.5">
                  {diagnostic.functional_deficits.map((d, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
                      {d.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {diagnostic.red_flags.length > 0 && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "#ef4444" }}>Red Flags Detected</div>
                {diagnostic.red_flags.map((f, i) => (
                  <div key={i} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{f}</div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: diagnostic.cleared_for_exercise ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${diagnostic.cleared_for_exercise ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: diagnostic.cleared_for_exercise ? "var(--color-success)" : "#ef4444" }} />
              <span className="text-sm font-medium" style={{ color: diagnostic.cleared_for_exercise ? "var(--color-success)" : "#ef4444" }}>
                {diagnostic.cleared_for_exercise ? "Cleared for exercise" : "Not cleared — refer to PT"}
              </span>
            </div>

            <button onClick={() => setStep("plan_review")} className="btn-accent w-full">
              View Exercise Plan
            </button>
          </div>
        </div>
      )}

      {/* Plan Review */}
      {step === "plan_review" && plan && (
        <div className="flex-1 flex items-center justify-center animate-fade-in overflow-y-auto py-4">
          <div className="glass-card-bright p-8 max-w-lg w-full">
            <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
              Your Exercise Plan
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              Session {plan.session_number} · ~{plan.estimated_duration_minutes} min · {plan.exercises.length} exercises
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {plan.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0" style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{ex.name}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {ex.sets} sets × {ex.reps} reps · {ex.tempo_seconds} tempo
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setStep("pre_pain")} className="btn-accent w-full">
              Start Session
            </button>
          </div>
        </div>
      )}

      {/* Pre-pain */}
      {step === "pre_pain" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <PainScale label="How would you rate your pain right now?" onSelect={handlePrePain} />
        </div>
      )}

      {/* Exercise — 3-panel layout */}
      {step === "exercising" && currentExercise && (
        <div className="flex-1 flex gap-4 min-h-0 animate-fade-in">
          {/* Clinical Narrator (left) */}
          <aside className="w-64 flex flex-col gap-2 overflow-y-auto glass-card p-3 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-accent)" }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>Clinical Reasoning</span>
            </div>
            {narratorEntries.length === 0 ? (
              <p className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>Clinical reasoning will stream here as you exercise...</p>
            ) : (
              narratorEntries.map((entry) => (
                <div key={entry.id} className="text-xs leading-relaxed p-2 rounded-lg" style={{ background: "var(--color-surface-raised)", color: "var(--color-text-secondary)" }}>
                  {entry.text}
                </div>
              ))
            )}
          </aside>

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
            <button
              onClick={skipExercise}
              className="btn-ghost text-xs w-full"
              style={{ opacity: 0.6 }}
            >
              Skip Exercise →
            </button>
            {/* Form Critic feedback */}
            {formCriticFaults.length > 0 && (
              <div className="glass-card p-3" style={{ borderColor: "#eab308" }}>
                <div className="text-xs font-medium mb-1" style={{ color: "#eab308" }}>Form Analysis</div>
                {formCriticFaults.map((f, i) => (
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
