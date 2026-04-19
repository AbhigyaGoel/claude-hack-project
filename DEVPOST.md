# Vero: AI Physical Therapy

## Inspiration

Physical therapy has an access problem. Over 60% of patients drop out before completing their prescribed rehab programs. The reasons are always the same: cost ($150+/session), scheduling friction, and the gap between weekly clinic visits where patients are left alone with a printout of exercises they half-remember. Rural and underserved communities have it worse: there simply aren't enough PTs.

We asked: what if a patient could have a physical therapist watching every single rep, catching compensations in real-time, adjusting the program on the fly, and explaining *why*, not once a week, but every session, from their living room?

That's Vero. A browser-native PT system where specialized Claude agents handle clinical reasoning while MediaPipe handles the biomechanics. No app install, no special hardware: just a webcam and a browser.

## What it does

Vero runs a complete physical therapy session end-to-end:

1. **Diagnostic Intake**: A Claude-powered clinical interview (voice or text) screens for red flags, assesses severity using the SINSS framework, runs validated outcome measures (DASH, KOOS, ODI, NDI, LEFS), and produces a structured patient profile with differential diagnoses.

2. **Exercise Programming**: Pulls from a 105-exercise library spanning 6 body regions (shoulder, knee, hip, lumbar, cervical, ankle), each with clinically accurate target angles, compensation pattern definitions with MediaPipe landmark indices, and progression/regression pathways.

3. **Real-Time Form Analysis**: MediaPipe BlazePose tracks 33 keypoints at 30fps in-browser. A rep detection state machine counts reps using joint angle thresholds. Per-rep, Claude agents analyze form quality, detect compensations, and generate coaching feedback, all spoken aloud via ElevenLabs TTS.

4. **Multi-Agent Clinical Reasoning**: During exercise, a swarm of specialized agents runs in parallel:
   - **Form Observer** reads webcam frames and writes warm, plain-language chart notes (SOAP "O")
   - **Form Critic** performs biomechanical fault detection on joint angles
   - **Clinical Reasoner** synthesizes observer notes into clinical assessments per set (SOAP "A")
   - **Progression Coach** evaluates the full session and recommends next steps (SOAP "P")
   - **Clinical Narrator** streams real-time reasoning to the patient

5. **Longitudinal Tracking**: D3.js charts track form quality, pain trends, and volume across sessions. A nightly batch analysis agent detects patterns that per-session analysis misses: fatigue signatures, compensation trends, and plateaus.

6. **PT Supervision via MCP**: A human PT can connect via Claude Desktop and use 6 MCP tools to review patients, inspect form events, and override exercise plans while keeping a human in the loop.

## How we built it

**Frontend:** Next.js 16 with App Router, TypeScript, Tailwind CSS. The session page is the orchestrator: it manages the exercise state machine, fires agent calls, handles rep detection, and renders the 3-panel exercise UI (setlist, webcam, controls).

**Pose Estimation:** MediaPipe Tasks Vision running entirely in-browser via WASM. Joint angle calculations for 9 movement patterns (shoulder flexion, knee flexion, hip flexion, cervical flexion/rotation/lateral flex, trunk flexion, ankle dorsiflexion). Angles return clinical values: $0\degree$ at neutral, increasing with movement.

**Rep Detection:** A state machine with four phases:

$$\text{idle} \xrightarrow{\theta > 0.25\theta_{\text{target}}} \text{ascending} \xrightarrow{\theta > 0.50\theta_{\text{target}}} \text{descending} \xrightarrow{\theta < 0.15\theta_{\text{target}}} \text{complete}$$

With an 800ms minimum duration filter to reject noise.

**Claude Agents:** 7 specialized agents using `@anthropic-ai/sdk` with model routing: Sonnet 4.6 for clinical reasoning (form analysis, intake, narrator), Haiku 4.5 for latency-sensitive tasks (coaching). Each agent has a focused system prompt with structured output schemas.

**Voice:** ElevenLabs Conversational AI for the intake interview + TTS for per-rep coaching cues spoken by the Form Observer agent.

**Storage:** Supabase Postgres with Drizzle ORM. 11 tables tracking patients, plans, sessions, sets, rep analyses, form events, red flags, narrator logs, chat messages, and per-patient memory files.

**Exercise Demo Animations:** A template-based skeleton animation system with 7 base poses and 34 movement templates, using the same `drawSkeleton()` renderer as the live camera overlay.

**Clinical Skills:** 2,731 lines of body-region-specific clinical knowledge across 6 skill files: special tests, differential diagnosis trees, exercise matrices, and progression criteria that agents reference during intake and programming.

## Challenges we ran into

**Angle calculations were inverted.** Our initial `calculateShoulderFlexion` returned ~$170\degree$ at rest and ~$10\degree$ overhead, exactly backwards. This caused the rep counter to fire constantly since the "resting" angle was above every threshold. The fix was `\max(0, 180 - \theta_{\text{raw}})` across all joint calculations.

**Animation system took 5+ iterations.** Wall slides, the simplest exercise, went through: arms crossing into an X, an upside-down W shape, the body sliding when it shouldn't, and compounding rotation errors from `rotateJointsAround`. We finally solved it with explicit keyframe interpolation instead of relative joint rotations.

**Agent overcorrection.** Our first safety monitor flagged false positives on nearly every frame ("lateral lean detected," "possible fall risk") when the patient was just standing normally. We learned that more agents doesn't mean better: we cut the safety monitor and cue generator entirely, letting the Form Observer handle spoken feedback. Fewer, better agents beat many noisy ones.

**Thinking API changes.** Mid-hackathon, `thinking.type: "enabled"` stopped working; the API had changed to `"adaptive"`. This broke every agent that used extended thinking until we tracked it down.

**Network issues.** UCLA's campus network blocks Supabase Postgres ports (5432/6543). We lost time diagnosing before switching to a phone hotspot.

**Claude text and ElevenLabs TTS.** Keeping spoken coaching aligned with what Claude generated meant juggling latency, streaming text, and the ElevenLabs API: when to start audio, how to cancel or replace overlapping speech, and how to avoid the voice saying something the model had already revised. Small timing bugs felt like big UX failures.

**Database schema churn.** We started with a rough schema and kept evolving it as features landed (sessions, SOAP fields, narrator logs, patient memory). Each shift meant migrations, RLS policies, and fixing queries that assumed yesterday's columns. The app and DB were in constant negotiation.

**Version control and keys (classic hackathon).** Divergent branches, stash-and-rebase loops, and "works on my machine" moments were part of the day. On top of that, we had to keep Anthropic, ElevenLabs, and Supabase credentials consistent across `.env`, deployment, and teammates' machines so nothing silently failed in demo.

## Accomplishments that we're proud of

- **The SOAP pipeline actually works.** Observer $\to$ Reasoner $\to$ Coach produces clinically coherent notes that flow from objective observation through assessment to plan, the same structure real PTs use in their documentation.

- **Zero server-side CV.** All pose estimation runs in the browser via WASM. The server never sees raw video. This is both a privacy win and an architecture win, and no GPU servers are needed.

- **105 exercises with real clinical data.** Each exercise has target angles, tolerances, tempo, coaching cues, compensation patterns with specific MediaPipe landmark indices, contraindications, and regression/progression pathways. Generated via Claude Opus with clinical validation.

- **The Form Observer speaks.** Per-rep, the observer writes a chart note, persists it to the database, AND speaks it aloud via TTS, so the patient gets real-time verbal coaching grounded in what Claude actually sees in the webcam frame.

- **MCP supervision bridge.** A practicing PT can connect via Claude Desktop and review any patient's history, form events, and exercise plan using natural language. The AI handles the session; the human keeps oversight.

## What we learned

**Agent architecture is about subtraction, not addition.** We started with 10+ agents and ended with 7. The ones we cut (safety monitor, cue generator, vision analyst, progress analyst) were either redundant with better agents or produced more noise than signal. The best architecture is the minimum viable swarm.

**Model routing matters.** Using Opus for per-rep narration ($120 \times$ per session) was burning ~\$0.72/session with output that wasn't even persisted. Matching model capability to task criticality (Sonnet for reasoning, Haiku for speed) kept costs reasonable without sacrificing quality.

**MediaPipe is good enough.** 33-keypoint BlazePose at 30fps in-browser WASM gives you enough signal for rep counting and basic compensation detection. You don't need depth cameras or server-side pose estimation for rehab-grade analysis. The webcam in your laptop is sufficient.

**Structured prompts with clinical frameworks beat generic instructions.** The SINSS framework, OPQRST interview structure, and body-region-specific skill files gave agents clinically grounded reasoning instead of generic health advice. Domain knowledge in the prompt is worth more than model size.

## What's next for Vero

- **Wire Form Critic into the clinical pipeline**: Currently orphaned. Faults should feed into the Clinical Reasoner so assessments include biomechanical data, not just visual observations.

- **Rebuild exercise programming as a Claude agent**: Currently client-side filtering (`queryExercises`). Should use Claude to design personalized plans based on intake results, past session performance, chat history, and patient memory.

- **Session report generation**: The report page exists but needs a working backend. Claude should generate clinician-grade session reports with charts, outcome measure tracking, and plateau detection.

- **Mobile-responsive UI**: Currently desktop-only. The 3-panel exercise layout needs a mobile adaptation for phone-based sessions.

- **Multi-language support**: ElevenLabs supports multiple languages. The intake interview and coaching cues should adapt to the patient's preferred language.

- **Clinical validation study**: Partner with PT programs to validate Vero's form analysis accuracy against expert human assessment and measure patient outcomes.
