@AGENTS.md

# Vero — AI Physical Therapy Suite

## Core Thesis

Claude is the **autonomous clinician**. Pose estimation, vision, music, TTS, and health connectors are its tools. The orchestration loop is a Claude tool-use agent, not a hardcoded pipeline.

---

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
- **Pose:** MediaPipe Tasks Vision (browser WASM) — 33-keypoint BlazePose
- **Vision:** Claude Vision via Anthropic SDK (server-side), 1 fps sampling
- **Audio:** Tone.js + GrooVAE (Magenta.js) for adaptive rhythm
- **Voice:** ElevenLabs Conversational AI (intake) + TTS (coaching)
- **Models:** `claude-opus-4-7` for intake/programming/session summary; `claude-sonnet-4-6` for real-time form loop (latency)
- **Storage:** SQLite + Drizzle (local dev); IndexedDB for session cache
- **MCP:** Apple Health / Google Fit, Google Calendar, Gmail (optional at demo)

---

## Architecture

```
User ──▶ Next.js UI ──▶ /api/orchestrator (Claude + tools)
                            │
                            ├─ tool: capture_pose_frame   → MediaPipe in browser, returns keypoints + JPEG
                            ├─ tool: vision_analyze       → Claude Vision on frame + keypoints
                            ├─ tool: speak                → ElevenLabs TTS stream
                            ├─ tool: set_music_tempo      → Tone.js BPM adjust
                            ├─ tool: play_cue             → pre-baked audio cue
                            ├─ tool: log_rep              → DB insert
                            ├─ tool: progress_exercise    → advance plan state
                            ├─ tool: regress_exercise     → deload
                            ├─ tool: flag_red_flag        → halt + refer human PT
                            ├─ tool: query_history        → prior session deltas
                            ├─ tool: get_health_data      → MCP Apple Health / Fit
                            └─ tool: generate_report      → Artifact PDF
```

Claude drives the loop. Frontend is a thin client that executes tool calls and streams results back.

---

## Agent 1 — Intake (extended thinking)

**Input:** ElevenLabs voice transcript stream  
**Output:** `PatientProfile` JSON + `DifferentialDx[]`

- Streaming transcription fed turn-by-turn to Claude
- System prompt: orthopedic PT screening protocol (SINSS, red flags, functional goals)
- Uses `thinking` with budget_tokens=8000 for differential refinement
- Claude selects follow-up questions based on hypothesis entropy
- Exits when top-3 differentials stabilize or user signals done

```ts
interface PatientProfile {
  region: BodyRegion;
  onset: { type: 'acute'|'insidious'; date?: string };
  sinss: { severity: 1-10; irritability: 1-10; nature: string; stage: string; stability: string };
  aggravators: string[]; easers: string[];
  redFlags: string[]; // saturda night palsy, cauda equina, etc.
  priorHx: string[]; imaging?: string[];
  goals: string[];
}
```

---

## Agent 2 — Programming

**Input:** `PatientProfile`, optional MCP health context (baseline activity, sleep)  
**Output:** `ExercisePlan` (7-day block, progression rules)

- Single Claude call with tool access to `exercise_library` (static JSON, ~200 exercises, each tagged with region/stage/equipment)
- Claude selects 4–6 exercises, sets dosage, defines progression/regression thresholds per exercise
- Progression rule schema per exercise: `{ advance_if: { rpe_lt: 5, pain_lt: 3, form_quality_gt: 0.8, sessions_completed: 3 } }`

---

## Agent 3 — Real-Time Form Loop (the hard part)

Runs during an exercise set. Target latency: corrective cue within 400ms of fault.

**Per-frame (30 fps, browser-only):**

- MediaPipe extracts 33 keypoints → joint angles (elbow, shoulder, hip, knee, ankle, trunk flexion)
- Local rule check against `ExerciseSpec.angle_windows` (e.g., squat: knee flexion 90–130°, trunk < 45°)
- Rep counter via angle zero-crossing on primary joint

**Per-second (sampled):**

- Send frame JPEG (downsampled 512px) + last 1s of keypoint timeseries to `/api/vision`
- Claude Vision checks what keypoints miss: grimacing, breath-holding, bracing, compensatory shoulder hike, asymmetric loading, equipment misuse
- Returns `FormObservation { faults: Fault[], confidence, severity }`

**Orchestrator decides:**

- Severity 1–2: silent log
- Severity 3: next-rep verbal cue via `speak` tool
- Severity 4: immediate cue, reduce tempo via `set_music_tempo`
- Severity 5: stop set, `regress_exercise`
- Any red-flag cue: `flag_red_flag`, halt session

---

## Agent 4 — Adaptive Music

- Tone.js master transport; BPM initialized to exercise's target cadence (e.g., tempo squats at 60 BPM = 2s eccentric + 2s concentric)
- Movement cadence detected from primary joint angle FFT (rolling 4s window)
- `set_music_tempo` tool smooths BPM toward detected cadence (max ±15% per step)
- GrooVAE generates rhythm variations keyed to exercise phase (warm-up → work → cooldown)
- Entrainment effect: patient stays on beat regardless of capability

---

## Agent 5 — Coaching Voice

- ElevenLabs TTS, voice ID pinned per session
- `speak` tool takes `{ text, emotion: 'calm'|'encouraging'|'urgent', priority }`
- Emotion conditions voice settings (stability, similarity_boost, style)
- Priority queue flushes lower-priority cues when urgent arrives

---

## Agent 6 — Session Tracking + Report Artifact

Post-session, single Claude call with `generate_report` tool:

- Pulls session log, prior sessions, health data
- Computes deltas: ROM gains, pain trend, adherence %, form-quality score
- Outputs Markdown report + chart specs
- Server renders to PDF (react-pdf) → served as download
- Designed to be handed to a human PT for handoff

---

## Data Model (Drizzle)

```ts
patients(id, profile_json, created_at);
plans(id, patient_id, plan_json, active);
sessions(id, plan_id, started_at, ended_at, summary_json);
sets(id, session_id, exercise_id, reps, rpe, pain, form_score);
form_events(id, set_id, t_ms, fault, severity, cue_sent);
red_flags(id, session_id, type, transcript, referred);
```

---

## File Structure

```
/app
  /api
    /intake/route.ts          # Agent 1 streaming endpoint
    /plan/route.ts            # Agent 2
    /orchestrator/route.ts    # main tool-use loop (SSE)
    /vision/route.ts          # Agent 3 vision call
    /report/route.ts          # Agent 6 PDF
  /(app)
    /intake/page.tsx
    /session/[id]/page.tsx    # live pose + music + coaching
    /history/page.tsx
/lib
  /claude/client.ts           # SDK wrapper
  /claude/tools.ts            # tool definitions (server truth)
  /claude/prompts/            # system prompts per agent
  /pose/mediapipe.ts
  /pose/angles.ts
  /pose/rep-counter.ts
  /audio/transport.ts
  /audio/groovae.ts
  /voice/elevenlabs.ts
  /mcp/clients.ts
/exercises
  library.json                # ~200 exercises w/ angle specs
```

---

## Build Order

1. **Scaffold + MediaPipe pose overlay** — webcam → keypoints drawn on canvas, rep count for bodyweight squat. Prove the client works.
2. **Tool registry + orchestrator skeleton** — Claude tool-use loop with 2 dummy tools, SSE streaming to UI.
3. **Agent 1 intake** — text-only first, ElevenLabs voice second. Output `PatientProfile`.
4. **Agent 2 programming** — generate plan from profile. Render plan UI.
5. **Agent 3 local rule check** — angle windows per exercise, cue via browser TTS.
6. **Agent 3 vision layer** — add Claude Vision sampling + fault classification.
7. **Agent 5 ElevenLabs coaching** — swap browser TTS for ElevenLabs, emotion conditioning.
8. **Agent 4 adaptive music** — Tone.js transport, cadence detection, tempo slaving.
9. **Agent 6 report** — session summary artifact, PDF download.
10. **MCP connectors** — Apple Health / Google Fit read, inject into Agent 2 context.

Ship 1–6 for a working demo. 7–10 for differentiation.

---

## Demo Script Targets

- 60s intake conversation → plan generated
- Live squat set: 3 intentional form faults (knee valgus, forward lean, shallow depth) each caught with distinct cues
- One red-flag moment (scripted "sharp shooting pain down leg") → session halts, refers out
- Downloadable PDF at end

---

## Non-Goals

- Native mobile app
- Server-side pose processing
- Diagnosis claims (position as "clinical decision support," not medical device)
- HIPAA compliance at hackathon stage (flag in roadmap)
