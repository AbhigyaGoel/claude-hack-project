# Cervical Spine Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy cervical module.

## Special Tests (Pose-Based)

### Spurling's Test (Cervical Radiculopathy)

**Setup:** Patient seated, head in neutral.
**Execution via pose:** Cue patient to tilt head toward the painful side (lateral flexion), then extend slightly, then apply gentle axial compression by pressing down on top of head with own hand.
**Keypoint validation:** Track head_lateral_flexion and head_extension via landmarks 0-7 (nose, ears, shoulders). Confirm ipsilateral lateral flexion before compression.
**Positive finding:** Reproduction of radicular arm pain (not just neck pain) in dermatomal distribution.
**Interpretation:** Cervical nerve root compression (foraminal narrowing). Sensitivity 50%, Specificity 86%. Highly specific — a positive test is meaningful.

### Upper Quarter Screen

**Setup:** Patient seated, systematic assessment.
**Execution via pose:** Sequential screening of cervical AROM, shoulder AROM, elbow/wrist, and grip.
**Keypoint validation:**
1. **Cervical AROM:** Flexion (chin to chest), extension (look at ceiling), rotation (chin to shoulder L/R), lateral flexion (ear to shoulder L/R). Measure angles via head landmarks relative to shoulder line.
2. **Shoulder AROM:** Flexion, abduction, ER/IR. Already covered in shoulder skill.
3. **Grip strength:** Self-reported squeeze strength comparison L vs R.
**Positive finding:** Asymmetry in any component, reproduction of concordant symptoms.
**Interpretation:** Identifies level of involvement — myotomal weakness suggests specific nerve root level.

### Cervical Myotome Screen

| Root | Myotome | Test |
|---|---|---|
| C5 | Deltoid | Shoulder abduction resistance |
| C6 | Biceps, wrist extensors | Elbow flexion, wrist extension resistance |
| C7 | Triceps, wrist flexors | Elbow extension, wrist flexion resistance |
| C8 | Finger flexors | Grip strength |
| T1 | Interossei | Finger abduction/adduction |

**Execution via pose:** Cue patient to perform resisted movements against gravity or self-resistance. Observe for weakness or give-way.

### Cervical Dermatome Screen

| Root | Sensory Area |
|---|---|
| C5 | Lateral arm (deltoid region) |
| C6 | Lateral forearm, thumb, index finger |
| C7 | Middle finger, dorsal forearm |
| C8 | Ring finger, little finger, medial forearm |
| T1 | Medial arm |

**Execution via self-report:** Ask patient to report any numbness/tingling and map to dermatome.

### Vertebral Artery Test (Safety Screen)

**CRITICAL SAFETY TEST — Perform before any cervical manipulation/mobilization techniques or aggressive ROM exercises.**
**Setup:** Patient seated.
**Execution via pose:** Cue patient to slowly rotate head fully to one side, hold 10 seconds, then add extension. Repeat other side.
**Keypoint validation:** Track head_rotation and head_extension angles. Ensure SLOW movement.
**Positive finding:** Dizziness, nystagmus, diplopia, dysarthria, dysphagia, drop attack, nausea.
**Interpretation:** Vertebrobasilar insufficiency (VBI). CONTRAINDICATION to cervical extension and rotation exercises on that side.
**Action if positive:** STOP cervical ROM exercises. Flag red flag. Refer to physician.

### Distraction Test (Cervical Radiculopathy)

**Setup:** Patient seated.
**Execution via pose:** Cue patient to place both hands under chin and gently lift head upward (self-distraction).
**Positive finding:** Relief of radicular arm symptoms with distraction.
**Interpretation:** Supports diagnosis of foraminal compression. If positive, cervical traction may be beneficial (refer to supervising PT).

## Differential Diagnosis Decision Tree

```
Neck Pain
|
+-- Red flags present? -> REFER IMMEDIATELY (see Red Flags below)
|
+-- Trauma history?
|   +-- YES:
|   |   +-- MVA -> Whiplash-Associated Disorder (WAD) classification
|   |   |   +-- WAD I: Neck complaint only, no signs
|   |   |   +-- WAD II: Neck complaint + MSK signs (decreased ROM, point tenderness)
|   |   |   +-- WAD III: Neck complaint + neurological signs
|   |   |   +-- WAD IV: Fracture/dislocation (refer emergency)
|   |   +-- Fall/impact -> Fracture screen (Canadian C-spine rules)
|   |
|   +-- NO: Insidious onset -> continue
|
+-- Radicular arm symptoms?
|   +-- YES:
|   |   +-- Spurling+ -> Cervical radiculopathy
|   |   +-- Dermatomal numbness -> Map to nerve root level
|   |   +-- Myotomal weakness -> Map to nerve root level
|   |   +-- Bilateral symptoms + gait changes -> Cervical myelopathy (URGENT refer)
|   |
|   +-- NO: Axial neck pain only -> continue
|
+-- Pain pattern
|   +-- Central posterior -> Mechanical neck pain, facet, disc
|   |   +-- Worse with extension -> Facet arthropathy
|   |   +-- Worse with flexion -> Disc (less common cervical)
|   |   +-- Morning stiffness >60min -> Inflammatory (refer rheum)
|   |
|   +-- Unilateral with referral to scapula/shoulder -> Facet referral, myofascial
|   |   +-- C4-5 facet -> Refers to base of neck, upper trapezius
|   |   +-- C5-6 facet -> Refers to supraspinous fossa, lateral deltoid
|   |   +-- C6-7 facet -> Refers to medial scapula, upper limb
|   |
|   +-- Headache component
|       +-- Occipital + cervical ROM restriction -> Cervicogenic headache
|       +-- Suboccipital tenderness + C1-2 rotation loss -> Upper cervical dysfunction
```

## Exercise-to-Finding Matching Matrix

| Finding | Phase 1 (Acute/Protected) | Phase 2 (Subacute) | Phase 3 (Strengthening/Return) |
|---|---|---|---|
| Cervical radiculopathy | Neural glides (median/ulnar/radial), gentle AROM, postural correction | Progressive AROM, isometric cervical strength, scapular stabilization | Cervical strengthening, functional integration, ergonomic optimization |
| Mechanical neck pain | Gentle AROM within pain-free range, chin tucks (retraction), heat/position | Progressive ROM, isometric multidirectional, upper trapezius stretching | Deep neck flexor endurance, cervicothoracic strengthening, loaded carries |
| WAD I-II | Pain-free AROM (early movement is key), relaxation techniques | Progressive loading, cervical isometrics, aerobic exercise | Full cervical strengthening program, functional capacity |
| WAD III | As WAD I-II but with neural glide additions, monitor neurological status | Progressive as tolerated with ongoing neuro monitoring | Cervical strengthening, nerve tension normalization |
| Cervicogenic headache | Suboccipital release (self-massage), chin tucks, upper cervical AROM | C1-2 rotation mobilization (self), deep neck flexor training | Deep neck flexor endurance, postural endurance, ergonomic |
| Facet arthropathy | Avoid end-range extension, gentle rotation, chin tucks | Progressive AROM all directions, isometric strengthening | Cervical strengthening, functional movement, thoracic mobility |
| Thoracic outlet syndrome | Postural correction, scalene stretching, first rib self-mobilization | Neural glides, scapular retraction, thoracic extension | Strengthening in corrected posture, functional overhead work |

## Red Flags (IMMEDIATE Session Halt)

- **Cervical myelopathy signs:** Bilateral hand clumsiness, gait ataxia, hyperreflexia, Babinski sign, bowel/bladder changes -> URGENT surgical referral
- **Vertebrobasilar insufficiency:** Dizziness, diplopia, dysarthria, dysphagia, drop attacks with cervical movement -> STOP all cervical exercises
- **Progressive neurological deficit:** Worsening weakness or sensory loss -> URGENT referral
- **Severe trauma + neck pain:** Canadian C-spine rules not met -> REFER for imaging before any exercise
- **Fever + neck stiffness:** Meningitis, epidural abscess -> EMERGENCY referral
- **Neck mass or lymphadenopathy** -> Refer for medical evaluation
- **History of cancer + new neck pain** -> Metastatic screen
- **Lhermitte's sign** (electric shock sensation with neck flexion) -> Myelopathy, MS, refer urgently
- **Sudden severe headache + neck pain** -> Vertebral artery dissection, SAH -> EMERGENCY
- **Upper motor neuron signs** (clonus, spasticity, pathological reflexes) -> Myelopathy referral

## WAD (Whiplash-Associated Disorder) Classification and Management

| Grade | Signs | Management Approach |
|---|---|---|
| WAD I | Neck complaint, no MSK signs | Education, early active movement, reassurance |
| WAD II | Neck complaint + decreased ROM, point tenderness | Active exercise, graded return to activity, monitor progress |
| WAD III | Neurological signs (weakness, sensory loss, reflex changes) | As WAD II + neural monitoring, nerve glides, may need imaging |
| WAD IV | Fracture or dislocation | Medical management first, PT only after clearance |

**Key WAD principles:**
- Early active movement (within 72 hours) produces better outcomes than immobilization
- Collar use should be minimized (< 72 hours if at all)
- Monitor for chronicity risk factors: high initial pain, high disability, post-traumatic stress, catastrophizing
- Graded motor imagery if significant movement fear

## Progression Criteria

Advance to next phase when ALL met for 3 consecutive sessions:
1. Pain during exercise <= 3/10
2. No peripheralization of arm symptoms
3. Cervical AROM > 75% of expected (or improving trend)
4. Form quality >= 80% (chin tuck maintained, no forward head posture during exercises)
5. RPE < 5/10
6. NDI score improving or stable
7. Negative vertebral artery screen (re-test before adding extension/rotation load)

## Regression Criteria

Regress when ANY occur:
1. New or worsening radicular symptoms
2. Dizziness or VBI symptoms during exercises
3. Pain during exercise > 5/10
4. New neurological findings (weakness, numbness changes)
5. Headache exacerbation following cervical exercises
6. NDI worsening >= 5 points
7. Form quality < 50% (excessive forward head posture, guarding)

## Clinical Notes

- **Deep neck flexors (DNF):** The "core muscles" of the cervical spine. DNF endurance training (craniocervical flexion test position) is the evidence-based cornerstone for most cervical conditions.
- **Thoracic spine contribution:** Reduced thoracic extension increases cervical compensatory motion. ALWAYS include thoracic mobility in cervical programs.
- **Screen for dizziness:** Cervicogenic dizziness is common post-whiplash. Differentiate from BPPV (Dix-Hallpike) and VBI (vertebral artery test).
- **Ergonomics:** Monitor height, screen distance, and head position are critical. Provide specific recommendations (screen at eye level, elbows at 90 deg).
- **Sleep position:** Cervical patients should avoid prone sleeping. Recommend contoured pillow supporting cervical lordosis.
- **Psychosocial factors:** Cervical pain has strong associations with stress, anxiety, and work dissatisfaction. Screen and address as needed.
