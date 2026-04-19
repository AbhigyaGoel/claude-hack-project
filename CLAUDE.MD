# Vero — AI Physical Therapy Suite

## What It Is

Vero is a browser-native PT system where specialized Claude agents handle clinical decisions — intake screening, real-time form analysis, coaching cues, and session reasoning. MediaPipe provides pose estimation, ElevenLabs provides voice. Zero server-side CV.

---

## Stack (Actual)

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Pose:** MediaPipe Tasks Vision (browser WASM), 33-keypoint BlazePose
- **Claude:** `@anthropic-ai/sdk` — Sonnet 4.6 (form loop, orchestration), Haiku 4.5 (coaching)
- **Voice:** ElevenLabs Conversational AI (intake) + TTS (coaching cues)
- **Storage:** Supabase Postgres + Drizzle ORM
- **Auth:** Simple username/password auth (demo-grade)
- **SMS:** Textbelt for PT notification after sessions

---

## Multi-Agent Architecture

During a live exercise session, these agents run in parallel:

```
Session Page (client)
    |
    |- POST /api/form-critic      -> formCritic agent (Sonnet) — per-rep quality analysis
    |- POST /api/form-observer    -> Form Observer (Sonnet) — SOAP "O" notes from webcam + keypoints
    |- POST /api/clinical-reasoner -> Clinical Reasoner (Sonnet) — SOAP "A" assessment per set
    |- POST /api/progression-coach -> Progression Coach (Haiku) — SOAP "P" plan adjustments
    |- POST /api/narrator         -> clinicalNarrator agent (Sonnet) — SSE streaming reasoning
    '- POST /api/notify-pt        -> SMS notification to supervising PT after session
```

**Form Critic** — called after each completed rep. Receives exercise spec + peak angle. Returns `RepAnalysis { faults[], quality, compensations[], tempo_deviation }`. Faults display in the right sidebar.

**Form Observer** — SOAP "O" agent. Analyzes webcam frames + keypoints to generate objective clinical observations per rep. Output is spoken aloud via TTS and persisted to `narrator_log`.

**Clinical Reasoner** — SOAP "A" agent. Takes observer notes + form critic data to produce clinical assessment per set. Persisted to `narrator_log`.

**Progression Coach** — SOAP "P" agent. Reads session history and current performance to recommend progression/regression. Fires once at session end.

**Clinical Narrator** — SSE streaming clinical reasoning narrative displayed to patient during session.

---

## Agents

### Agent Files (src/agents/)

| Agent | File | Model | Purpose |
|-------|------|-------|---------|
| Diagnostic Interviewer | `diagnosticInterviewer.ts` | Sonnet | Structured ortho screen, SINSS framework, red flag detection |
| Form Critic | `formCritic.ts` | Sonnet | Per-rep biomechanical analysis |
| Clinical Narrator | `clinicalNarrator.ts` | Sonnet | SSE streaming clinical reasoning |
| Chat Agent | `chatAgent.ts` | Sonnet + memory | Between-session patient chat |
| Session Report | `sessionReport.ts` | Sonnet | Post-session summary generation |

### Inline Route Agents (no separate agent file)

| Agent | Route | Model | Purpose |
|-------|-------|-------|---------|
| Form Observer | `/api/form-observer` | Sonnet/Haiku | SOAP "O" — objective observations from webcam |
| Clinical Reasoner | `/api/clinical-reasoner` | Sonnet | SOAP "A" — clinical assessment per set |
| Progression Coach | `/api/progression-coach` | Haiku | SOAP "P" — progression/regression decisions |

---

## Session Flow

1. **Profile Selection** — existing patient or create new
2. **Intake** — ElevenLabs Conversational AI voice interview OR text-based form (body region, red flags, assessment questions)
3. **Diagnosis** — severity score, functional deficits, clearance status displayed
4. **Plan Review** — exercise list with adjustable sets/reps, remove exercises
5. **Pre-Pain Rating** — 0-10 pain scale
6. **Exercise Loop** — 3-panel layout:
   - Left: exercise setlist with progress bar, per-exercise status
   - Center: webcam with MediaPipe skeleton overlay + angle labels
   - Right: rep counter, exercise demo animation, exercise guide, PT notes, form critic feedback, skip button
7. **Post-Pain Rating** — 0-10 pain scale
8. **Report** — redirects to `/report/[id]` for full session report with follow-up Q&A

---

## Pose Estimation

- MediaPipe PoseLandmarker (lite model, browser WASM, 30fps)
- Joint angle calculations: shoulder flexion, elbow flexion, hip flexion, knee flexion, cervical flexion/rotation/lateral flex, trunk flexion, ankle dorsiflexion
- Angles return clinical values: 0 deg at neutral, increasing with movement
- Rep detection: state machine (idle -> ascending -> descending -> complete) with thresholds: 25% start, 50% peak, 15% reset, 800ms minimum duration

---

## Exercise Demo Animations

Template-based skeleton animation system in `src/lib/animation/`:
- 7 anatomically correct base poses (standing, side, supine, prone, sidelying, quadruped, seated)
- 34 movement templates across 6 body regions using joint rotation math
- Same `drawSkeleton()` renderer as live camera overlay
- Auto-plays on mount, loops continuously at 30fps
- Template registry: 3-tier lookup (exact ID -> joint angle pattern -> body region default)

---

## Exercise Library

105 exercises across 6 body regions in `src/data/exercises.json`:
- Shoulder: 19, Knee: 18, Hip: 16, Lumbar: 16, Cervical: 15, Ankle: 21
- Each exercise: target_angles, tolerances, tempo, cues, compensation_patterns with MediaPipe landmarks, contraindications, regression/progression
- Generation script: `src/exercises/generate.ts` (Claude Opus)
- Plan built client-side via `queryExercises()` in `src/lib/exercises.ts`

---

## Clinical Skills

6 body-region clinical skills (2,731 lines total) in `src/skills/`:
- Shoulder (534L): 8+ special tests, impingement/instability/cuff pathways, 4-phase exercise matrix
- Knee (650L): Lachman/McMurray/Thessaly, ACL/meniscal/PF protocols, LSI thresholds
- Lumbar (396L): McKenzie classification, centralization tracking, cauda equina criteria
- Cervical (436L): Spurling's, WAD grading I-IV, cervicogenic headache differential
- Hip (321L): FADIR/FABER/Trendelenburg, FAI/labral/OA protocols
- Ankle (394L): Ottawa rules, Alfredson protocol, chronic instability

---

## Patient Memory

Supabase-backed per-patient memory (`patient_memory` table):
- `case_notes.md` — running SOAP notes
- `progression_history.json` — exercise advancement decisions
- `pattern_observations.md` — compensations, preferences, pain triggers
- `goals.md` — functional goals + progress
- Memory tool handlers for Claude tool-use (read/write/append/list)

---

## Database (Supabase Postgres + Drizzle)

```
patients(id, user_id, name, profile_json, pt_phone, created_at)
plans(id, patient_id, plan_json, active, citations_json, created_at)
sessions(id, plan_id, patient_id, user_id, started_at, ended_at, pain_pre, pain_post, summary_json, artifact_url)
sets(id, session_id, exercise_id, exercise_name, set_number, reps, rpe, pain, form_score)
rep_analyses(id, set_id, rep_num, video_clip_url, faults_json, quality)
form_events(id, set_id, t_ms, fault, severity, cue_sent)
red_flags(id, session_id, type, transcript, halted, referred)
narrator_log(id, session_id, patient_id, source, t_ms, reasoning_text, created_at)
chat_messages(id, patient_id, user_id, role, content, created_at)
patient_memory(id, patient_id, user_id, filename, content, updated_at)
```

---

## API Routes (18 endpoints)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/*` | POST | Login, signup, logout, me |
| `/api/patients` | GET/POST | List/create patients |
| `/api/patients/[id]` | GET/PATCH/DELETE | Get/update/delete patient |
| `/api/sessions` | GET/POST | List/save sessions |
| `/api/sessions/[id]` | GET | Get single session |
| `/api/sessions/start` | POST | Create session row at start |
| `/api/intake` | POST | Run diagnostic intake agent |
| `/api/form-critic` | POST | Per-rep form analysis |
| `/api/form-observer` | POST | SOAP "O" — objective observations |
| `/api/clinical-reasoner` | POST | SOAP "A" — clinical assessment |
| `/api/progression-coach` | POST | SOAP "P" — progression decisions |
| `/api/narrator` | POST | SSE streaming clinical reasoning |
| `/api/report` | POST | Session report generation |
| `/api/notify-pt` | POST | SMS session summary to supervising PT via Textbelt |
| `/api/chat` | POST | Between-session chat |
| `/api/batch/nightly` | POST | Overnight pattern analysis |
| `/api/elevenlabs/*` | POST | TTS signed URLs |
| `/api/tts` | POST | Text-to-speech |

---

## Pages

| Path | Purpose |
|------|---------|
| `/` | Home — profile badge, start session, view progress, chat |
| `/session` | Live exercise session (intake -> plan -> exercise -> report) |
| `/progress` | D3 charts: form quality, pain trends, volume, session history |
| `/chat` | Between-session chat with Vero |
| `/report/[id]` | Interactive session report with follow-up Q&A |
| `/login` | Auth |

---

## Non-Goals

- Native mobile app
- Server-side pose processing
- Diagnosis claims (clinical decision support only)
- Full HIPAA compliance (flagged in roadmap)
