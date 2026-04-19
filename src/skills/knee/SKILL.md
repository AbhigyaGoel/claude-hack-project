# Knee Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy knee module.

## Special Tests (Pose-Based)

### Lachman Test (ACL Integrity)

**Setup:** Patient supine, knee flexed 20-30 degrees.
**Execution via pose:** Patient lies on back, places pillow under knee for slight bend. Cue patient to relax leg completely, then perform self-anterior drawer by pulling tibia forward (limited self-test accuracy; primarily used as interview/history correlator).
**Keypoint validation:** Confirm knee_flexion ~25 deg via landmarks 23-25-27 (hip-knee-ankle).
**Positive finding:** Patient reports excessive anterior translation or recalls "giving way" episodes.
**Interpretation:** ACL insufficiency. Gold standard clinical test. Sensitivity 87%, Specificity 93% (manual exam). Telehealth adaptation relies on history + functional testing.
**Functional surrogate:** Single-leg squat stability, lateral step-down control, pivot shift history.

### McMurray Test (Meniscal Pathology)

**Setup:** Patient supine, hip and knee fully flexed.
**Execution via pose:** Cue patient to pull knee to chest, then slowly straighten while rotating foot inward (lateral meniscus) and outward (medial meniscus).
**Keypoint validation:** Track knee_flexion from max to extension, ankle rotation angle.
**Positive finding:** Click/pop with pain at joint line during extension with rotation.
**Interpretation:** Meniscal tear. Sensitivity 61%, Specificity 84% (medial); 45%, 90% (lateral).

### Patellar Tracking Assessment

**Setup:** Patient seated with knee hanging over edge, or standing.
**Execution via pose:** Cue patient to slowly extend knee from 90 deg to full extension.
**Keypoint validation:** Track patella position relative to femoral midline via landmarks 25-26. Monitor for lateral deviation during terminal extension (J-sign).
**Positive finding:** Visible lateral tracking, J-sign (patella jumps laterally in last 30 deg of extension).
**Interpretation:** Patellofemoral dysfunction, VMO insufficiency, lateral retinacular tightness.

### Valgus Stress Test (MCL)

**Setup:** Knee at 0 deg and 30 deg flexion.
**Execution via pose:** Cue patient to stand on one leg. Observe knee alignment in frontal plane during single-leg stance and mini squat.
**Keypoint validation:** Measure knee valgus angle via hip-knee-ankle landmarks (23-25-27) in frontal plane.
**Positive finding:** Excessive medial gapping, dynamic valgus > 10 deg during single-leg squat.
**Interpretation:** MCL sprain (grade by laxity). Dynamic valgus also indicates hip weakness contribution.

### Varus Stress Test (LCL)

**Setup:** Same as valgus but opposite direction.
**Execution via pose:** Observe for lateral gapping in single-leg stance.
**Keypoint validation:** Measure varus angle in frontal plane.
**Positive finding:** Lateral gapping, lateral thrust during gait.
**Interpretation:** LCL / posterolateral corner injury (less common, often traumatic).

### Thessaly Test (Meniscal — Functional)

**Setup:** Patient standing on one leg, knee flexed 20 degrees.
**Execution via pose:** Cue patient to stand on affected leg with slight knee bend, then twist torso left and right.
**Keypoint validation:** Confirm single-leg stance, knee_flexion ~20 deg, trunk rotation.
**Positive finding:** Pain at joint line, locking, catching sensation.
**Interpretation:** Meniscal pathology (more functional than McMurray). Sensitivity 89%, Specificity 97%.

## Differential Diagnosis Decision Tree

```
Knee Pain
|
+-- Traumatic onset?
|   +-- YES:
|   |   +-- Non-contact pivot/deceleration -> ACL (Lachman, pivot shift history)
|   |   +-- Contact valgus force -> MCL +/- ACL (valgus stress)
|   |   +-- Twisting on planted foot -> Meniscal (McMurray, Thessaly)
|   |   +-- Direct patellar blow -> Patellar fracture/contusion (refer imaging)
|   |   +-- Hyperextension -> PCL (posterior sag sign)
|   |
|   +-- NO: Insidious onset -> continue
|
+-- Pain Location
|   +-- Anterior (front of knee)
|   |   +-- Worse with stairs/sitting -> Patellofemoral syndrome
|   |   +-- Swelling below kneecap -> Patellar tendinopathy
|   |   +-- Youth + tibial tubercle pain -> Osgood-Schlatter
|   |   +-- Crepitus + age >50 -> Patellofemoral OA
|   |
|   +-- Medial (inside)
|   |   +-- Joint line tenderness + locking -> Medial meniscus tear
|   |   +-- Diffuse medial + morning stiffness -> Medial compartment OA
|   |   +-- Below joint line + tenderness -> Pes anserine bursitis
|   |
|   +-- Lateral (outside)
|   |   +-- Runner + lateral femoral condyle pain -> IT band syndrome
|   |   +-- Joint line + locking -> Lateral meniscus tear
|   |   +-- Lateral compartment narrowing -> Lateral OA
|   |
|   +-- Posterior (back of knee)
|       +-- Popliteal swelling -> Baker's cyst (often secondary)
|       +-- Deep posterior pain -> PCL or posterior capsule
|
+-- Mechanical symptoms (locking, giving way, catching)?
    +-- Locking -> Meniscal tear, loose body
    +-- Giving way -> ACL, quadriceps weakness, patella subluxation
```

## Exercise-to-Finding Matching Matrix

| Finding | Phase 1 (Acute/Protected) | Phase 2 (Subacute) | Phase 3 (Strengthening/Return) |
|---|---|---|---|
| ACL insufficiency (conservative) | Quad sets, SLR, heel slides | Partial squats 0-60, step-ups, balance board | Full squats, lateral agility, plyometrics |
| ACL post-op (rehab) | Patellar mobs, quad sets, NMES-assisted SLR | CKC 0-90, bike, balance training | Running progression, sport-specific drills |
| Medial meniscus tear | AROM within comfort, quad sets, SLR | Mini squats, step-ups, hamstring curls | Full ROM strengthening, proprioception, agility |
| Patellofemoral syndrome | VMO isometrics, SLR, hip abduction | Terminal knee extension, lateral band walks, step-downs | Full squats (pain-free), single-leg progression |
| Patellar tendinopathy | Isometric quad holds (70 deg, 45s), hip strengthening | Eccentric decline squats, slow tempo squats | Heavy slow resistance, sport-specific loading |
| Knee OA | Gentle AROM, pool walking, stationary bike | Quad/ham strengthening, tai chi, step-ups | Progressive resistance, functional training |
| IT band syndrome | Foam rolling (indirect), hip abductor strengthening | Side-lying hip abduction, clamshells, lateral step-ups | Single-leg squats, running gait retraining |
| MCL sprain (grade I-II) | Protected AROM, quad sets, SLR | Progressive ROM, CKC strengthening | Full strengthening, lateral movement, sport return |

## Red Flags (Immediate Referral)

- **Locked knee** (unable to fully extend) -> mechanical block, possible bucket-handle meniscal tear
- **Acute hemarthrosis** (rapid swelling within 2 hours) -> ACL tear, fracture, or patellar dislocation
- **Hot, red, swollen joint** without trauma -> septic arthritis (emergency), gout, pseudogout
- **Fever + joint swelling** -> septic joint (emergency, do not delay)
- **Severe deformity** post-trauma -> fracture/dislocation (refer emergency)
- **Progressive neurological deficit in leg** -> lumbar pathology masquerading as knee pain
- **Inability to weight-bear** (4 steps) post-trauma -> Ottawa knee rules, refer imaging
- **Popliteal pain + calf swelling** -> DVT screen (refer urgently)
- **Night pain not position-dependent** + age >50 + history of cancer -> metastatic screen

## Progression Criteria

Advance to next phase when ALL met for 3 consecutive sessions:
1. Pain during exercise <= 3/10
2. No effusion increase after sessions
3. Form quality >= 80% (especially no dynamic valgus)
4. RPE < 5/10 at current load
5. Quad strength symmetry > 70% (phase 2->3), > 85% (phase 3->return to sport)

## Regression Criteria

Regress when ANY occur:
1. Pain during exercise > 5/10
2. Effusion increase (reported swelling post-session)
3. New or increased locking/giving way episodes
4. Dynamic valgus > 10 deg during single-leg squat despite cueing
5. Form quality < 50% consistently
6. KOOS score worsening >= 8 points

## Clinical Notes

- **Dynamic valgus:** The most common compensatory pattern in knee rehabilitation. Always assess hip abductor and external rotator strength when valgus is present.
- **Quad inhibition:** Post-injury/surgical quadriceps arthrogenic muscle inhibition is common. NMES may be indicated (refer to supervising PT).
- **Bilateral comparison:** Always compare affected to unaffected side for ROM, strength, and movement quality baselines.
- **Kinetic chain:** Knee pain frequently has contributions from hip weakness or ankle mobility deficits. Screen above and below.
- **Running return:** Do not progress to running until single-leg squat is pain-free with good form, hop testing > 90% limb symmetry index.
