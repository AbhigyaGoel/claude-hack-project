"use client";

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import IntakeView from "@/components/IntakeView";
import ConversationalIntake from "@/components/ConversationalIntake";
import RepCounter from "@/components/RepCounter";
import PainScale from "@/components/PainScale";
import ExerciseGuide from "@/components/ExerciseGuide";
import type { DiagnosticResult } from "@/types/patient";
import type { ExercisePlan, ExercisePlanItem } from "@/types/exercise";
import type { RepQuality } from "@/types/assessment";
import type { Landmark } from "@/types/landmark";
import type { PatientRecord, ExerciseResult } from "@/types/storage";
import { queryExercises } from "@/lib/exercises";
import { deriveFocusFromExercises } from "@/lib/focusFromExercises";
import { mapExerciseAngleKey } from "@/lib/angleCalculator";
import {
  getActivePatient,
  setActivePatientId,
  createPatient,
  listSessions,
  saveSession,
  startSession,
  getCurrentUser,
} from "@/lib/api";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// --- Telemetry helpers ---
// All exercise-loop events log through here with a [VERO] prefix so you can
// filter the DevTools console while doing a workout. Each log line maps to a
// specific Supabase table write (or a write that's expected but not wired yet).
//
// Tables written during the exercise loop:
//   ✓ narrator_log      (observer / reasoner / coach rows — three agents)
//   ✓ sessions, sets    (via /api/sessions POST at workout end)
//   ~ rep_analyses      (written inside /api/sessions if faults provided)
//   ✗ form_events       (no endpoint; route dir empty)
//   ✗ red_flags         (no endpoint; route dir empty)
function logVero(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[VERO] ${msg}`, data);
  } else {
    console.log(`[VERO] ${msg}`);
  }
}

function logVeroOk(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`%c[VERO ✓] ${msg}`, "color: #22c55e", data);
  } else {
    console.log(`%c[VERO ✓] ${msg}`, "color: #22c55e");
  }
}

function logVeroWarn(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.warn(`[VERO ⚠] ${msg}`, data);
  } else {
    console.warn(`[VERO ⚠] ${msg}`);
  }
}

/**
 * Grab a JPEG frame from the live video. Returns base64 (no data: prefix)
 * or null if the video isn't ready yet. Downscaled so the upload is small
 * enough for a fire-and-forget request to Claude Vision.
 */
function captureFrame(
  video: HTMLVideoElement | null,
  maxWidth = 640,
  quality = 0.7,
): string | null {
  if (!video || !video.videoWidth || !video.videoHeight) return null;
  const aspect = video.videoWidth / video.videoHeight;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(maxWidth, video.videoWidth);
  canvas.height = Math.round(canvas.width / aspect);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? null;
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

type SessionStep = "loading" | "intake" | "diagnosis" | "plan_review" | "pre_pain" | "exercising" | "rest" | "post_pain" | "summary";

const STEP_LABELS: Record<SessionStep, string> = {
  loading: "Loading",
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
  const searchParams = useSearchParams();
  // `?focus=knee` lets the home page send the patient into a region-
  // specific plan (overriding the primary diagnostic's body_region).
  // `?new=1` forces the intake flow even if a cleared profile exists —
  // used for "New pain point".
  const focusParam = searchParams?.get("focus") ?? null;
  const forceIntake = searchParams?.get("new") === "1";
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [useVoiceIntake, setUseVoiceIntake] = useState(true);
  const [liveIntakeRegion, setLiveIntakeRegion] = useState<import("@/types/exercise").BodyRegion | null>(null);
  const [liveIntakeResponses, setLiveIntakeResponses] = useState<Record<string, string>>({});
  const [step, setStep] = useState<SessionStep>("loading");
  const [activeProfile, setActiveProfile] = useState<PatientRecord | null>(null);
  const [commentaryEntries, setCommentaryEntries] = useState<
    Array<{ id: string; text: string; source: "observer" | "reasoner" | "coach" }>
  >([]);
  const [coachOutput, setCoachOutput] = useState<{
    message: string;
    next_steps: string[];
    resources: { title: string; description: string }[];
    referral_advice?: {
      doctor_type: string;
      urgency: "routine" | "soon" | "urgent";
      what_to_tell_them: string[];
      questions_to_ask: string[];
    } | null;
  } | null>(null);
  const [reasonerStream, setReasonerStream] = useState("");
  const [isReasonerStreaming, setIsReasonerStreaming] = useState(false);
  const [lastSetFormScore, setLastSetFormScore] = useState<number | null>(null);
  const [lastSetName, setLastSetName] = useState<string>("");
  const [lastSetNumber, setLastSetNumber] = useState<number>(1);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [plan, setPlan] = useState<ExercisePlan | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [lastRepQuality, setLastRepQuality] = useState<RepQuality | undefined>();
  const [painPre, setPainPre] = useState<number | null>(null);
  const [painPost, setPainPost] = useState<number | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [movementPhase, setMovementPhase] = useState<MovementPhase>("ready");

  // Agent state
  const [narratorEntries, setNarratorEntries] = useState<{ id: string; text: string }[]>([]);
  const [formCriticFaults, setFormCriticFaults] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Tracking refs
  const sessionStartRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const repQualitiesRef = useRef<RepQuality[][]>([[]]);
  const peakAnglesRef = useRef<Record<string, number>[]>([]);
  const repsPerSetRef = useRef<number[]>([]);
  // Observer notes for the set currently in progress. Reset at set start,
  // passed to the Reasoner at set end.
  const currentSetObserverNotesRef = useRef<string[]>([]);
  // Form Critic results for the set currently in progress. Reset at set start,
  // passed to the Reasoner at set end alongside observer notes.
  const currentSetFormCriticRef = useRef<import("@/agents/formCritic").RepAnalysis[]>([]);

  // --- Observer TTS playback ---
  // The Form Observer's commentary is spoken aloud via /api/tts. Behaviour:
  //   - If nothing is playing: play immediately.
  //   - If something is playing: queue at most ONE next clip; a newer one
  //     replaces the queued one so the voice always says the most recent
  //     observation rather than a stale one.
  const currentObserverAudioRef = useRef<HTMLAudioElement | null>(null);
  const queuedObserverUrlRef = useRef<string | null>(null);

  function playObserverAudioUrl(url: string) {
    const audio = new Audio(url);
    currentObserverAudioRef.current = audio;
    audio.play().catch(() => {
      // Autoplay blocked or audio element detached — just clean up.
      URL.revokeObjectURL(url);
    });
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentObserverAudioRef.current === audio) {
        currentObserverAudioRef.current = null;
      }
      // If something is queued, play it next.
      const next = queuedObserverUrlRef.current;
      if (next) {
        queuedObserverUrlRef.current = null;
        playObserverAudioUrl(next);
      }
    };
  }

  async function speakObserverCommentary(text: string) {
    if (!text?.trim()) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          stability: 0.6,
          similarityBoost: 0.8,
          // Bump speed so one-line cues land fast without running into the
          // next rep. Range 0.7–1.2 per ElevenLabs docs.
          speed: 1.2,
        }),
      });
      if (!res.ok) {
        logVeroWarn(`tts HTTP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const current = currentObserverAudioRef.current;
      const isPlaying = current && !current.paused && !current.ended;
      if (isPlaying) {
        // Replace any existing queued clip — stale observations get dropped.
        if (queuedObserverUrlRef.current) {
          URL.revokeObjectURL(queuedObserverUrlRef.current);
        }
        queuedObserverUrlRef.current = url;
      } else {
        playObserverAudioUrl(url);
      }
    } catch (err) {
      logVeroWarn("tts fetch threw", err);
    }
  }

  // Stop + release any audio resources on unmount.
  useEffect(() => {
    return () => {
      currentObserverAudioRef.current?.pause();
      if (queuedObserverUrlRef.current) URL.revokeObjectURL(queuedObserverUrlRef.current);
      queuedObserverUrlRef.current = null;
      currentObserverAudioRef.current = null;
    };
  }, []);

  // Auto-scroll the PT Notes panel to the newest entry.
  const ptNotesScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ptNotesScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [commentaryEntries.length]);

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
      if (!res.ok) {
        logVeroWarn(`form-critic returned ${res.status} — endpoint not wired (rep_analyses will stay empty)`);
        return;
      }
      const data = await res.json();
      // Accumulate full RepAnalysis for the clinical reasoner at set end
      currentSetFormCriticRef.current.push(data);
      if (data.faults?.length > 0) {
        logVeroOk(`form-critic: ${data.faults.length} fault(s) detected`, data.faults);
        setFormCriticFaults(data.faults.map((f: { description?: string; type?: string }) => f.description || f.type || ""));
      } else {
        setFormCriticFaults([]);
      }
    } catch (err) {
      logVeroWarn("form-critic fetch threw", err);
    }
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
      if (!res.ok) {
        logVeroWarn(`narrator returned ${res.status} — streaming endpoint not wired (narrator_log not written via this path)`);
        return;
      }
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


  // Check for existing active patient on mount. A cleared returning patient
  // skips the "welcome back" confirmation and goes straight into the session
  // — the demo flow has a single seeded patient, so the picker adds friction
  // without offering real choice.
  useEffect(() => {
    let cancelled = false;
    getActivePatient()
      .then((profile) => {
        if (cancelled) return;

        // Explicit ?new=1 always routes to a fresh intake, regardless of
        // the saved profile's cleared state — that's how the home page
        // starts a new pain point.
        if (forceIntake) {
          if (profile) setActiveProfile(profile);
          setStep("intake");
          return;
        }

        if (profile?.profile?.diagnostic?.cleared_for_exercise) {
          setActiveProfile(profile);
          // ?focus=<region> overrides the primary diagnostic's body region
          // so the generated plan targets what the user picked on the
          // home screen (knee / shoulder / lumbar).
          const baseDx = profile.profile.diagnostic;
          const dx: DiagnosticResult = focusParam
            ? { ...baseDx, body_region: focusParam as DiagnosticResult["body_region"] }
            : baseDx;
          setDiagnostic(dx);
          buildPlanFromDiagnostic(dx, profile.session_count + 1);
          // Land on the editable plan review even for returning sessions —
          // same screen the fresh intake flow reaches, so the patient can
          // always tweak sets/reps/order (or remove) before each workout.
          setStep("plan_review");
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
  }, [focusParam, forceIntake]);

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

  async function handlePrePain(value: number) {
    setPainPre(value);
    sessionStartRef.current = Date.now();
    sessionIdRef.current = null;
    repQualitiesRef.current = [[]];
    peakAnglesRef.current = [];
    repsPerSetRef.current = [];
    currentSetObserverNotesRef.current = [];
    currentSetFormCriticRef.current = [];
    setCommentaryEntries([]);
    setCoachOutput(null);

    logVero(
      `▶ Session starting — patient=${activeProfile?.id ?? "?"} exercise=${currentExercise?.name ?? "?"} pain_pre=${value}`,
    );

    // Create the sessions row NOW so every per-rep write can reference a
    // real session_id instead of null. Tag the focus up-front from the
    // plan so an early-exit row still carries a region label.
    if (activeProfile) {
      const plannedFocus = plan
        ? deriveFocusFromExercises(plan.exercises.map((e) => e.id))
        : null;
      try {
        const started = await startSession({
          patient_id: activeProfile.id,
          plan_id: null,
          pain_pre: value,
          focus: plannedFocus,
        });
        sessionIdRef.current = started.id;
        logVeroOk(`✅ Created sessions row (id=${started.id}) — rep commentary will carry this session_id`);
      } catch (err) {
        logVeroWarn("startSession failed — rep commentary will log with session_id=null", err);
      }
    }

    logVero(
      "3-agent pipeline: per-rep Form Observer (Haiku) → per-set Clinical Reasoner (Sonnet) → end-of-session Progression Coach (Opus). All write to narrator_log tagged by source.",
    );
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

    // Fire agents (non-blocking).
    const savedPeak = peakAngleRef.current;
    logVero(
      `Rep ${newRep} complete · ${currentExercise.name} · peak=${savedPeak.toFixed(1)}° target=${Math.round(targetAngle)}° · quality=${quality}`,
    );
    callFormCritic(currentExercise, savedPeak, newRep);
    callNarrator(currentExercise, newRep, quality, savedPeak);

    // Agent 1 — Form Observer (per-rep, Sonnet Vision). Objective
    // observation grounded in an actual webcam frame; falls back to
    // text-only Haiku server-side if no frame is available.
    if (activeProfile) {
      const fetchId = `obs_${Date.now()}`;
      const t0 = performance.now();
      const frame = captureFrame(videoRef.current);
      logVero(
        `🧠 Observer: analyzing rep ${newRep} ${frame ? "(with vision frame)" : "(no frame — text-only fallback)"}...`,
      );
      fetch("/api/form-observer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: activeProfile.id,
          session_id: sessionIdRef.current,
          exercise_name: currentExercise.name,
          rep_number: newRep,
          set_number: currentSet,
          peak_angle: savedPeak,
          target_angle: targetAngle,
          quality,
          t_ms: Date.now() - sessionStartRef.current,
          frame_base64: frame ?? undefined,
        }),
      })
        .then(async (r) => {
          const ms = Math.round(performance.now() - t0);
          if (!r.ok) {
            logVeroWarn(`form-observer ${r.status} after ${ms}ms — narrator_log NOT written`);
            return null;
          }
          const data = await r.json();
          if (data?.commentary) {
            const modeLabel = data.used_vision ? "vision" : "text";
            logVeroOk(
              `👁 Observer [${modeLabel}, rep ${newRep}, ${ms}ms]: "${data.commentary}"`,
            );
            currentSetObserverNotesRef.current.push(data.commentary);
            // Speak the observation out loud — this is the only voice in the
            // session now that VoiceCoach has been retired.
            speakObserverCommentary(data.commentary);
          } else {
            logVeroWarn(`form-observer returned empty commentary (${ms}ms)`);
          }
          return data;
        })
        .then((data) => {
          if (data?.commentary) {
            setCommentaryEntries((prev) => [
              ...prev.slice(-8),
              { id: fetchId, text: data.commentary, source: "observer" },
            ]);
          }
        })
        .catch((err) => {
          logVeroWarn("form-observer fetch threw", err);
        });
    }

    // Reset
    peakAngleRef.current = 0;
    repPhaseRef.current = "idle";

    if (newRep >= currentExercise.reps) {
      repsPerSetRef.current.push(newRep);

      // Agent 2 — Clinical Reasoner. Fires once per set with that set's
      // observer notes. Snapshot the array now (observer fetches finishing
      // after this point won't be included, and that's fine).
      if (activeProfile) {
        const observerNotes = [...currentSetObserverNotesRef.current];
        currentSetObserverNotesRef.current = [];
        const formCriticResults = [...currentSetFormCriticRef.current];
        currentSetFormCriticRef.current = [];
        const completedSetNumber = currentSet;
        const completedExerciseName = currentExercise.name;
        const t0 = performance.now();
        // Capture form score for this set to display alongside the stream
        const setQualities = repQualitiesRef.current[currentExerciseIndex] ?? [];
        const setFormScore = setQualities.length > 0
          ? Math.round((setQualities.filter((q) => q === "green").length / setQualities.length) * 100)
          : null;

        setLastSetFormScore(setFormScore);
        setLastSetName(completedExerciseName);
        setLastSetNumber(completedSetNumber);
        setReasonerStream("");
        setIsReasonerStreaming(true);

        logVero(
          `🧩 Reasoner: analyzing set ${completedSetNumber} (${observerNotes.length} observer notes)...`,
        );

        // Stream the clinical reasoner response
        (async () => {
          try {
            const r = await fetch("/api/clinical-reasoner", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patient_id: activeProfile.id,
                session_id: sessionIdRef.current,
                exercise_name: completedExerciseName,
                set_number: completedSetNumber,
                observer_notes: observerNotes,
                form_critic_results: formCriticResults,
                t_ms: Date.now() - sessionStartRef.current,
              }),
            });
            if (!r.ok || !r.body) {
              logVeroWarn(`clinical-reasoner ${r.status}`);
              setIsReasonerStreaming(false);
              return;
            }
            const reader = r.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const lines = decoder.decode(value).split("\n");
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                  const evt = JSON.parse(line.slice(6));
                  if (evt.type === "text") {
                    fullText += evt.content;
                    setReasonerStream(fullText);
                  } else if (evt.type === "done") {
                    setIsReasonerStreaming(false);
                    if (fullText.trim()) {
                      logVeroOk(`🩺 Reasoner [set ${completedSetNumber}]: "${fullText.trim().slice(0, 80)}..."`);
                      setCommentaryEntries((prev) => [
                        ...prev.slice(-8),
                        { id: `rsn_${Date.now()}`, text: fullText.trim(), source: "reasoner" as const },
                      ]);
                    }
                  }
                } catch {
                  // malformed SSE line, skip
                }
              }
            }
            setIsReasonerStreaming(false);
          } catch (err) {
            logVeroWarn("clinical-reasoner stream threw", err);
            setIsReasonerStreaming(false);
          }
        })();
      }

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

    logVero(
      `🏁 Session ending — persisting 1 session row + ${exerciseRows.length} set row(s) to Supabase...`,
    );

    const focus = deriveFocusFromExercises(exerciseRows.map((r) => r.exercise_id));

    try {
      const result = await saveSession({
        id: sessionIdRef.current ?? undefined,
        patient_id: activeProfile.id,
        plan_id: null,
        started_at: startedAt,
        ended_at: endedAt,
        pain_pre: painPre,
        pain_post: postPain,
        exercises: exerciseRows,
        summary: focus ? { focus } : null,
      });
      setSavedSessionId(result.id);
      logVeroOk(
        `✅ Session ${sessionIdRef.current ? "finalized" : "persisted (created)"} — id=${result.id}`,
      );

      const fresh = await listSessions(activeProfile.id);
      setActiveProfile({ ...activeProfile, session_count: fresh.length });

      // Fire-and-forget: text the patient's PT a session summary.
      fetch("/api/notify-pt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: result.id, patient_id: activeProfile.id }),
      }).catch(() => {});

      // Agent 3 — Progression Coach. Fires once, takes the whole session +
      // prior history, produces a plain-language recap for the patient.
      const coachSessionId = sessionIdRef.current ?? result.id;
      logVero(`🎯 Coach: generating plain-language recap (Haiku, session_id=${coachSessionId})...`);
      const t0 = performance.now();
      // Belt-and-braces: if coach never returns within 20s, abort so the
      // summary screen can show a fallback instead of spinning forever.
      const coachAbort = new AbortController();
      const coachTimeout = setTimeout(() => coachAbort.abort(), 20_000);
      try {
        const coachRes = await fetch("/api/progression-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: coachAbort.signal,
          body: JSON.stringify({
            patient_id: activeProfile.id,
            session_id: coachSessionId,
          }),
        });
        const ms = Math.round(performance.now() - t0);
        const coachData = await coachRes.json().catch(() => null);

        if (!coachRes.ok) {
          logVeroWarn(
            `progression-coach HTTP ${coachRes.status} after ${ms}ms`,
            coachData,
          );
        } else if (coachData?.coach) {
          setCoachOutput(coachData.coach);
          const tag = coachData.fallback ? "fallback" : `${ms}ms`;
          logVeroOk(`💬 Coach [${tag}]: "${coachData.coach.message}"`);
          setCommentaryEntries((prev) => [
            ...prev.slice(-8),
            {
              id: `coach_${Date.now()}`,
              text: coachData.coach.message,
              source: "coach",
            },
          ]);
        } else {
          logVeroWarn(
            `progression-coach returned no coach output (${ms}ms) — check server logs for parse failure`,
            coachData,
          );
          // Never leave the summary screen stuck on a spinner.
          setCoachOutput({
            message: "Nice work today. Rest up and see you next time.",
            next_steps: [],
            resources: [],
          });
        }
      } catch (err) {
        logVeroWarn("progression-coach fetch threw", err);
        setCoachOutput({
          message: "Nice work today. Rest up and see you next time.",
          next_steps: [],
          resources: [],
        });
      } finally {
        clearTimeout(coachTimeout);
      }

      // Coverage summary — what actually made it to Supabase.
      const totalReps = repQualitiesRef.current.flat().length;
      const totalSetsCompleted = repsPerSetRef.current.length;
      console.log(
        "%c[VERO] — Session coverage summary —",
        "color: #38bdc3; font-weight: bold",
      );
      console.table({
        "sessions row": "✓ 1 written",
        "sets rows": `✓ ${exerciseRows.length} written`,
        "narrator_log — observer (rep notes)": `✓ ~${totalReps} written`,
        "narrator_log — reasoner (set notes)": `✓ ~${totalSetsCompleted} written`,
        "narrator_log — coach (session recap)": "✓ 1 written",
        "form_events rows": "✗ 0 — /api/form-critic endpoint not wired",
      });

      return result.id;
    } catch (err) {
      logVeroWarn("session persistence FAILED — sessions/sets NOT written", err);
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
              disableTTS={useVoiceIntake}
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
              Session {plan.session_number} · ~{plan.estimated_duration_minutes} min · {plan.exercises.length} exercises · drag to reorder
            </p>

            <div className="flex flex-col gap-2 mb-6">
              {plan.exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                    if (from === i) return;
                    setPlan((prev) => {
                      if (!prev) return prev;
                      const exs = [...prev.exercises];
                      const [moved] = exs.splice(from, 1);
                      exs.splice(i, 0, moved);
                      return { ...prev, exercises: exs };
                    });
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing"
                  style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                >
                  {/* Drag handle */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" className="shrink-0 opacity-40">
                    <circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/>
                    <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
                    <circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>
                  </svg>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0" style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate mb-1.5" style={{ color: "var(--color-text-primary)" }}>{ex.name}</div>
                    <div className="flex items-center gap-3">
                      {/* Sets stepper */}
                      <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                        <button
                          draggable={false}
                          onClick={(e) => { e.stopPropagation(); setPlan((prev) => { if (!prev) return prev; const exs = prev.exercises.map((x, j) => j === i ? { ...x, sets: Math.max(1, x.sets - 1) } : x); return { ...prev, exercises: exs }; }); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors"
                          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", cursor: "pointer" }}
                        >−</button>
                        <span className="text-xs font-mono w-12 text-center" style={{ color: "var(--color-text-secondary)" }}>{ex.sets} sets</span>
                        <button
                          draggable={false}
                          onClick={(e) => { e.stopPropagation(); setPlan((prev) => { if (!prev) return prev; const exs = prev.exercises.map((x, j) => j === i ? { ...x, sets: Math.min(10, x.sets + 1) } : x); return { ...prev, exercises: exs }; }); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors"
                          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", cursor: "pointer" }}
                        >+</button>
                      </div>
                      <span className="text-xs" style={{ color: "var(--color-border)" }}>×</span>
                      {/* Reps stepper */}
                      <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                        <button
                          draggable={false}
                          onClick={(e) => { e.stopPropagation(); setPlan((prev) => { if (!prev) return prev; const exs = prev.exercises.map((x, j) => j === i ? { ...x, reps: Math.max(1, x.reps - 1) } : x); return { ...prev, exercises: exs }; }); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors"
                          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", cursor: "pointer" }}
                        >−</button>
                        <span className="text-xs font-mono w-12 text-center" style={{ color: "var(--color-text-secondary)" }}>{ex.reps} reps</span>
                        <button
                          draggable={false}
                          onClick={(e) => { e.stopPropagation(); setPlan((prev) => { if (!prev) return prev; const exs = prev.exercises.map((x, j) => j === i ? { ...x, reps: Math.min(50, x.reps + 1) } : x); return { ...prev, exercises: exs }; }); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors"
                          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", cursor: "pointer" }}
                        >+</button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setPlan((prev) => prev ? { ...prev, exercises: prev.exercises.filter((_, j) => j !== i) } : prev)}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 opacity-40 hover:opacity-100"
                    style={{ background: "transparent", border: "1px solid transparent", color: "var(--color-danger)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-danger-dim)"; e.currentTarget.style.borderColor = "var(--color-danger)"; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.opacity = "0.4"; }}
                    title="Remove exercise"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("pre_pain")}
              disabled={plan.exercises.length === 0}
              className="btn-accent w-full"
            >
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
        <div className="flex-1 flex gap-4 min-h-0 animate-fade-in relative">
          {/* Exercise Setlist (left) */}
          <aside className="w-64 flex flex-col gap-2 overflow-y-auto glass-card p-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-accent)" }}>Session Progress</span>
              <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
                {currentExerciseIndex + 1}/{plan?.exercises.length}
              </span>
            </div>

            {/* Overall progress bar */}
            {plan && (
              <div className="mb-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-raised)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentExerciseIndex + (currentRep / (currentExercise?.reps || 1))) / plan.exercises.length) * 100}%`,
                      background: "var(--color-accent)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Exercise list */}
            <div className="flex flex-col gap-1">
              {plan?.exercises.map((ex, i) => {
                const isCurrent = i === currentExerciseIndex;
                const isDone = i < currentExerciseIndex;
                const qualities = repQualitiesRef.current[i] ?? [];
                const greenPct = qualities.length > 0
                  ? Math.round((qualities.filter(q => q === "green").length / qualities.length) * 100)
                  : 0;

                return (
                  <div
                    key={ex.id}
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                    style={{
                      background: isCurrent ? "var(--color-accent-dim)" : isDone ? "var(--color-surface-raised)" : "transparent",
                      border: isCurrent ? "1px solid var(--color-accent)" : "1px solid transparent",
                      opacity: !isCurrent && !isDone ? 0.5 : 1,
                    }}
                  >
                    {/* Status icon */}
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{
                      background: isDone ? "var(--color-success)" : isCurrent ? "var(--color-accent)" : "var(--color-surface-raised)",
                    }}>
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      ) : (
                        <span className="text-[9px] font-mono font-bold" style={{ color: isCurrent ? "white" : "var(--color-text-muted)" }}>{i + 1}</span>
                      )}
                    </div>

                    {/* Exercise info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: isCurrent ? "var(--color-accent)" : isDone ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                        {ex.name}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                        {isCurrent ? (
                          `Set ${currentSet}/${ex.sets} · Rep ${currentRep}/${ex.reps}`
                        ) : isDone ? (
                          `Done · ${greenPct}% form`
                        ) : (
                          `${ex.sets}×${ex.reps}`
                        )}
                      </div>
                    </div>

                    {/* Quality indicator for completed exercises */}
                    {isDone && (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{
                        background: greenPct >= 80 ? "var(--color-success)" : greenPct >= 50 ? "#eab308" : "#ef4444",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
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
            {commentaryEntries.length > 0 && (
              <details className="group" style={{ borderRadius: "0.75rem" }}>
                <summary
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer rounded-xl select-none"
                  style={{
                    background: "var(--color-surface-raised)",
                    border: "1px solid var(--color-border)",
                    listStyle: "none",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-accent)", opacity: 0.7 }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                    PT Notes
                  </span>
                  <span className="text-[10px] ml-auto" style={{ color: "var(--color-text-muted)" }}>
                    {commentaryEntries.length}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="transition-transform group-open:rotate-180" style={{ color: "var(--color-text-muted)" }}>
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div
                  ref={ptNotesScrollRef}
                  className="flex flex-col gap-1.5 overflow-y-auto max-h-48 mt-1 px-1"
                >
                  {commentaryEntries.map((entry) => {
                    const sourceColor =
                      entry.source === "observer" ? "#38bdc3"
                      : entry.source === "reasoner" ? "#8b5cf6"
                      : "#22c55e";
                    return (
                      <div
                        key={entry.id}
                        className="text-[11px] leading-relaxed px-2 py-1.5 rounded-lg"
                        style={{
                          background: "var(--color-surface-raised)",
                          color: "var(--color-text-secondary)",
                          borderLeft: `2px solid ${sourceColor}`,
                        }}
                      >
                        {entry.text}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
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
        <div className="flex-1 flex items-center justify-center animate-fade-in p-4">
          <div className="flex flex-col gap-4 max-w-md w-full">
            <div className="glass-card-bright p-10 text-center">
              <div className="text-6xl font-light font-mono mb-2" style={{ color: "var(--color-accent)" }}>Rest</div>
              <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>Take a 60-second break before the next set</p>
              {plan && currentExerciseIndex < plan.exercises.length && (
                <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
                  Next: <span style={{ color: "var(--color-accent)" }}>{plan.exercises[currentExerciseIndex]?.name}</span>
                </p>
              )}
              <button onClick={resumeFromRest} className="btn-accent">Continue Exercise</button>
            </div>

            {/* Clinical Insight — streams in after set completion */}
            {(reasonerStream || isReasonerStreaming) && (
              <div className="glass-card p-4" style={{ border: "1px solid rgba(139,92,246,0.3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }} />
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#8b5cf6" }}>
                    Clinical Insight
                  </span>
                  {lastSetFormScore !== null && (
                    <span
                      className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: lastSetFormScore >= 80 ? "rgba(34,197,94,0.15)" : lastSetFormScore >= 50 ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                        color: lastSetFormScore >= 80 ? "#22c55e" : lastSetFormScore >= 50 ? "#eab308" : "#ef4444",
                      }}
                    >
                      Set {lastSetNumber} · {lastSetFormScore}% form
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {reasonerStream}
                  {isReasonerStreaming && (
                    <span className="inline-block w-1 h-3 ml-0.5 animate-pulse" style={{ background: "#8b5cf6", verticalAlign: "text-bottom" }} />
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-pain */}
      {step === "post_pain" && (
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4 p-4">
          {(reasonerStream || isReasonerStreaming) && (
            <div className="glass-card p-4 max-w-md w-full" style={{ border: "1px solid rgba(139,92,246,0.3)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }} />
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#8b5cf6" }}>Clinical Insight</span>
                {lastSetFormScore !== null && (
                  <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
                    background: lastSetFormScore >= 80 ? "rgba(34,197,94,0.15)" : lastSetFormScore >= 50 ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                    color: lastSetFormScore >= 80 ? "#22c55e" : lastSetFormScore >= 50 ? "#eab308" : "#ef4444",
                  }}>
                    {lastSetName} · {lastSetFormScore}% form
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {reasonerStream}
                {isReasonerStreaming && (
                  <span className="inline-block w-1 h-3 ml-0.5 animate-pulse" style={{ background: "#8b5cf6", verticalAlign: "text-bottom" }} />
                )}
              </p>
            </div>
          )}
          <PainScale label="How would you rate your pain now?" onSelect={handlePostPain} />
        </div>
      )}

      {/* Summary */}
      {step === "summary" && (
        <div className="flex-1 flex items-center justify-center animate-fade-in p-6 overflow-y-auto">
          <div className="glass-card-bright p-8 max-w-xl w-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-success-dim)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h2 className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Session Complete</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
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
              <div className="flex items-center justify-center gap-6 mb-5 text-sm">
                <div><span className="data-label mr-1.5">Before</span><span className="font-mono" style={{ color: "var(--color-text-primary)" }}>{painPre}/10</span></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                <div><span className="data-label mr-1.5">After</span><span className="font-mono" style={{ color: "var(--color-text-primary)" }}>{painPost}/10</span></div>
              </div>
            )}

            {/* Progression Coach output — plain-language recap */}
            {coachOutput ? (
              <div className="flex flex-col gap-4 text-left">
                <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                  <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "#22c55e" }}>
                    Your Coach
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
                    {coachOutput.message}
                  </p>
                </div>

                {coachOutput.next_steps.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                    <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--color-accent)" }}>
                      Next Time
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {coachOutput.next_steps.map((s, i) => (
                        <li key={i} className="text-sm flex gap-2" style={{ color: "var(--color-text-secondary)" }}>
                          <span style={{ color: "var(--color-accent)" }}>→</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coachOutput.referral_advice && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#fbbf24" }}>
                        Consider seeing a doctor
                      </span>
                      <span
                        className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
                        style={{
                          background: coachOutput.referral_advice.urgency === "urgent" ? "rgba(239,68,68,0.15)" : coachOutput.referral_advice.urgency === "soon" ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
                          color: coachOutput.referral_advice.urgency === "urgent" ? "#ef4444" : coachOutput.referral_advice.urgency === "soon" ? "#fbbf24" : "#22c55e",
                        }}
                      >
                        {coachOutput.referral_advice.urgency}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text-primary)" }}>
                      {coachOutput.referral_advice.doctor_type}
                    </p>
                    <div className="mb-3">
                      <div className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                        What to tell them
                      </div>
                      <ul className="flex flex-col gap-1">
                        {coachOutput.referral_advice.what_to_tell_them.map((s, i) => (
                          <li key={i} className="text-xs flex gap-2" style={{ color: "var(--color-text-secondary)" }}>
                            <span style={{ color: "#fbbf24" }}>•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {coachOutput.referral_advice.questions_to_ask.length > 0 && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                          Questions to ask
                        </div>
                        <ul className="flex flex-col gap-1">
                          {coachOutput.referral_advice.questions_to_ask.map((q, i) => (
                            <li key={i} className="text-xs flex gap-2" style={{ color: "var(--color-text-secondary)" }}>
                              <span style={{ color: "#fbbf24" }}>?</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {coachOutput.resources.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
                    <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
                      Worth Checking Out
                    </div>
                    <ul className="flex flex-col gap-2">
                      {coachOutput.resources.map((r, i) => (
                        <li key={i} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                            {r.title}
                          </span>{" "}
                          — {r.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl text-center text-sm" style={{ background: "var(--color-surface-raised)", color: "var(--color-text-muted)" }}>
                <div className="spinner mx-auto mb-2" />
                Coach is writing your recap...
              </div>
            )}

            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <Link href="/progress" className="btn-ghost text-sm">View Progress</Link>
              {savedSessionId && (
                <Link href={`/report/${savedSessionId}`} className="btn-ghost text-sm">
                  Full Report →
                </Link>
              )}
              <Link href="/" className="btn-accent">Return Home</Link>
            </div>
          </div>
        </div>
      )}

      {/* The in-session voice is now driven by the Form Observer agent —
          each observation is streamed to /api/tts and played inline. No
          separate coaching component is mounted here. */}

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
