import type { SessionState, SessionPhase } from "@/types/session";
import type { DiagnosticResult, PatientProfile } from "@/types/patient";
import type { ExercisePlan } from "@/types/exercise";
import type { FormAssessment } from "@/types/assessment";
import type { RepData } from "@/types/assessment";

export interface OrchestratorContext {
  conductIntake: (bodyRegion: string, responses: Record<string, string>) => Promise<DiagnosticResult>;
  designProgram: (profile: PatientProfile) => Promise<ExercisePlan>;
  evaluateRep: (repData: RepData, exerciseId: string) => Promise<FormAssessment>;
  generateCoachingCue: (assessment: FormAssessment, repNumber: number, setNumber: number) => Promise<string>;
  analyzeSession: (state: SessionState) => Promise<void>;
}

export function createOrchestrator(agents: OrchestratorContext) {
  const state: SessionState = {
    phase: "intake",
    patient: null,
    plan: null,
    current_exercise_index: 0,
    current_set: 1,
    current_rep: 0,
    assessments: [],
    started_at: null,
    ended_at: null,
  };

  function getState(): Readonly<SessionState> {
    return {
      ...state,
      assessments: [...state.assessments],
    };
  }

  function setPhase(phase: SessionPhase): void {
    state.phase = phase;
  }

  async function startIntake(
    bodyRegion: string,
    responses: Record<string, string>,
  ): Promise<DiagnosticResult> {
    state.phase = "intake";
    const result = await agents.conductIntake(bodyRegion, responses);

    if (result.cleared_for_exercise) {
      state.patient = {
        id: `patient_${Date.now()}`,
        diagnostic: result,
        session_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return result;
  }

  async function generatePlan(): Promise<ExercisePlan | null> {
    if (!state.patient) return null;

    const plan = await agents.designProgram(state.patient);
    state.plan = plan;
    state.phase = "exercise";
    state.started_at = new Date().toISOString();
    state.current_exercise_index = 0;
    state.current_set = 1;
    state.current_rep = 0;

    return plan;
  }

  async function processRep(repData: RepData): Promise<{
    assessment: FormAssessment;
    coachingCue: string;
    setComplete: boolean;
    exerciseComplete: boolean;
    sessionComplete: boolean;
  }> {
    const exercise = state.plan?.exercises[state.current_exercise_index];
    if (!exercise) throw new Error("No active exercise");

    const assessment = await agents.evaluateRep(repData, exercise.id);
    state.assessments.push(assessment);

    if (assessment.rep_counted) {
      state.current_rep++;
    }

    const setComplete = state.current_rep >= exercise.reps;
    let exerciseComplete = false;
    let sessionComplete = false;

    if (setComplete) {
      state.current_set++;
      state.current_rep = 0;

      if (state.current_set > exercise.sets) {
        exerciseComplete = true;
        state.current_exercise_index++;
        state.current_set = 1;

        if (state.current_exercise_index >= (state.plan?.exercises.length ?? 0)) {
          sessionComplete = true;
          state.phase = "summary";
          state.ended_at = new Date().toISOString();
        }
      } else {
        state.phase = "rest";
      }
    }

    const coachingCue = await agents.generateCoachingCue(
      assessment,
      state.current_rep,
      state.current_set,
    );

    return { assessment, coachingCue, setComplete, exerciseComplete, sessionComplete };
  }

  function resumeExercise(): void {
    state.phase = "exercise";
  }

  async function endSession(): Promise<void> {
    state.phase = "summary";
    state.ended_at = new Date().toISOString();
    await agents.analyzeSession(state);
  }

  return {
    getState,
    setPhase,
    startIntake,
    generatePlan,
    processRep,
    resumeExercise,
    endSession,
  };
}
