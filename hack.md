# Vero — Hackathon Demo Running Doc

_Living doc. Revise freely. Last touched: 2026-04-19._

---

## One-Liner

Vero is a swarm of specialized Claude agents doing live physical therapy — pose, vision, music, and voice are just tools.

**The pitch in one sentence:** Every non-trivial decision is made by a Claude agent, not by app logic.

---

## Demo Flow (target: 5 min)

1. **Voice intake (60s)** — ElevenLabs ConversationalAI intake → PatientProfile + ranked DifferentialDx with cited reasoning. Quick-fill / Randomize buttons available for demo speed.
2. **Editable plan** — exercises with sets/reps editable inline, drag-to-reorder, deletable. Judges see Claude output they can manipulate before starting.
3. **Live session — shoulder/knee set** — MediaPipe skeleton overlay + rep counter + form fault display in sidebar.
4. **Form faults caught** — per-rep VoiceCoach cues (ElevenLabs TTS) after each rep. Form Critic Claude call logs to DevTools `[VERO ✓]`.
5. **Safety halt** — scripted line: _"sharp shooting pain down my leg."_ Safety Monitor fires (Haiku). **⚠️ halt overlay not yet rendered — fix before demo.**
6. **Post-session report** — `/report` page, session stats. Interactive follow-up Q&A needs wiring.

---

## Build Status

_As of 2026-04-19. Items marked ✅ are wired end-to-end. ⚠️ = exists but broken/incomplete for demo._

### Core pipeline
- ✅ Scaffold + MediaPipe pose overlay (WebcamView, skeletonRenderer, 34 exercise animations)
- ✅ Claude client with prompt caching (`cache_control` on system + exercise library prefix)
- ✅ Agent 1 — Diagnostic intake (diagnosticInterviewer.ts, Opus + extended thinking, `/api/intake`)
- ✅ Exercise library — 105 exercises across 6 regions (shoulder 19, knee 18, hip 16, lumbar 16, cervical 15, ankle 21) in `src/data/exercises.json`
- ✅ Agent 2 — Program designer (programDesigner.ts, `/api/plan`)
- ✅ Local rep detection — angle-based zero-crossing counter, rep quality (green/yellow/red)
- ✅ Cue Generator — Haiku, `/api/cue`, fires after each rep via VoiceCoach
- ✅ ElevenLabs voice — TTS in IntakeView, ConversationalIntake, VoiceCoach; signed-url endpoint live
- ✅ Rep commentary → narrator_log DB writes (`/api/rep-commentary`, fires after each rep)
- ✅ Auth — username/password login/signup, session cookie
- ✅ DB — Supabase + Drizzle, full schema: users, patients, plans, sessions, sets, rep_analyses, narrator_log, chat_messages
- ✅ Session persistence — sessions + sets written to Supabase at end of workout
- ✅ Between-session chat — chatAgent.ts + memory tool wired, `/chat` page
- ✅ Progress page — session history, charts
- ✅ Report page — `/report/[id]`, session stats
- ✅ Editable plan — drag-to-reorder, delete, inline sets/reps steppers
- ✅ Intake quick-fill — "All Clear" + "Randomize" buttons on safety + assessment steps

### Wired but not rendering (fix for demo)
- ⚠️ **Safety Monitor** — `safetyMonitor.ts` + `/api/safety-monitor` call fires, `safetyHalt` state declared but **never rendered**. Halt overlay needs to be added to `session/page.tsx`.
- ⚠️ **Clinical Narrator panel** — `clinicalNarrator.ts` + `/api/narrator` SSE live, `callNarrator()` fires after each rep, **`narratorEntries` state declared but not rendered** (panel was removed, replaced by setlist). This is the trust differentiator — needs to come back as a side panel or overlay.
- ⚠️ **Form Critic faults display** — `formCriticFaults` state renders in sidebar during exercise, but `/api/form-critic` returns stub (8-line route, `analyzeRep` may not be fully implemented — verify).

### Not yet started
- ✗ Adaptive music — `musicEngine.ts` exists (Tone.js + GrooVAE, 139 lines) but **not wired into session page**
- ✗ Memory tool in intake/plan agents (only wired in chatAgent)
- ✗ Interactive report artifact (report page exists, follow-up Q&A not wired)
- ✗ MCP server (route scaffolded, not implemented)
- ✗ Batch nightly analysis (route scaffolded)
- ✗ Multiple body regions tested beyond shoulder (exercise library has all 6 but only shoulder questions in intake assessment step)

---

## Critical Fixes Before Demo

Priority order:

1. **Safety halt overlay** — add a full-screen halt modal in `session/page.tsx` that renders when `safetyHalt !== null`. This is the emotional peak of the demo.
2. **Narrator panel** — restore streaming entries to a visible side panel during exercise. `narratorEntries` is populated via `callNarrator()` — just needs to render.
3. **Verify form-critic** — check `analyzeRep()` in `src/agents/formCritic.ts` actually calls Claude and returns faults. Stub would silently fail.
4. **Intake assessment for non-shoulder regions** — `SHOULDER_QUESTIONS` hardcoded in IntakeView. If demoing knee, the questions still say "overhead reaching / dressing" which looks wrong.

---

## What to Focus On

### Must land
- **Narrator panel visibly streaming reasoning** during movement. This is the trust differentiator — no other demo will have this.
- **Safety halt latency.** Rehearse the phrase. Show a timer/latency badge if possible. Sub-300ms or it's not a story.
- **Citations in the plan.** Real study names, not hallucinated. Judges will check.
- **Memory tool answering a follow-up question.** The "ask the report" moment is the kicker.

### Nice to have
- Adaptive music tempo changing on fatigue detection
- Rep counter accuracy demo
- Between-session chat ("is this soreness normal?")

### Skip if short on time
- MCP server demo (mention it, don't live-demo it)
- Batch nightly analysis (slide only)
- Multiple body regions (stick to shoulder for demo — most exercises implemented)

---

## Technical Demo Risks

| Risk | Mitigation |
|---|---|
| MediaPipe pose jitter on demo laptop | Pre-test on actual demo machine, good lighting, plain background |
| ElevenLabs latency spike | Pre-warm the connection; fall back to browser TTS if >2s |
| Claude API rate limit mid-demo | Pre-cached session; have a recorded backup video ready |
| Safety halt overlay not built yet | **Fix this first** |
| Narrator panel not rendering | **Fix this second** |
| Prompt cache miss at session start | Warm cache 30s before going on stage |
| Auth breaks demo flow | Log in as demo user before going on stage, keep session cookie alive |

---

## Rehearsal Checklist

- [ ] Fix safety halt overlay (renders on `safetyHalt` state)
- [ ] Fix narrator panel rendering during exercise
- [ ] Verify form-critic agent actually calls Claude
- [ ] Run full demo end-to-end on the actual demo laptop
- [ ] Record a backup video of the full flow (in case of wifi death)
- [ ] Test with the exact trigger phrase for safety halt
- [ ] Verify all ElevenLabs voice IDs are on the correct account
- [ ] Confirm prompt cache hit rate on warm session (should be ~90%)
- [ ] Check MediaPipe works under stage lighting
- [ ] Have a second laptop mirrored as failover

---

## Talking Points (when judges ask)

- **"Why Claude and not just rules?"** — Every form correction is personalized to *this* patient's prior cue responses. A rules engine can't do that. Show the Cue Generator prompt pulling from memory.
- **"What about HIPAA?"** — Flagged as roadmap. Hackathon scope is clinical decision support, not diagnosis.
- **"Why three models?"** — Cost/latency tiering. Haiku for sub-300ms safety, Sonnet for the form loop, Opus where reasoning matters (intake, programming, report). Show the routing table.
- **"How does this scale to other body regions?"** — Exercise library already has 6 regions (105 exercises). Adding a region is adding assessment questions + a skill file, not rewriting the orchestrator.
- **"What's novel vs. existing PT apps?"** — Live streaming reasoning + memory across sessions + agent swarm coordination. Existing apps are video libraries with rep counters.

---

## Notes to Remember

- **Don't over-explain the architecture on stage.** Show it working. Architecture slide for 20 seconds max.
- **Let the narrator panel do the talking.** Silence while it streams is powerful.
- **The safety halt is the emotional beat.** Pause after it fires. Let it land.
- **End on the artifact Q&A.** The judge talking to the report is the memorable moment.
- **Use "All Clear" + "Auto-fill" buttons during demo intake** to skip questionnaire friction.
