# Vero — Hackathon Demo Running Doc

_Living doc. Revise freely. Last touched: 2026-04-19._

---

## One-Liner

Vero is a swarm of specialized Claude agents doing live physical therapy — pose, vision, music, and voice are just tools.

**The pitch in one sentence:** Every non-trivial decision is made by a Claude agent, not by app logic.

---

## Demo Flow (target: 5 min)

1. **Voice intake (60s)** — ElevenLabs conversation → `PatientProfile` + ranked `DifferentialDx[]` with cited reasoning. Show the differential resolver sub-agent firing when two hypotheses tie.
2. **Plan render** — Agent 2 output: exercises with research citations inline. Judges should see "this came from Claude, not a lookup table."
3. **Live session — squat set** — MediaPipe overlay + Clinical Narrator side panel streaming inner monologue ("noticing slight knee valgus on left side…").
4. **3 form faults caught** — knee valgus, forward lean, shallow depth. Each → emotion-conditioned ElevenLabs cue before the next rep.
5. **Safety halt** — scripted line: *"sharp shooting pain down my leg."* Safety Monitor (Haiku) halts in <300ms, refers out. This is the moment.
6. **Interactive artifact** — post-session report opens. Judge asks it *"why split squats?"* live. Claude answers from case notes memory.

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
- Multiple body regions (stick to knee for demo)

---

## Technical Demo Risks

| Risk | Mitigation |
|---|---|
| MediaPipe pose jitter on demo laptop | Pre-test on actual demo machine, good lighting, plain background |
| ElevenLabs latency spike | Pre-warm the connection; fall back to browser TTS if >2s |
| Claude API rate limit mid-demo | Pre-cached session; have a recorded backup video ready |
| Safety halt doesn't fire | Hard-code trigger phrase match as backup alongside Haiku stream |
| Narrator stream stalls | Keep narrator buffer so panel never appears empty |
| Prompt cache miss at session start | Warm cache 30s before going on stage |

---

## Rehearsal Checklist

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
- **"How does this scale to other body regions?"** — Skills system. `/skills/shoulder/SKILL.md` etc. — adding a region is adding a skill file, not rewriting the orchestrator.
- **"What's novel vs. existing PT apps?"** — Live streaming reasoning + memory across sessions + agent swarm coordination. Existing apps are video libraries with rep counters.

---

## Build Status

_Update as we go. Demo needs items 1–12 from CLAUDE.md build order._

- [ ] 1. Scaffold + MediaPipe overlay
- [ ] 2. Claude client w/ prompt caching + tool registry
- [ ] 3. Orchestrator SSE skeleton
- [ ] 4. Agent 1 intake + differential resolver
- [ ] 5. Exercise library gen (knee only for demo)
- [ ] 6. Agent 2 programming w/ citations
- [ ] 7. Local rule check + basic cueing
- [ ] 8. Form Critic w/ video-clip analysis
- [ ] 9. Safety Monitor parallel stream
- [ ] 10. Clinical Narrator side panel
- [ ] 11. Cue Generator (Haiku)
- [ ] 12. ElevenLabs voice
- [ ] Interactive artifact w/ follow-up Q&A (required for demo closer)

---

## Open Questions

- Do we need a recorded patient or live volunteer for the demo? (Live = more impressive, riskier.)
- Single-monitor or dual-monitor setup on stage?
- Do we show the narrator panel the whole time, or reveal it as a "look what Claude is thinking" moment?

---

## Notes to Remember

- **Don't over-explain the architecture on stage.** Show it working. Architecture slide for 20 seconds max.
- **Let the narrator panel do the talking.** Silence while it streams is powerful.
- **The safety halt is the emotional beat.** Pause after it fires. Let it land.
- **End on the artifact Q&A.** The judge talking to the report is the memorable moment.
