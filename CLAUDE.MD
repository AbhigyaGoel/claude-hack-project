# Vero — AI Physical Therapy Suite

## Core Thesis

Vero is not an app that calls Claude. Vero is a **swarm of specialized Claude agents** with pose, vision, music, and voice as tools. Every non-trivial decision — what to say, when to stop, which exercise to pick, whether this rep counts, whether to refer out — is made by a Claude agent.

---

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
- **Pose:** MediaPipe Tasks Vision (browser WASM), 33-keypoint BlazePose
- **Claude SDK:** `@anthropic-ai/sdk` + Claude Agent SDK for sub-agents
- **Models:** `claude-opus-4-7` (reasoning-heavy), `claude-sonnet-4-6` (form loop), `claude-haiku-4-5-20251001` (sub-second cues)
- **Audio:** Tone.js + GrooVAE (Magenta.js)
- **Voice:** ElevenLabs Conversational AI + TTS
- **Storage:** SQLite + Drizzle, IndexedDB cache
- **MCP:** Vero exposes itself as an MCP server; consumes Apple Health, Google Fit, Calendar, Gmail

---

## Multi-Agent Architecture

Three Claude agents run in parallel during a live session, coordinated via shared session state.

```
                     ┌───────────────────────────┐
                     │ Orchestrator (Sonnet 4.6) │
                     │ tool-use loop, main flow  │
                     └──────────┬────────────────┘
                                │ spawns sub-agents via Agent SDK
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼────────┐
│ Safety Monitor   │  │ Clinical Narrator │  │ Form Critic      │
│ (Haiku 4.5)      │  │ (Opus 4.7)        │  │ (Sonnet 4.6)     │
│ parallel stream, │  │ streams reasoning │  │ vision + pose    │
│ red-flag halt    │  │ to patient live   │  │ per-rep analysis │
│ authority        │  │ (transparency)    │  │                  │
└──────────────────┘  └───────────────────┘  └──────────────────┘
```

**Safety Monitor** — hard-interrupt authority. Only job: detect red flags (sharp radiating pain, numbness, bowel/bladder mention, chest pain, sudden weakness). Haiku for sub-300ms latency.

**Clinical Narrator** — streams "inner monologue" reasoning to a side panel: _"Noticing slight knee valgus on left side — consistent with weak glute med. Will cue external rotation next set."_ Patient sees the reasoning. Trust differentiator.

**Form Critic** — per-rep vision + pose analyzer. Sonnet for speed.

---

## Model Routing

| Agent                | Model                              | Why                                 |
| -------------------- | ---------------------------------- | ----------------------------------- |
| Intake               | Opus 4.7 + extended thinking (12k) | differential dx reasoning           |
| Programming          | Opus 4.7                           | biomechanical reasoning + citations |
| Orchestrator         | Sonnet 4.6                         | tool-use loop                       |
| Form Critic          | Sonnet 4.6 + vision                | per-rep analysis, 1 Hz              |
| Safety Monitor       | Haiku 4.5                          | sub-300ms red flag detection        |
| Clinical Narrator    | Opus 4.7 + interleaved thinking    | streamed reasoning                  |
| Cue Generator        | Haiku 4.5                          | instant verbal correction text      |
| Session Report       | Opus 4.7 + extended thinking       | longitudinal synthesis              |
| Between-session Chat | Sonnet 4.6 + memory tool           | adherence, questions                |

---

## Prompt Caching (Critical for Cost)

Cached prefixes, rebuilt per session:

1. Clinical system prompt (~3k tokens)
2. Exercise library JSON filtered to patient's body region (~40k tokens)
3. Patient profile + prior sessions summary (~5k tokens)
4. Tool definitions (~2k tokens)

Cache hit reduces form-loop cost ~90%. Rebuild on session start, reuse for the entire session.

---

## Claude Memory Tool

Every patient has a persistent memory namespace: `/patients/{id}/`.

Files Claude maintains:

- `/patients/{id}/case_notes.md` — running SOAP notes, updated per session
- `/patients/{id}/progression_history.json` — exercise advancement decisions + rationale
- `/patients/{id}/pattern_observations.md` — compensations, preferences, pain triggers
- `/patients/{id}/goals.md` — functional goals + progress

A patient returning after 2 weeks gets a Claude that _remembers them_ — via memory tool reading actual files, not RAG.

---

## Skills (Custom, per Body Region)

Region-specific skills loaded by the orchestrator based on intake profile:

```
/skills
  /shoulder/SKILL.md      # Hawkins-Kennedy, Neer, Empty Can protocols
  /knee/SKILL.md          # Lachman, McMurray, patellar tracking
  /lumbar/SKILL.md        # slump, SLR, centralization tracking
  /cervical/SKILL.md      # Spurling's, upper quarter screen
  /hip/SKILL.md           # FADIR, FABER, Trendelenburg
```

Each skill encodes clinical reasoning for that region: which special tests to "order" via pose, what findings mean, which exercises match which findings. Skills scale Vero to 6+ body regions without one bloated prompt.

---

## Agent 1 — Intake (Extended Thinking + Sub-Agents)

1. Primary intake agent runs orthopedic screen via ElevenLabs voice
2. Extended thinking (budget 12k) maintains running differential diagnosis
3. When two hypotheses tie, spawns a **differential resolver sub-agent** (Agent SDK) that proposes a specific pose-based special test
4. Main agent executes the test via `pose_special_test` tool, feeds result back
5. Sub-agent returns narrowed differential; main continues

**Output:** `PatientProfile` JSON, ranked `DifferentialDx[]` with confidences, cited reasoning (Claude pulls from research corpus via file search tool).

---

## Agent 2 — Programming (Claude-Generated Exercise Library)

The library itself is generated by Claude, not hand-curated.

**One-time build:**

- Claude (Opus + extended thinking + web search) generates ~200 exercises per body region
- Each entry: name, target muscles, regression/progression chain, **angle windows per joint**, common faults, contraindications, research citations
- Human-reviewed once, frozen in `/exercises/library.json`

**Per-session programming:**

- Claude reads filtered library (prompt-cached), profile, MCP health data, prior deltas
- Outputs `ExercisePlan` with per-exercise `progression_rule` as executable JSON logic
- Cites specific studies for each exercise selection

---

## Agent 3 — Real-Time Form Loop

**Per-frame (browser, 30 fps):**

- MediaPipe → 33 keypoints → joint angles
- Local rule check against `ExerciseSpec.angle_windows`
- Rep counter via zero-crossing on primary joint

**Per rep (not per second):**

- 1-second video clip (30 frames) + keypoint timeseries → `/api/form-critic`
- Form Critic analyzes the **full rep as a video**, not a single frame
- Catches kinetic chain issues single frames miss
- Output: `RepAnalysis { faults[], quality: 0-1, compensations[], tempo_deviation }`

**Cue generation (parallel):**

- If fault severity ≥ 3, Orchestrator calls Cue Generator (Haiku)
- Cue text conditioned on: patient's prior cue responses, coaching style preference, fault type
- → ElevenLabs with emotion tag → patient hears before next rep

**Safety Monitor parallel stream:**

- Watches transcript (grunts, verbal pain) + vision frames for grimacing, guarding
- On red flag: emits `HALT` → Orchestrator stops session, logs, refers

---

## Agent 4 — Adaptive Music (Claude Decides Tempo Strategy)

- Tone.js + GrooVAE handle audio generation
- Claude decides **when and how** to modulate tempo strategically
- Patient slowing = fatigue → Claude chooses: maintain tempo to push (strength block), slow down (cooldown block), or end set (failure detection) based on plan phase
- `set_music_tempo` tool implements the decision

---

## Agent 5 — Coaching Voice

- `speak` tool: `{ text, emotion, priority, interrupt_current }`
- Cue Generator (Haiku) produces text
- ElevenLabs renders with emotion-conditioned voice settings
- Priority queue managed by Orchestrator

---

## Agent 6 — Session Report (Interactive Artifact)

Post-session:

1. Report Agent (Opus + extended thinking) synthesizes session log, prior sessions, health data, case notes memory
2. Updates `/patients/{id}/case_notes.md` via memory tool
3. Generates an **interactive React artifact** with:
   - ROM progression chart
   - Form quality trend
   - Pain trajectory
   - Adherence heatmap
   - Narrated summary
4. Artifact uses Anthropic API to let patient **ask follow-up questions** about their own report
5. PDF export for human PT handoff

---

## Between-Session Chat

Patient texts Vero anytime. Chat agent (Sonnet + memory tool) has full case history.

- "Is this soreness normal?" → references specific exercise done 2 days ago
- "I can't do today's session" → adjusts plan
- "My knee clicked today" → logs to case notes, may escalate to Safety Monitor review

Turns Vero from an app into continuous care.

---

## Vero as MCP Server

Vero exposes `vero-mcp`. A real PT on Claude Desktop connects and queries:

- `get_patient_summary(patient_id)`
- `get_session_history(patient_id)`
- `get_form_events(session_id)`
- `override_plan(patient_id, plan)`

A human PT managing 20 Vero patients supervises via Claude Desktop + vero-mcp. Vero integrates into clinical practice, doesn't replace it.

---

## Batch Overnight Analysis

Nightly Claude Batch API job across all active patients:

- Re-analyzes last 7 days of sessions
- Detects patterns: _"Patient 12 shows knee valgus only on left side, only after rep 8 — likely glute med fatigue"_
- Updates `pattern_observations.md` memory files
- Flags plateau-ing patients for human PT review via vero-mcp

---

## Data Model (Drizzle)

```ts
patients(id, profile_json, memory_path, created_at);
plans(id, patient_id, plan_json, active, citations_json);
sessions(id, plan_id, started_at, ended_at, summary_json, artifact_url);
sets(id, session_id, exercise_id, reps, rpe, pain, form_score);
rep_analyses(id, set_id, rep_num, video_clip_url, faults_json, quality);
form_events(id, set_id, t_ms, fault, severity, cue_sent);
red_flags(id, session_id, type, transcript, halted, referred);
narrator_log(id, session_id, t_ms, reasoning_text);
chat_messages(id, patient_id, role, content, created_at);
```

---

## File Structure

```
/app
  /api
    /intake/route.ts              # Agent 1 + differential resolver sub-agent
    /plan/route.ts                # Agent 2
    /orchestrator/route.ts        # main tool-use loop (SSE)
    /form-critic/route.ts         # per-rep video analysis
    /safety-monitor/route.ts      # parallel Haiku stream
    /narrator/route.ts            # Clinical Narrator SSE
    /cue/route.ts                 # Cue Generator (Haiku)
    /report/route.ts              # Agent 6 artifact + PDF
    /chat/route.ts                # between-session chat
    /mcp/[...path]/route.ts       # Vero MCP server endpoints
    /batch/nightly/route.ts       # cron-triggered
  /(app)
    /intake/page.tsx
    /session/[id]/page.tsx        # live pose + music + narrator panel
    /history/page.tsx
    /chat/page.tsx
    /report/[id]/page.tsx         # interactive artifact
/lib
  /claude
    client.ts                     # SDK wrapper w/ prompt caching
    tools.ts                      # tool definitions
    memory.ts                     # memory tool wrapper
    sub-agents.ts                 # Agent SDK spawners
    /prompts                      # system prompts per agent
  /pose
  /audio
  /voice
  /mcp
    server.ts                     # Vero MCP server
    clients.ts                    # Health/Calendar/Gmail clients
/skills
  /shoulder/SKILL.md
  /knee/SKILL.md
  /lumbar/SKILL.md
  /cervical/SKILL.md
  /hip/SKILL.md
/exercises
  library.json
  generate.ts                     # one-time Claude generation script
/patient-memory                   # memory tool root
  /{patient_id}/...
```

---

## Build Order

1. Scaffold + MediaPipe pose overlay
2. Claude client with prompt caching + tool registry
3. Orchestrator SSE skeleton with 2 dummy tools
4. Agent 1 intake (text, then voice) + differential resolver sub-agent
5. Exercise library generation script (one region)
6. Agent 2 programming with citations
7. Agent 3 local rule check + basic cueing
8. Form Critic with video-clip analysis
9. Safety Monitor parallel stream
10. Clinical Narrator side panel
11. Cue Generator (Haiku)
12. ElevenLabs voice everywhere
13. Adaptive music
14. Memory tool integration
15. Interactive Artifact report
16. Between-session chat
17. Vero MCP server
18. Batch nightly analysis
19. Additional body-region skills

Ship 1–12 for demo. 13–19 for post-hackathon.

---

## Demo Script

- 60s voice intake → profile + cited differential → plan with research citations rendered
- Live squat set: Clinical Narrator panel streams reasoning while patient moves
- 3 form faults caught via video-clip analysis: knee valgus, forward lean, shallow depth — each cued with emotion-conditioned voice
- Scripted "sharp shooting pain down my leg" → Safety Monitor halts session in <300ms, refers out
- Post-session interactive artifact opens; judge asks it _"why did you pick split squats?"_ → Claude answers from case notes memory

---

## Non-Goals

- Native mobile
- Server-side pose
- Diagnosis claims (clinical decision support)
- Full HIPAA at hackathon (flag in roadmap)
