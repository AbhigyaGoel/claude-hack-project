# Cervical Spine Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy cervical module.
> This skill is loaded by the orchestrator agent to guide assessment, differential diagnosis,
> exercise prescription, and safety screening for all cervical spine presentations.

---

## 1. Region Overview

### Functional Anatomy

- **Cervical Disc:** Smaller and thinner than lumbar discs. Uncovertebral joints (joints of Luschka) at C3-C7 laterally border the disc and are a common source of foraminal stenosis with degeneration. Disc herniations are less common than lumbar but can cause significant radiculopathy. Posterolateral herniations most common due to posterior longitudinal ligament reinforcement centrally.
- **Facet (Zygapophyseal) Joints:** Oriented ~45 deg from horizontal in coronal plane, allowing significant flexion/extension and rotation but limiting lateral flexion. Each facet joint has a characteristic referral pattern: C2-3 refers to occiput, C3-4 to posterolateral neck, C4-5 to angle of neck/upper trapezius, C5-6 to supraspinous fossa/lateral deltoid, C6-7 to medial scapula/interscapular region.
- **Nerve Roots:** C1-C7 roots exit ABOVE their numbered vertebra (e.g., C6 root exits above C6 pedicle). C8 root exits below C7 pedicle. This is the opposite convention from lumbar. Posterolateral disc at C5-6 compresses the C6 root.
- **Vertebral Arteries:** Ascend through transverse foramina of C6-C1, then loop over C1 posterior arch before entering foramen magnum. Vulnerable to compression with cervical extension + rotation. Must screen before any aggressive cervical ROM exercises.
- **Key Stabilizers:** Deep neck flexors (longus colli, longus capitis) provide anterior segmental stability analogous to multifidus posteriorly. Deep neck flexor dysfunction is present in virtually ALL cervical pain conditions. Semispinalis cervicis and multifidus provide posterior segmental control. Global muscles (SCM, upper trapezius, levator scapulae, scalenes) provide movement but often become overactive, compensating for deep stabilizer inhibition.

### Common Pathologies and Prevalence

| Pathology | Prevalence | Peak Age | Key Feature |
|---|---|---|---|
| Mechanical neck pain (nonspecific) | 30-50% annual prevalence | 30-50 | No radicular symptoms, ROM limitation |
| Cervical radiculopathy | 83/100,000 annual incidence | 50-54 | Dermatomal arm symptoms, myotomal weakness |
| Whiplash-Associated Disorder (WAD) | ~300/100,000 after MVA | 20-40 | Trauma onset, graded classification |
| Cervicogenic headache | 15-20% of all chronic headaches | 30-50 | Unilateral, starts in neck, no aura |
| Cervical spondylotic myelopathy | 1.6/100,000 | >55 | Upper motor neuron signs, gait changes |
| Thoracic outlet syndrome | 3-80/1,000 (debated) | 20-40 | Arm/hand symptoms with overhead positions |
| Upper crossed syndrome | Extremely common (postural) | Any (desk workers) | Forward head, rounded shoulders, weak DNF |

---

## 2. Special Tests (Pose-Based)

### 2.1 Spurling's Test — Cervical Radiculopathy

**Setup:** Patient seated, head in neutral.
**Execution via pose:** (1) Cue patient to laterally flex head toward painful side (ear to shoulder), (2) add slight cervical extension (look up slightly), (3) apply gentle self-compression by pressing down on top of head with both hands interlocked.
**MediaPipe landmarks:** Head lateral flexion measured via ear-to-shoulder distance (landmark 7/8 to 11/12). Cervical extension via nose-to-shoulder angle (landmark 0 relative to midpoint of 11-12).
**Positive finding:** Reproduction of concordant RADICULAR arm pain (not just neck pain) in dermatomal distribution.
**Sensitivity/Specificity:** Sensitivity 50%, specificity 86%. LOW sensitivity means a negative test does NOT rule out radiculopathy. HIGH specificity means a positive test is highly diagnostic.
**Modification:** If negative in ipsilateral lateral flexion, repeat with contralateral lateral flexion (may compress opposite root in central/foraminal stenosis).

### 2.2 Upper Limb Tension Test (ULTT) — Neural Tension

Four variants targeting different nerves:

| Test | Nerve | Position Sequence |
|---|---|---|
| ULTT1 (median) | Median nerve | Shoulder depression + abduction 110 deg + supination + wrist/finger extension + elbow extension + cervical lateral flexion away |
| ULTT2a (median) | Median nerve (variant) | Shoulder depression + elbow extension + wrist/finger extension + shoulder lateral rotation + abduction |
| ULTT2b (radial) | Radial nerve | Shoulder depression + elbow extension + wrist/finger flexion + forearm pronation + shoulder IR + abduction |
| ULTT3 (ulnar) | Ulnar nerve | Shoulder depression + elbow flexion + wrist/finger extension + forearm pronation + shoulder abduction + cervical lateral flexion away |

**Execution via pose (ULTT1 primary):** Cue patient to depress shoulder (shrug down), abduct arm to 110 deg, turn palm up, extend wrist and fingers, then slowly straighten elbow. Finally, tilt head away from tested side.
**MediaPipe landmarks:** Shoulder abduction via landmark 11-13 or 12-14 angle. Elbow extension via landmarks 13-15 or 14-16. Wrist extension estimated via wrist-finger landmarks 15-19 or 16-20.
**Positive finding:** Reproduction of concordant arm/hand symptoms. Structural differentiation: symptoms change with cervical lateral flexion (adding or releasing).
**Sensitivity/Specificity:** ULTT1 median nerve: sensitivity 97%, specificity 22%. Excellent screening test.

### 2.3 Sharp-Purser Test — Atlantoaxial Instability

**SAFETY TEST — perform before any upper cervical assessment or exercise.**
**Setup:** Patient seated, head in slight flexion.
**Execution via pose:** Patient flexes head (chin to chest), then self-applies gentle posterior glide to forehead with palm while feeling for a "clunk" at C1-C2.
**Positive finding:** Palpable shift or slide with relief of symptoms. Sense of head "sliding back into place."
**Interpretation:** Atlantoaxial instability, possible transverse ligament insufficiency. Sensitivity 69%, specificity 96%.
**Action if positive:** STOP all cervical exercises. Refer for flexion-extension radiographs. Atlantodental interval >3mm in adults = instability. Common in rheumatoid arthritis and Down syndrome.

### 2.4 Cervical Rotation ROM Assessment — Bilateral Comparison

**Setup:** Patient seated, head in neutral, shoulders relaxed.
**Execution via pose:** Cue patient to slowly rotate head fully to the left, return to center, then fully to the right. Perform 3 repetitions each direction.
**MediaPipe landmarks:** Rotation measured via nose landmark (0) position relative to shoulder midpoint (11-12). Full rotation estimated by nose-to-shoulder distance ratio. Compare left vs. right.
**Normal values:** 70-90 deg bilateral rotation. Asymmetry >10 deg is clinically significant.
**Interpretation:** Reduced rotation + headache = screen for cervicogenic headache (use flexion-rotation test). Reduced rotation after trauma = WAD sign. Bilateral loss = generalized degeneration or systemic condition.

### 2.5 Deep Neck Flexor Endurance Test (Craniocervical Flexion Test)

**Setup:** Patient supine, no pillow, knees bent.
**Execution via pose:** Cue patient to perform a chin tuck (craniocervical flexion, NOT cervical flexion — "nod yes gently, making a double chin"), then lift head just barely off surface (1-2 cm). Hold as long as possible. Time the hold.
**MediaPipe landmarks:** Head position tracked via landmark 0 (nose) elevation from baseline. Ensure craniocervical flexion (chin tuck) is maintained, not cervical flexion (lifting with SCM). SCM compensation detected via forward translation of chin (landmark 0 moving anteriorly rather than superiorly).
**Normal values:** 30-39 seconds = fair. 40+ seconds = good. <20 seconds = significant deficit.
**Positive finding:** Hold time <20 seconds or substitution with superficial flexors (SCM) = deep neck flexor inhibition/weakness. Present in nearly 100% of chronic neck pain patients.
**Sensitivity/Specificity:** Discriminates neck pain patients from controls: sensitivity 82%, specificity 89%.

### 2.6 Vertebral Artery Test — Safety Screen

**CRITICAL SAFETY TEST — perform BEFORE any cervical extension, rotation, or combined exercise.**
**Setup:** Patient seated, clinician standing behind (or patient self-administering with caution).
**Execution via pose:** (1) Patient slowly rotates head fully to one side, holds 10 seconds. (2) Then adds cervical extension (looks up while rotated). Hold 10 seconds. (3) Return to neutral. (4) Repeat opposite side. Monitor for symptoms throughout.
**MediaPipe landmarks:** Head rotation via landmark 0 relative to 11-12. Cervical extension via nose elevation and head tilt angle. Ensure SLOW controlled movement (flag if velocity exceeds threshold).
**Positive finding (5 D's and N):** Dizziness, diplopia (double vision), dysarthria (slurred speech), dysphagia (difficulty swallowing), drop attack (sudden fall), nausea/nystagmus.
**Action if positive:** STOP ALL cervical exercises involving rotation or extension on that side. Flag as red flag. Refer to physician for vascular workup. Document which side and position provoked symptoms.
**Sensitivity/Specificity:** Low sensitivity (~60%) but critical safety value. False negatives are possible — maintain vigilance during all cervical exercises.

### 2.7 Cranial Cervical Flexion Test (CCFT) — Motor Control

**Setup:** Patient supine, pressure biofeedback unit (PBU) behind neck inflated to 20 mmHg. (For telehealth: use towel roll and self-palpation.)
**Execution via pose:** Patient performs progressive craniocervical flexion through 5 stages (22, 24, 26, 28, 30 mmHg on PBU). At each stage, hold 10 seconds. Assess highest level achievable with clean technique (no SCM substitution).
**MediaPipe landmarks (telehealth adaptation):** Chin tuck depth measured as posterior translation of chin (landmark 0) relative to ears (landmarks 7-8). Track head anterior-posterior position. SCM substitution detected as chin moving anteriorly or head lifting excessively.
**Positive finding:** Inability to achieve 26+ mmHg without SCM substitution, inability to hold 10 seconds.
**Interpretation:** Deep neck flexor motor control deficit. Foundational exercise target for virtually all cervical conditions.

### 2.8 Cervical Flexion-Rotation Test (FRT) — Cervicogenic Headache

**Setup:** Patient supine, head off edge of bed or fully supported.
**Execution via pose:** Cue patient to flex neck fully (chin to chest, maximum cervical flexion), then from this fully flexed position, rotate head to each side.
**MediaPipe landmarks:** Cervical flexion confirmed by chin-to-chest proximity (landmark 0 approaching landmarks 11-12 midpoint). Rotation in flexion measured by nose position relative to shoulder line.
**Normal values:** >= 44 deg rotation each direction in full flexion. Asymmetry or limitation <32 deg on one side = positive.
**Positive finding:** Rotation <32 deg to one side with reproduction of concordant headache.
**Interpretation:** C1-C2 hypomobility, strongly associated with cervicogenic headache. Sensitivity 91%, specificity 90% for cervicogenic headache diagnosis.
**Differentiation:** Migraine and tension-type headache patients have NORMAL flexion-rotation test results.

---

## 3. Differential Diagnosis Decision Tree

```
NECK PAIN PRESENTATION
|
+-- RED FLAGS PRESENT? --> IMMEDIATE REFERRAL (see Section 6)
|   - Myelopathy signs (bilateral hand clumsiness, gait ataxia, UMN signs)
|   - Vertebral artery symptoms (5 D's and N)
|   - Drop attacks, syncope with cervical movement
|   - Severe trauma + neck pain
|   - Fever + neck stiffness
|   - Lhermitte's sign
|
+-- TRAUMA HISTORY?
|   +-- YES (MVA, fall, impact):
|   |   +-- Canadian C-Spine Rules: Age >65, dangerous mechanism, paresthesias in extremities
|   |   |   --> YES to any = imaging before PT
|   |   +-- Classify WAD Grade:
|   |       +-- WAD I: Complaint only, no objective signs
|   |       +-- WAD II: Complaint + MSK signs (ROM loss, tenderness)
|   |       +-- WAD III: Complaint + neurological signs (weakness, sensory loss, reflex change)
|   |       +-- WAD IV: Fracture/dislocation --> REFER, no PT until cleared
|   |       +-- Screen for concurrent concussion (common with WAD, especially MVA)
|   |
|   +-- NO (insidious onset) --> continue below
|
+-- RADICULAR ARM SYMPTOMS (dermatomal pattern)?
|   +-- YES:
|   |   +-- Spurling's positive --> Cervical radiculopathy (HIGH confidence)
|   |   +-- ULTT positive + Spurling negative --> Neural tension, possible proximal entrapment
|   |   +-- Map to nerve root level:
|   |   |   - C5: deltoid weakness, lateral arm numbness, biceps reflex diminished
|   |   |   - C6: biceps/wrist extensor weakness, thumb/index numbness, brachioradialis reflex diminished
|   |   |   - C7: triceps/wrist flexor weakness, middle finger numbness, triceps reflex diminished
|   |   |   - C8: grip weakness, ring/small finger numbness, no reliable reflex
|   |   |   - T1: interossei weakness, medial arm numbness
|   |   +-- BILATERAL arm symptoms + gait disturbance + hand clumsiness:
|   |       --> Cervical myelopathy (URGENT referral, do NOT treat conservatively)
|   |
|   +-- NO: Axial neck pain only --> continue below
|
+-- HEADACHE COMPONENT?
|   +-- YES:
|   |   +-- Unilateral, starts in neck/suboccipital, NO aura, NO nausea/photophobia:
|   |   |   +-- Flexion-Rotation Test positive (<32 deg one side) --> Cervicogenic headache
|   |   |   +-- C1-C2 rotation restriction + suboccipital tenderness --> Upper cervical dysfunction
|   |   |
|   |   +-- Unilateral, WITH aura and/or nausea/photophobia/phonophobia:
|   |   |   --> Migraine (refer neurology, may coexist with cervicogenic)
|   |   |
|   |   +-- Bilateral, band-like, NO aura, associated with stress/posture:
|   |   |   --> Tension-type headache (may have cervical component)
|   |   |
|   |   +-- Sudden severe "thunderclap" headache + neck pain:
|   |       --> EMERGENCY: vertebral artery dissection or SAH (call 911)
|   |
|   +-- NO: continue below
|
+-- PAIN PATTERN AND AGGRAVATING FACTORS
|   +-- Central posterior neck pain:
|   |   +-- Worse with extension + rotation --> Facet arthropathy
|   |   |   Map referral: C2-3=occiput, C3-4=posterolateral neck, C4-5=upper trap,
|   |   |   C5-6=supraspinous fossa, C6-7=medial scapula
|   |   +-- Worse with flexion (less common) --> Discogenic pain
|   |   +-- Morning stiffness >60 min + age <40 --> Inflammatory (refer rheumatology)
|   |
|   +-- Unilateral neck + periscapular referral:
|   |   +-- Myofascial trigger points (upper trap, levator, rhomboids) --> Myofascial pain
|   |   +-- Facet referral pattern match --> Facet-mediated referral
|   |
|   +-- Arm/hand symptoms WITHOUT dermatomal pattern:
|   |   +-- Worse overhead + hands, numbness in ulnar distribution:
|   |   |   --> Thoracic outlet syndrome screening
|   |   |   - Roos test: open/close fists with arms in 90/90 for 3 min
|   |   |   - Adson's test: radial pulse with head rotation + deep breath
|   |   +-- Diffuse arm heaviness, non-dermatomal numbness:
|   |       --> Somatic referral, double crush syndrome, TOS
|   |
|   +-- Forward head posture + rounded shoulders + weak scapular retractors:
|       --> Upper crossed syndrome
|       - Tight: upper trapezius, levator scapulae, SCM, pectorals, suboccipitals
|       - Weak: deep neck flexors, lower trapezius, serratus anterior, rhomboids
|
+-- INSTABILITY SCREENING
    +-- Sharp-Purser positive (C1-C2) --> Atlantoaxial instability, REFER
    +-- History of RA, Down syndrome, trauma --> Higher suspicion for ligamentous instability
    +-- Feeling of "giving way," clicking, apprehension with movement:
        --> Muscular instability (DNF deficit), may respond to stabilization if ligamentous tests negative
```

---

## 4. Exercise-to-Finding Matrix

| Finding | Phase 1 (Acute, 0-2 wk) | Phase 2 (Subacute, 2-6 wk) | Phase 3 (Strengthening, 6-12 wk) | Phase 4 (Return to Function, 12+ wk) |
|---|---|---|---|---|
| **Cervical radiculopathy** | Neural glides (median/radial/ulnar per level), gentle AROM in pain-free range, chin tucks, postural taping | Progressive AROM all directions, isometric cervical strength (multidirectional), scapular stabilization (rows, Ys) | Cervical strengthening with resistance band, cervicothoracic integration, nerve tensioning (progress from glides) | Functional integration, sport/work-specific, overhead tolerance, ergonomic independence |
| **Mechanical neck pain** | Gentle AROM within pain-free range, chin tucks (craniocervical flexion), postural education, heat if muscle guarding | Progressive ROM, isometric multidirectional holds (4-way), upper trapezius/levator stretching, thoracic extension mobility | Deep neck flexor endurance training (CCFT progression), cervicothoracic strengthening, loaded carries (farmer walks) | Functional capacity, gym integration, sport return, self-management program |
| **WAD Grade I** | Education (recovery expected), early pain-free AROM (within 72 hr), relaxation/diaphragmatic breathing, NO collar | Progressive ROM, graded isometrics, gentle aerobic exercise (walking, stationary bike) | Full cervical strengthening program, proprioceptive retraining (joint position sense), functional tasks | Full return to activity, self-management, flare management plan |
| **WAD Grade II** | Early active movement (critical), AROM within tolerance, postural correction, pain education, minimize collar (<72 hr if any) | Progressive loading, cervical isometrics, aerobic exercise, scapular stabilization, motor control | Cervical strengthening with resistance, proprioception, functional capacity evaluation | Full return to work/sport, graded exposure if fear-avoidance present |
| **WAD Grade III** | As WAD II + neural glide protocol per involved root, neurological monitoring each session, ULTT re-assessment | Progressive as tolerated with ongoing neuro monitoring, nerve glide to tensioner progression | Cervical strengthening, nerve tension normalization, functional integration | Full return with ongoing neuro monitoring, discharge when stable 4+ weeks |
| **Cervicogenic headache** | Suboccipital self-release (tennis ball at occiput), chin tucks, C1-C2 SNAG self-mobilization (towel), postural correction | C1-C2 rotation self-mobilization, deep neck flexor training (CCFT), upper cervical AROM, thoracic extension | DNF endurance building (goal 40+ sec), cervicothoracic strengthening, postural endurance (sustained positioning) | Ergonomic independence, trigger management, maintenance exercise program, headache diary self-monitoring |
| **Facet arthropathy** | Avoid end-range extension + rotation combined, gentle rotation AROM, chin tucks, cervical lateral flexion stretching | Progressive AROM all directions, isometric strengthening, thoracic mobility (extension + rotation) | Cervical strengthening with resistance, functional ROM training, postural endurance | Full movement restoration, sport-specific rotation, maintenance |
| **Thoracic outlet syndrome** | Postural correction (retract + depress shoulders), scalene stretching, pectoralis minor stretching, first rib self-mobilization | Neural glides (ULTT-based), scapular retraction/depression strengthening (low rows, Ys, prone Ts), thoracic extension | Strengthening in corrected posture, overhead work progression, loaded carries, functional reaching | Full overhead tolerance, sport/work return, ergonomic independence |
| **Upper crossed syndrome** | Stretch tight: upper trap, levator, pecs, suboccipitals. Activate weak: chin tucks (DNF), scapular retraction | Progressive strengthening: lower trap, serratus anterior, deep neck flexors. Thoracic extension mobility | Band pull-aparts, face pulls, prone Y/T/W, loaded carries, wall slides | Postural endurance, gym program integration, ergonomic independence |

---

## 5. Angle Windows per Exercise

| Exercise | Target Landmarks | Ideal Angle/Position | Compensation to Flag |
|---|---|---|---|
| **Chin Tuck (seated)** | Posterior translation of chin relative to ears | 2-4 cm posterior glide, NO cervical flexion/extension | Forward head poke (SCM substitution), cervical flexion (nodding too far), jaw clenching |
| **Chin Tuck (supine — CCFT)** | Craniocervical flexion, head lift 1-2 cm | Chin-to-throat angle decreases 5-10 deg from neutral, head elevation <3 cm | Cervical flexion (lifting head with SCM), platysma activation, breath holding |
| **Cervical Rotation AROM** | Head rotation relative to shoulders | 70-90 deg each direction, symmetry within 10 deg | Thoracic rotation substitution (shoulders turning), shoulder elevation, pain face |
| **Cervical Lateral Flexion AROM** | Ear toward shoulder | 45-50 deg each direction, symmetry within 10 deg | Shoulder hiking (shoulder meeting ear rather than ear to shoulder), trunk lateral flexion |
| **Cervical Flexion AROM** | Chin to chest | 60-70 deg, chin should approach or touch sternum | Thoracic flexion substitution, slumping trunk rather than cervical flexion |
| **Cervical Extension AROM** | Face toward ceiling | 60-70 deg, nose should point toward ceiling | Only perform after NEGATIVE vertebral artery screen. Upper cervical hinging rather than distributed extension |
| **Isometric Hold (4-way)** | Head position maintained against resistance | Neutral cervical position, 0 deg movement during hold, 5-10 sec per direction | Visible head movement (should be isometric), breath holding, excessive effort (grimacing) |
| **Scapular Retraction** | Scapulae toward midline | Interscapular distance decreases 2-4 cm, scapulae within 5-7 cm of midline | Shoulder elevation (upper trap dominance), cervical extension, lumbar extension |
| **Prone Y-Raise** | Arms overhead in Y position, prone | Shoulder flexion 120-140 deg (Y shape), thumbs up, scapulae depressed and retracted | Shoulder shrugging, lumbar hyperextension, cervical hyperextension |
| **Wall Slide** | Arms sliding up wall, back flat | Elbows and wrists maintain wall contact throughout, shoulder flexion to 140-160 deg | Loss of wall contact (elbows/wrists), lumbar extension, head forward poke |

### Cervical ROM Normative Values (reference for progress tracking)

| Movement | Normal Range | Clinical Significance Threshold |
|---|---|---|
| Flexion | 60-70 deg | <45 deg = significant restriction |
| Extension | 60-70 deg | <45 deg = significant restriction |
| Rotation (each side) | 70-90 deg | Asymmetry >10 deg or <50 deg = significant |
| Lateral flexion (each side) | 45-50 deg | Asymmetry >10 deg or <30 deg = significant |

---

## 6. Red Flags — Detailed Criteria

### Cervical Myelopathy (URGENT — refer within 24-48 hours)

Screen for ALL of the following. Pattern of 2+ findings = high suspicion:
- **Hand clumsiness:** Difficulty with buttons, dropping objects, handwriting deterioration (myelopathy hand sign)
- **Gait disturbance:** Wide-based gait, unsteadiness, feeling "drunk" when walking, balance problems
- **Bilateral upper extremity symptoms:** Bilateral hand numbness, weakness (NOT dermatomal — diffuse, glove-like)
- **Lower extremity signs:** Leg stiffness, spasticity, hyperreflexia in legs, positive Babinski sign
- **Bowel/bladder dysfunction:** Late sign, urinary urgency/frequency, retention, incontinence
- **Lhermitte's sign:** Electric shock sensation radiating down spine and into extremities with cervical flexion
- **Hoffmann's sign:** Flicking middle finger distal phalanx produces reflex flexion of thumb and index finger

**Critical:** Myelopathy is a SURGICAL condition. Conservative PT can worsen it. Do NOT mobilize or manipulate. Refer for MRI and surgical consultation.

### Vertebral Artery Dissection (EMERGENCY — call 911)

- Sudden severe headache + neck pain (especially unilateral posterior)
- 5 D's and N: dizziness, diplopia, dysarthria, dysphagia, drop attack, nausea/nystagmus
- Horner's syndrome (ptosis, miosis, anhidrosis) ipsilateral
- History of cervical manipulation, trauma, or rapid head movement
- Young patient (<50) with sudden stroke-like symptoms + neck pain

**Critical timing:** This is a stroke or pre-stroke emergency. Do NOT perform any cervical examination. Call emergency services immediately.

### Other Red Flags

| Red Flag | Suspicion | Action | Urgency |
|---|---|---|---|
| Fever + neck stiffness + headache | Meningitis, epidural abscess | Halt session, refer ER | EMERGENCY |
| Progressive neurological deficit (worsening weakness/numbness over days) | Expanding lesion, progressive myelopathy | Halt session, refer | URGENT (same day) |
| Severe trauma + neck pain + not meeting Canadian C-Spine Rules | Fracture, ligamentous injury | Halt session, refer for imaging | URGENT |
| Lhermitte's sign (electric shock with neck flexion) | Myelopathy, MS, cervical cord compression | Halt session, refer for MRI | URGENT |
| Upper motor neuron signs (clonus, spasticity, pathological reflexes, Babinski, Hoffmann) | Myelopathy | Halt session, refer | URGENT |
| Neck mass, lymphadenopathy | Malignancy, infection, systemic disease | Refer for medical evaluation | SOON (this week) |
| Cancer history + new neck pain | Metastatic disease (especially lung, breast, prostate) | Halt session, refer oncology | URGENT |
| Bilateral arm symptoms + gait change | Myelopathy | Full myelopathy screen | URGENT |
| Pulsatile tinnitus + neck pain | Vascular dissection, AV fistula | Refer for vascular workup | URGENT |
| Sudden onset torticollis in child/adolescent | Atlantoaxial rotatory subluxation, retropharyngeal abscess | Refer ER | URGENT |

---

## 7. WAD Classification and Management

### Classification System (Quebec Task Force)

| Grade | Clinical Features | Expected Recovery | PT Approach |
|---|---|---|---|
| **WAD I** | Neck complaint (pain, stiffness, tenderness), NO objective signs | 85-90% recover within 3 months | Education, reassurance, early active movement, avoid collar |
| **WAD II** | Neck complaint + MSK signs (decreased ROM, point tenderness, muscle spasm) | 70-80% recover within 3-6 months | Active exercise program, graded return to activity, monitor for chronicity risk |
| **WAD III** | Neck complaint + neurological signs (decreased/absent DTRs, weakness, sensory deficits) | Variable, may need longer recovery | As WAD II + neural monitoring, nerve glides, imaging warranted, may need specialist |
| **WAD IV** | Fracture or dislocation | Surgical/medical management first | PT ONLY after orthopedic clearance and stability confirmed |

### Key WAD Management Principles

1. **Early active movement (within 72 hours)** produces significantly better outcomes than immobilization. Level 1 evidence.
2. **Collar use should be minimized.** If used at all, limit to <72 hours. Prolonged collar use leads to muscle atrophy, stiffness, and delayed recovery.
3. **Exercise is the primary treatment.** Passive modalities (ice, heat, ultrasound) should supplement, not replace, active exercise.
4. **Screen for chronicity risk factors** at initial assessment:
   - High initial pain intensity (VAS >7/10)
   - High initial disability (NDI >40%)
   - Post-traumatic stress symptoms (hypervigilance, re-experiencing, avoidance)
   - Catastrophizing (Pain Catastrophizing Scale >24)
   - Cold hyperalgesia (widespread pain processing changes)
   - Prior neck pain history
   - Litigation involvement (modest effect)
5. **Graded motor imagery** if significant movement fear or allodynia develops.
6. **Concurrent concussion screening** is essential. 40-50% of MVA-related WAD patients have concurrent mild TBI. Screen with SCAT5 or equivalent. Presence of concussion changes exercise prescription (avoid exertion that increases headache, balance retraining priority).
7. **Return-to-work planning** should begin early. Prolonged work absence >6 weeks predicts chronicity.

---

## 8. Progression and Regression Criteria

### Progression Criteria (advance phase when ALL met for 3 consecutive sessions)

1. Pain during prescribed exercises <= 3/10
2. No new or worsening radicular arm symptoms during or after session
3. Cervical AROM >= 75% of expected normal (or improving trend of 5+ deg per week)
4. Form quality >= 80% (chin tuck maintained, no forward head posture during exercises, correct scapular position)
5. RPE during exercises < 5/10
6. NDI score improving or stable
7. Negative vertebral artery screen confirmed (re-test before adding extension/rotation loading in each new phase)
8. No headache exacerbation lasting >2 hours post-session
9. Deep neck flexor hold time improving (or at target >= 30 sec)

### Regression Criteria (regress when ANY occur)

1. New or worsening radicular symptoms (change in dermatomal pattern, new weakness)
2. Dizziness or ANY VBI symptom during exercises (5 D's and N)
3. Pain during prescribed exercises > 5/10
4. New neurological findings (weakness, numbness changes, reflex changes)
5. Headache exacerbation following cervical exercises lasting >4 hours
6. NDI worsening >= 5 points (exceeds MCID)
7. Form quality < 50% (excessive forward head posture, guarding, unable to maintain corrections)
8. New upper motor neuron signs at any time (immediate halt and refer)
9. Patient reports new Lhermitte's sign (immediate halt and refer)
10. Fear-avoidance escalation (refusing previously tolerated exercises, catastrophizing increase)

---

## 9. Clinical Pearls

### Deep Neck Flexors Are the "Core" of the Cervical Spine
Deep neck flexor (DNF) endurance training is the evidence-based cornerstone for virtually ALL cervical conditions. DNF inhibition is present in mechanical neck pain, radiculopathy, WAD, cervicogenic headache, and upper crossed syndrome. The craniocervical flexion test (CCFT) is both assessment and treatment. Train toward 40+ second hold at 26+ mmHg. This is the highest-yield exercise for cervical patients.

### Thoracic Spine Contribution — Always Assess
Reduced thoracic extension forces compensatory cervical hyperextension and increased cervical segmental motion. Include thoracic extension mobility in EVERY cervical program. Key exercises: thoracic extension over foam roller, prone thoracic extension (book openers), seated thoracic rotation. Research shows thoracic manipulation provides immediate and short-term benefit for mechanical neck pain even without direct cervical treatment.

### Screen for Concurrent Concussion
In WAD patients (especially MVA), 40-50% have concurrent mild TBI. Symptoms overlap significantly (headache, dizziness, concentration difficulty, fatigue). Screen with SCAT5. If concussion present: (1) modify exercise intensity (no exertion that increases symptoms), (2) add vestibulo-ocular rehabilitation, (3) balance retraining, (4) gradual return-to-activity protocol.

### Ergonomic Prescription — Be Specific
Generic advice ("sit up straight") is ineffective. Provide specific measurable recommendations:
- Monitor/screen at eye level (top of screen at eye height, not center)
- Screen distance: arm's length (50-70 cm)
- Elbows at 90 deg, forearms supported
- Feet flat on floor, knees at 90 deg
- Lumbar support maintaining lordosis
- Phone at eye level (not in lap — "text neck" produces ~27 kg of cervical load at 60 deg flexion)
- Movement breaks every 30 minutes (stand, chin tuck, shoulder rolls)
- Headset for phone calls (no cradling)

### Pillow Advice
Cervical patients should avoid prone sleeping (forces sustained cervical rotation). Recommend:
- Side-lying: pillow height should fill the gap between ear and mattress (shoulder width). Cervical spine should remain neutral (not side-bent).
- Supine: contoured cervical pillow supporting lordosis. Pillow should NOT push head into flexion (too thick) or allow extension (too thin).
- Test: in side-lying, another person should verify the spine is straight from behind.

### Psychosocial Factors — Screen Early
Cervical pain has strong associations with psychological distress, work dissatisfaction, and catastrophizing. Yellow flags predict chronicity more reliably than imaging findings. Screen with:
- Pain Catastrophizing Scale (PCS): score >24 = high catastrophizing
- Tampa Scale of Kinesiophobia (TSK): score >37 = high fear-avoidance
- PHQ-9 for depression screening
- Address through pain neuroscience education, graded exposure, and referral to psychology when appropriate.

### Cervicogenic Dizziness
Common post-whiplash. Differentiate from BPPV (Dix-Hallpike test) and VBI (vertebral artery test). Cervicogenic dizziness features: provoked by cervical movement, associated with neck pain, no nystagmus, normal neurological exam. Treat with joint position sense retraining (laser pointer on head tracking targets), cervical proprioceptive exercises, and graded cervical ROM.

---

## 10. Outcome Measures

### Neck Disability Index (NDI)

- **Scoring:** 10 questions, each scored 0-5. Total = (sum / 50) x 100 = percentage disability.
- **Interpretation:**
  - 0-8%: No disability
  - 10-28%: Mild disability
  - 30-48%: Moderate disability
  - 50-68%: Severe disability
  - 70-100%: Complete disability
- **MCID (Minimal Clinically Important Difference):** 5 points (percentage points) for individual patient change. Some sources cite 7.5 points.
- **MDC (Minimal Detectable Change):** 10.5 points at 90% confidence
- **Frequency:** Administer at intake, then every 2-4 weeks
- **Decision threshold:** If NDI unchanged after 6 sessions, reassess diagnosis and approach

### Numeric Pain Rating Scale (NPRS)

- **MCID:** 2 points on 0-10 scale for neck pain
- **MDC:** 2.5 points
- **Track:** Current pain, worst pain in last 24h, best pain in last 24h, average pain in last week
- **Location mapping:** Distinguish neck pain from arm pain from headache — track each separately

### Patient-Specific Functional Scale (PSFS)

- **Scoring:** Patient identifies 3-5 activities limited by condition, rates each 0-10
- **MCID:** 2 points per activity, 3 points for average score
- **Common cervical activities to track:** Driving (checking blind spot), reading, computer work, sleeping, overhead reaching

### Visual Analog Scale for Headache (if applicable)

- **Frequency tracking:** Headache days per week, average intensity, peak intensity
- **MCID:** 50% reduction in headache frequency OR 2-point reduction in intensity
- **Target:** Cervicogenic headache should respond within 4-6 weeks of appropriate treatment

### Global Rating of Change (GRC)

- **Scale:** -7 (a very great deal worse) to +7 (a very great deal better)
- **MCID:** >= +3 ("somewhat better") represents clinically meaningful improvement
- **Use:** Captures patient perception of overall change, correlates with treatment satisfaction

### Dizziness Handicap Inventory (DHI) — if cervicogenic dizziness present

- **Scoring:** 25 questions, scored 0 (no), 2 (sometimes), 4 (yes). Total 0-100.
- **MCID:** 18 points
- **Interpretation:** 0-30 mild, 31-60 moderate, 61-100 severe handicap
