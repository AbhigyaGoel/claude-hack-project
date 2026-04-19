# Lumbar Spine Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy lumbar module.
> This skill is loaded by the orchestrator agent to guide assessment, differential diagnosis,
> exercise prescription, and safety screening for all lumbar spine presentations.

---

## 1. Region Overview

### Functional Anatomy

- **Intervertebral Disc:** Annulus fibrosus (outer collagen rings) encases nucleus pulposus (hydrophilic gel). Posterior-lateral annulus is thinnest and most vulnerable. Disc height loss increases facet load. Innervated only in outer 1/3 of annulus (sinuvertebral nerve).
- **Facet (Zygapophyseal) Joints:** Paired synovial joints oriented ~45 deg sagittal plane in lumbar spine, limiting rotation to ~2 deg per segment. Primary restraint to axial rotation and anterior shear. Richly innervated by medial branch of dorsal ramus (two levels: same level and one above). Referral patterns overlap with disc and SI joint.
- **Nerve Roots:** Exit below the pedicle of the same-numbered vertebra (e.g., L4 root exits below L4 pedicle). Posterolateral disc herniations typically compress the traversing root (e.g., L4-L5 disc compresses L5 root). Far-lateral herniations compress the exiting root (e.g., L4-L5 far-lateral compresses L4 root).
- **Sacroiliac (SI) Joint:** Large auricular surface, minimal motion (2-4 deg nutation/counternutation). Force closure via thoracolumbar fascia, multifidus, transverse abdominis, pelvic floor. Form closure via ridges, grooves, and ligamentous system.
- **Key Stabilizers:** Local system (multifidus, transverse abdominis, pelvic floor, diaphragm) provides segmental control. Global system (erector spinae, rectus abdominis, obliques, quadratus lumborum) provides trunk torque and multi-segmental control.

### Common Pathologies and Prevalence

| Pathology | Lifetime Prevalence | Peak Age | Key Feature |
|---|---|---|---|
| Nonspecific mechanical LBP | 60-80% of adults | 30-50 | No identifiable structural cause |
| Lumbar disc herniation | 1-3% annual incidence | 30-50 | Radiculopathy, positive SLR |
| Lumbar spinal stenosis | 11% in adults >60 | >60 | Neurogenic claudication |
| Spondylolisthesis | 6-11.5% general population | Variable | Pars defect or degenerative slip |
| Facet syndrome | 15-45% of chronic LBP | >50 | Extension-based pain |
| SI joint dysfunction | 15-30% of chronic LBP | 30-60 | Below L5, provocation cluster+ |
| Myofascial pain syndrome | Very common (comorbid) | Any | Trigger points, taut bands |

---

## 2. Special Tests (Pose-Based)

### 2.1 Straight Leg Raise (SLR) — Neural Tension

**Setup:** Patient supine, legs straight, arms at sides.
**Execution via pose:** Cue patient to keep knee fully straight and slowly raise one leg toward ceiling. Instruct to stop when symptoms begin.
**MediaPipe landmarks:** Hip flexion angle from landmarks 23-25 (left) or 24-26 (right): hip-knee vector relative to horizontal. Knee extension confirmed by angle at landmarks 25-27 (left) or 26-28 (right) near 180 deg.
**Angle thresholds:** Note exact angle at symptom onset. Clinically significant range: 30-70 deg. Below 30 deg suggests extreme irritability or non-organic finding. Above 70 deg implicates hamstring or SI joint rather than neural tension.
**Positive finding:** Reproduction of concordant radicular leg pain (below knee, dermatomal pattern) between 30-70 deg.
**Crossover SLR:** Raise the UNINVOLVED leg. Reproduction of pain in the INVOLVED leg is highly specific for disc herniation (sensitivity 29%, specificity 88%).
**Sensitivity/Specificity:** SLR sensitivity 91%, specificity 26%. High sensitivity = excellent screening tool; low specificity = many false positives.
**Differentiation:** Hamstring tightness = posterior thigh only, no radicular quality. Positive SLR = radiating, burning, or electric pain below knee.

### 2.2 Slump Test — Seated Neural Tension

**Setup:** Patient seated on edge of firm chair, feet flat on floor, hands clasped behind back.
**Execution via pose:** Sequential loading: (1) thoracic slump (full kyphosis), (2) cervical flexion (chin to chest), (3) knee extension on involved side, (4) ankle dorsiflexion. Each component added one at a time.
**MediaPipe landmarks:** Thoracic flexion via shoulder-hip angle (landmarks 11-12 relative to 23-24). Head flexion via nose-to-shoulder angle (landmark 0 relative to 11-12). Knee extension via landmarks 25-27 or 26-28.
**Positive finding:** Reproduction of concordant radicular symptoms with sequential loading. Symptoms RELIEVED by removing cervical flexion (extending neck) = structural differentiation confirming neural origin.
**Sensitivity/Specificity:** Sensitivity 84%, specificity 83%. More sensitive than SLR for upper lumbar levels and chronic presentations.

### 2.3 Prone Instability Test

**Setup:** Patient prone with trunk on bed/table, legs hanging off edge, feet on floor.
**Execution via pose:** Phase 1: patient relaxes legs, clinician (or self-palpation) assesses posterior-anterior pain at segmental levels. Phase 2: patient lifts both legs off floor (activating lumbar extensors and gluteals).
**MediaPipe landmarks:** Confirm prone position via trunk angle. Confirm hip extension activation in phase 2 via landmarks 23-25 / 24-26 showing hip extension.
**Positive finding:** Pain present in phase 1 (passive), ABOLISHED in phase 2 (active). Indicates muscular stabilization compensates for passive instability.
**Interpretation:** Segmental instability. Stabilization exercises (not mobilization) are the indicated treatment approach.
**Sensitivity/Specificity:** Sensitivity 72%, specificity 58%.

### 2.4 Repeated Movement Testing (McKenzie MDT)

**Setup:** Standing for extension and flexion; prone for extension in lying (press-ups).
**Execution via pose:** Patient performs 10 repetitions of lumbar extension (standing or prone press-ups) then 10 repetitions of lumbar flexion (standing forward bend). Assess symptom response after EACH set.
**MediaPipe landmarks:** Trunk angle relative to pelvis (landmarks 11-12 vs. 23-24). Extension ROM measured as posterior trunk angle. Flexion ROM measured as anterior trunk angle. Track fingertip-to-floor distance via wrist landmark 15/16 relative to ankle 27/28 for flexion.
**Response classification:**
- **Centralization:** Peripheral symptoms move proximally toward midline = favorable prognosis, continue that direction.
- **Peripheralization:** Symptoms move distally or increase peripherally = STOP that direction immediately.
- **Abolition:** Symptoms eliminated = ideal response, confirms directional preference.
- **No effect:** Symptoms unchanged = this direction is not the directional preference.
- **Mechanical response only (ROM improves, pain unchanged):** May still indicate correct direction, continue with monitoring.
**Interpretation:** Centralization with extension = posterior derangement (most common, ~80%). Centralization with flexion = anterior derangement (~5%). Centralization with lateral shift correction = lateral derangement (~15%).

### 2.5 Single-Leg Stance (Stork Test) — Pars Interarticularis

**Setup:** Patient standing, barefoot.
**Execution via pose:** Patient stands on one leg and extends lumbar spine (leans backward). Hold 5-10 seconds. Repeat on opposite side.
**MediaPipe landmarks:** Single-leg stance confirmed via raised foot landmark (29 or 30) elevation. Lumbar extension via trunk-pelvis angle. Pelvic drop via hip landmark asymmetry (23 vs. 24 vertical difference).
**Positive finding:** Reproduction of ipsilateral low back pain with single-leg stance + extension. Pain localizes to one side.
**Interpretation:** Pars interarticularis stress reaction or spondylolysis. Common in young athletes (gymnasts, football linemen, cricket bowlers). Sensitivity 73%, specificity 68%.

### 2.6 Sacroiliac Provocation Cluster

Five tests, 3 of 5 positive = SI joint dysfunction (sensitivity 94%, specificity 78%):

| Test | Position | Force Direction | Positive Finding |
|---|---|---|---|
| **FABER (Patrick's)** | Supine, hip flexed/abducted/externally rotated, ankle on opposite knee | Overpressure on flexed knee toward table | Posterior SI pain (not groin = hip pathology) |
| **Gaenslen's** | Supine, involved side leg hangs off table edge, opposite knee held to chest | Extension force on hanging leg | SI joint pain on involved side |
| **Compression** | Side-lying, involved side up | Downward force through iliac crest | Reproduction of SI pain |
| **Distraction** | Supine | Outward force on bilateral ASIS | Reproduction of SI pain |
| **Thigh thrust (posterior shear)** | Supine, hip flexed 90 deg | Axial force through femur toward table | SI pain posteriorly |

**MediaPipe landmarks for FABER:** Hip flexion (23-25), abduction (lateral displacement of knee landmark 25), external rotation. Compare involved vs. uninvolved side ROM difference.

### 2.7 Neurological Screen (Myotome/Dermatome Mapping)

| Root | Myotome | Functional Test via Pose | Dermatome |
|---|---|---|---|
| L2 | Hip flexors | Seated hip flexion against gravity, hold 5 sec | Anterior thigh |
| L3 | Quadriceps | Single-leg mini squat (quad dominance), step-up | Medial knee |
| L4 | Tibialis anterior | Heel walking (10 steps), observe foot drop | Medial leg, medial malleolus |
| L5 | Extensor hallucis longus, hip abductors | Toe walking difficult, Trendelenburg sign on single-leg stance | Lateral leg, dorsum of foot, great toe |
| S1 | Peroneals, gastrocnemius | Single-leg heel raise (unable or weak = positive) | Lateral foot, small toe |
| S2 | Hamstrings | Prone knee flexion strength | Posterior thigh |

**MediaPipe tracking:** Heel walk = ankle dorsiflexion angle via landmarks 27-31 or 28-32. Single-leg heel raise = ankle plantarflexion via same landmarks. Trendelenburg = pelvic drop via hip landmark asymmetry during single-leg stance.

### 2.8 Prone Press-Up ROM Assessment

**Setup:** Patient prone, hands under shoulders.
**Execution via pose:** Patient presses upper body up while keeping pelvis on surface (cobra position). Measure maximum extension ROM.
**MediaPipe landmarks:** Trunk extension angle via shoulder-hip line (landmarks 11-23 or 12-24) relative to horizontal. Compare to baseline across sessions.
**Normal values:** 25-35 deg of lumbar extension in prone press-up.
**Interpretation:** Reduced ROM with centralization during repeated reps = derangement. Reduced ROM with end-range pain only = dysfunction. Track across sessions for progress.

---

## 3. Differential Diagnosis Decision Tree

```
LOW BACK PAIN PRESENTATION
|
+-- RED FLAGS PRESENT? --> IMMEDIATE REFERRAL (see Section 6)
|   - Cauda equina signs
|   - Progressive neurological deficit
|   - Fever + back pain
|   - Cancer history + new back pain
|   - Significant trauma
|   - Unexplained weight loss
|
+-- RADICULAR SYMPTOMS (below knee)?
|   +-- YES:
|   |   +-- SLR positive (30-70 deg)?
|   |   |   +-- YES:
|   |   |   |   +-- Crossover SLR positive --> HIGH probability disc herniation
|   |   |   |   +-- Crossover SLR negative --> Moderate probability disc herniation
|   |   |   |   +-- Map myotome/dermatome to identify level:
|   |   |   |       - L4: knee extension weakness, medial leg numbness
|   |   |   |       - L5: great toe extension weakness, dorsal foot numbness
|   |   |   |       - S1: heel raise weakness, lateral foot numbness
|   |   |   |   +-- Disc morphology:
|   |   |   |       - Protrusion: base wider than dome, annulus intact, best prognosis
|   |   |   |       - Extrusion: dome wider than base, through annulus, may resorb
|   |   |   |       - Sequestration: free fragment, may resorb spontaneously (60-90% do)
|   |   |   |
|   |   |   +-- NO:
|   |   |       +-- Age >60 + bilateral symptoms + walking-induced --> Spinal stenosis
|   |   |       +-- Progressive weakness --> URGENT referral (cauda equina screen)
|   |   |       +-- Dermatomal symptoms without SLR --> Lateral recess stenosis, consider slump test
|   |
|   +-- NO: Axial LBP only --> continue below
|
+-- CENTRALIZATION WITH REPEATED MOVEMENTS?
|   +-- YES --> McKenzie Derangement Classification
|   |   +-- Centralizes with EXTENSION --> Posterior derangement (80% of cases)
|   |   +-- Centralizes with FLEXION --> Anterior derangement (5% of cases)
|   |   +-- Centralizes with LATERAL SHIFT CORRECTION --> Lateral derangement (15%)
|   |
|   +-- NO:
|       +-- Pain ONLY at end-range, no centralization, chronic --> Dysfunction syndrome
|       +-- Pain ONLY with sustained postures, no ROM loss --> Postural syndrome
|       +-- Morning stiffness >60 min + age <40 + insidious onset --> Inflammatory (refer rheumatology)
|
+-- PAIN LOCATION AND AGGRAVATING FACTORS
|   +-- Central/bilateral paraspinal:
|   |   +-- Worse with extension + rotation --> Facet syndrome
|   |   +-- Worse with flexion + loading --> Discogenic pain (without radiculopathy)
|   |   +-- Positive prone instability test --> Segmental instability
|   |
|   +-- Unilateral over SI region (below L5):
|   |   +-- 3+ of 5 provocation tests positive --> SI joint dysfunction
|   |   +-- <3 provocation tests positive --> Consider facet referral, hip pathology
|   |
|   +-- Buttock/posterior thigh referral (not below knee):
|   |   +-- Worse sitting + positive SLR <60 deg --> Disc with somatic referral
|   |   +-- Worse with hip IR + tender piriformis --> Piriformis syndrome / deep gluteal
|   |   +-- Hip ROM limited, groin pain with FABER --> Hip joint pathology (refer)
|   |
|   +-- Young athlete (<25) + extension pain + single-leg stance positive:
|       +-- Spondylolysis / spondylolisthesis pathway
|       +-- Grade I-II: conservative management appropriate
|       +-- Grade III+: surgical consultation
```

---

## 4. Exercise-to-Finding Matrix

| Finding | Phase 1 (Acute, 0-2 wk) | Phase 2 (Subacute, 2-6 wk) | Phase 3 (Strengthening, 6-12 wk) | Phase 4 (Return to Function, 12+ wk) |
|---|---|---|---|---|
| **Disc herniation (extension responder)** | Prone lying, repeated prone press-ups (start with 10 reps q2h), avoid ALL flexion | Standing extension, press-ups with overpressure, nerve flossing (not tensioning) | McGill Big 3, hip hinge training, deadlift with dowel | Loaded deadlift, sport-specific lifting, plyometrics if applicable |
| **Disc herniation (flexion responder)** | Supine knees-to-chest, repeated flexion in lying, avoid extension | Seated flexion, prayer stretch, Williams flexion exercises | Core stabilization in flexion-bias, squat progression | Full squat loading, functional flexion tasks |
| **Disc herniation (lateral shift)** | Side-glide correction toward midline (10 reps q2h), then extension protocol once shift corrected | Standing extension, prone press-ups, nerve glides | Core stabilization, frontal plane stability | Sport-specific lateral control, cutting, agility |
| **Spinal stenosis** | Flexion-biased: posterior pelvic tilt, supine knees-to-chest, stationary bike (flexed posture) | Walking program with flexion breaks (lean on cart), aquatic therapy, core endurance | Progressive walking distance, stair climbing, cycling | Community walking goals, recreational activity return |
| **Facet syndrome** | Avoid combined extension + rotation, flexion stretching, gentle rotation in supine | Core stabilization, hip extension mobility, thoracic rotation drills | Anti-extension exercises (pallof press, plank), hip strengthening | Rotational sport return, loaded extension tolerance |
| **Segmental instability** | Motor control: isolated TA activation, pelvic floor, diaphragmatic breathing, dead bug level 1 | Bird-dog, pallof press, plank (front and side), hip hinge with dowel | Loaded carries (farmer, suitcase), cable chops, Turkish get-up | Sport-specific loading, heavy compound lifts with neutral spine |
| **SI joint dysfunction** | SI belt trial, isometric glute/adductor co-contraction, pelvic floor activation | Bridging progression, clamshells, single-leg stance, lumbopelvic stability | Hip strengthening (squat, lunge, step-up), pelvic ring stability | Running, jumping, sport-specific load transfer |
| **Spondylolisthesis** | Avoid extension, flexion-bias core activation, posterior pelvic tilt training | Anti-extension stabilization (dead bug, pallof), hip flexor stretching | Plank progression, loaded carries, hip hinge below pain threshold | Sport return with extension avoidance strategies |
| **Postural syndrome** | Postural education, ergonomic setup, McKenzie lumbar roll, movement breaks q30min | Core endurance (McGill Big 3), standing desk protocol, walking program | Movement variability training, general fitness | Self-management, maintenance program |

---

## 5. Angle Windows per Exercise

| Exercise | Target Landmarks | Ideal Angle Range | Compensation to Flag |
|---|---|---|---|
| **Dead Bug (Level 1)** | Lumbar lordosis maintained, hip flexion 90 deg, knee flexion 90 deg | Hip: 85-95 deg, Knee: 85-95 deg, lumbar spine neutral (no extension >10 deg) | Lumbar extension (rib flare), loss of TA bracing |
| **Dead Bug (Level 2 — contralateral reach)** | As level 1 + opposite arm/leg extension | Extending hip: 160-180 deg, extending shoulder: 160-180 deg | Lumbar lordosis increase >15 deg from baseline, pelvic rotation |
| **Bird-Dog** | Quadruped, extending arm/leg horizontal | Extending hip: 170-190 deg (slight hyperextension OK), shoulder: 170-190 deg | Pelvic rotation >10 deg (lateral hip drop), lumbar hyperextension |
| **Prone Press-Up** | Trunk extension from prone | 20-35 deg lumbar extension (landmark 11/12 to 23/24 relative to horizontal) | Pelvis lifting off surface, asymmetric extension |
| **Plank (front)** | Shoulder-hip-ankle alignment | Shoulder-hip-ankle within 5 deg of 180 deg line | Hip sag (>190 deg), hip pike (<170 deg), cervical hyperextension |
| **Side Plank** | Shoulder-hip-ankle alignment, lateral | Shoulder-hip-ankle within 5 deg of 180 deg, no pelvic rotation | Hip drop (>10 deg below line), trunk rotation, shoulder elevation |
| **Hip Hinge** | Trunk flexion with neutral spine, knees slightly flexed | Trunk forward lean: 45-90 deg, knee flexion: 15-30 deg, spine neutral | Lumbar flexion (rounding), knee flexion >40 deg (squat pattern) |
| **Curl-Up (McGill)** | One knee bent, hands under lumbar spine, lift head/shoulders | Trunk flexion: 15-25 deg only (not full sit-up) | Lumbar flexion (spine should NOT flatten), neck hyperflexion |
| **Glute Bridge** | Supine, knees bent, hips extending | Hip extension: 170-180 deg at top, knee flexion: 80-100 deg | Lumbar hyperextension (ribs flaring), asymmetric pelvic tilt |
| **Single-Leg Stance** | Standing on one leg, pelvis level | Pelvic drop <5 deg, trunk lateral lean <10 deg | Trendelenburg sign (pelvic drop >10 deg), trunk lateral shift |

---

## 6. Red Flags — Detailed Criteria

### Cauda Equina Syndrome (EMERGENCY — call 911 / direct to ER)

Screen with ALL of the following questions. ANY positive = halt session immediately:
- **Bladder dysfunction:** New urinary retention, inability to sense bladder fullness, incontinence (overflow type), loss of urge to void
- **Bowel dysfunction:** Fecal incontinence, loss of rectal tone, inability to sense rectal fullness
- **Saddle anesthesia:** Numbness in perineum, inner thighs, buttocks (S2-S5 distribution)
- **Bilateral leg symptoms:** Progressive bilateral leg weakness, bilateral sciatica (unilateral does NOT rule out)
- **Sexual dysfunction:** New onset loss of sensation, erectile dysfunction (acute onset)
- **Progressive motor deficit:** Foot drop, inability to heel or toe walk that is WORSENING
- **Gait disturbance:** New inability to walk, leg giving way bilaterally

**Critical timing:** Surgical decompression within 48 hours of onset produces significantly better outcomes. Delay = permanent deficits. NEVER "wait and see" with cauda equina suspicion.

### Other Red Flags

| Red Flag | Suspicion | Action | Urgency |
|---|---|---|---|
| Fever (>100.4 F) + back pain | Spinal infection (discitis, osteomyelitis, epidural abscess) | Halt session, refer ER | EMERGENCY |
| IV drug use + back pain | Epidural abscess | Halt session, refer ER | EMERGENCY |
| Cancer history + new back pain | Metastatic disease (breast, prostate, lung, kidney most common) | Halt session, refer oncology | URGENT (same day) |
| Unexplained weight loss >10 lbs / 6 months | Malignancy, systemic disease | Halt session, refer PCP | URGENT (this week) |
| Night pain unrelieved by any position | Tumor, infection | Halt session, refer for imaging | URGENT |
| Significant trauma (fall >6 ft, MVA, osteoporotic patient with ANY fall) | Fracture | Halt session, refer for imaging | URGENT |
| Age >50 + new onset + any other flag | Lower threshold for ALL screening | Refer for workup | URGENT |
| Progressive neuro deficit worsening over days | Expanding lesion (disc, tumor, abscess) | Halt session, refer | URGENT |
| Peripheralization that does NOT reverse after 3 sessions | Structural progression, poor responder | Refer for imaging and specialist | SOON (this week) |
| Bilateral lower extremity symptoms + gait change | Early cauda equina OR myelopathy | Full cauda equina screen | EMERGENCY |
| Immunosuppression (steroids, HIV, transplant) + back pain | Infection, atypical presentation | Lower threshold for referral | URGENT |

---

## 7. Centralization/Peripheralization Tracking

### Session-Level Data Model

```json
{
  "session_id": "string",
  "date": "ISO-8601",
  "direction_tested": "extension | flexion | lateral_shift_L | lateral_shift_R",
  "test_position": "standing | prone | supine | seated",
  "reps_performed": 10,
  "sets_performed": 1,
  "symptom_response": "centralized | peripheralized | unchanged | abolished",
  "pain_location_before": "central | right_paraspinal | left_paraspinal | right_buttock | left_buttock | right_thigh | left_thigh | right_below_knee | left_below_knee",
  "pain_location_after": "(same options)",
  "pain_intensity_before": 0-10,
  "pain_intensity_after": 0-10,
  "rom_change": "improved | unchanged | decreased",
  "baseline_rom_degrees": "number",
  "post_test_rom_degrees": "number"
}
```

### Tracking Rules

1. **ALWAYS pursue the direction that centralizes.** This is the directional preference.
2. **NEVER continue a direction that peripheralizes.** Stop immediately, try opposite direction.
3. Centralization can occur WITHOUT pain reduction initially. Location change is more important than intensity change.
4. Track the MOST DISTAL symptom location. Movement from below-knee to buttock = centralization even if buttock pain increases.
5. If no direction centralizes after thorough testing (extension, flexion, lateral), classify as non-mechanical or dysfunction/postural.
6. Re-assess directional preference EVERY session. It can change as the condition evolves.
7. Lateral shift MUST be corrected before sagittal plane loading (extension/flexion) will be effective.

### Multi-Session Trend Analysis

- **Rapid centralizer (1-3 sessions):** Excellent prognosis, ~80% good outcome
- **Slow centralizer (4-8 sessions):** Good prognosis, may need longer conservative care
- **Non-centralizer:** Poor prognosis for conservative care, consider imaging/referral after 6-8 sessions
- **Initial centralizer who peripheralizes later:** Reassess, may indicate re-injury, new pathology, or need for imaging

---

## 8. Progression and Regression Criteria

### Progression Criteria (advance phase when ALL met for 3 consecutive sessions)

1. Centralization maintained OR symptoms abolished in current directional preference
2. Pain during prescribed exercises <= 3/10
3. No peripheralization with any prescribed movement during or after session
4. Form quality >= 80% (neutral spine maintained, correct landmark alignment)
5. RPE during exercises < 5/10
6. ODI score stable or improving
7. Sitting tolerance improved by >= 10 minutes from baseline (if applicable)
8. No pain increase lasting >2 hours post-session

### Regression Criteria (regress when ANY occur)

1. Peripheralization of symptoms during or after session that does not reverse
2. Pain during prescribed exercise > 5/10
3. NEW neurological symptoms (numbness, tingling, weakness not previously present)
4. Loss of neutral spine control (form quality < 50% on critical exercises)
5. Increased pain lasting > 24 hours post-session
6. ODI worsening >= 6 points (exceeds MDC)
7. Patient reports new bowel/bladder/saddle symptoms (immediate halt and refer)
8. Fear-avoidance behavior escalating (high-guarding, refusal to attempt previously tolerated exercises)

---

## 9. Clinical Pearls

### Centralization is King
Centralization is the single best predictor of good outcome in lumbar disc pathology. A patient who centralizes has an 80%+ chance of good outcome with conservative care. Track it meticulously every session. Pain intensity may initially increase during centralization — what matters is the LOCATION moving proximally.

### McGill Big 3
Curl-up, side plank, bird-dog. Stuart McGill's evidence-based core endurance triad. Use as the baseline stabilization program for nearly all lumbar patients. These exercises spare the spine while building endurance. Endurance matters more than strength for spine stability.

### Fear-Avoidance and Graded Exposure
High fear-avoidance beliefs (Tampa Scale of Kinesiophobia >= 37) predict poor outcomes and chronicity. Address through: (1) pain neuroscience education, (2) graded exposure to feared movements, (3) cognitive reframing of pain as "sensitivity" not "damage," (4) progressive loading to build confidence. Patients who avoid ALL movement have worse outcomes than those who remain active.

### Disc Healing Timeline
Annular tears take 300-500 days to fully heal (Type I collagen maturation). Disc herniations naturally resorb in 60-90% of cases over 6-12 months (larger herniations paradoxically resorb more reliably). Educate patients that time is on their side. Conservative care is first-line for 6-12 weeks minimum before considering surgical options.

### Stenosis Posture Strategy
Neurogenic claudication improves with flexion (shopping cart sign). Prescribe flexion-biased postures: stationary bike (flexed), walking with rollator or cart, seated exercises. Avoid prolonged standing and extension-based loading. Walking tolerance is the primary functional outcome measure for stenosis.

### Hip Mobility Screen — Mandatory
Reduced hip extension (<10 deg) and internal rotation (<30 deg) are strongly associated with lumbar overload and recurrent LBP. Screen EVERY lumbar patient for hip mobility. Hip extension deficit forces lumbar extension compensation during gait. Hip IR deficit forces lumbar rotation compensation.

### Sitting Tolerance
For flexion-intolerant presentations (most disc patients), track sitting tolerance in minutes. Progress sitting tolerance alongside exercise progression. Ergonomic interventions: lumbar roll, sit-stand desk, movement breaks every 30 minutes.

### Sleep Position
Disc pressure is lowest in side-lying with pillow between knees or supine with pillow under knees. Prone sleeping increases lumbar extension load. Morning pain that eases with movement often indicates sustained end-range loading overnight.

---

## 10. Outcome Measures

### Oswestry Disability Index (ODI)

- **Scoring:** 10 questions, each scored 0-5. Total = (sum / 50) x 100 = percentage disability.
- **Interpretation:**
  - 0-20%: Minimal disability
  - 21-40%: Moderate disability
  - 41-60%: Severe disability
  - 61-80%: Crippled
  - 81-100%: Bedbound or exaggerating
- **MCID (Minimal Clinically Important Difference):** 6 points (percentage points) for individual patient change
- **MDC (Minimal Detectable Change):** 10 points at 90% confidence
- **Frequency:** Administer at intake, then every 2-4 weeks
- **Decision threshold:** If ODI unchanged after 6 sessions, reassess diagnosis and treatment approach

### Numeric Pain Rating Scale (NPRS)

- **MCID:** 2 points on 0-10 scale
- **MDC:** 2.5 points
- **Track:** Current pain, worst pain in last 24h, best pain in last 24h, average pain in last week

### Patient-Specific Functional Scale (PSFS)

- **Scoring:** Patient identifies 3-5 activities limited by condition, rates each 0-10
- **MCID:** 2 points per activity, 3 points for average score
- **Value:** Tracks functional goals meaningful to the individual patient

### Fear-Avoidance Beliefs Questionnaire (FABQ)

- **Work subscale:** Score >=34 predicts failure to return to work
- **Physical activity subscale:** Score >=15 predicts poor outcomes with physical therapy
- **Action:** High scores warrant pain neuroscience education and graded exposure approach

---

## McKenzie Classification Summary

| Classification | Directional Preference | Typical Presentation | Exercise Strategy | Prognosis |
|---|---|---|---|---|
| Derangement (posterior, ~80%) | Extension | Flexion-aggravated LBP +/- leg pain, centralizes with extension, may have lateral shift | Prone press-ups, standing extension, avoid flexion loading | Good if centralizes within 3-5 sessions |
| Derangement (anterior, ~5%) | Flexion | Extension-aggravated, centralizes with flexion, rare presentation | Flexion in lying, seated flexion | Good but uncommon |
| Derangement (lateral, ~15%) | Lateral shift correction first | Visible lateral trunk shift, asymmetric presentation | Side-glide correction FIRST, then extension protocol once shift resolved | Good once shift corrected |
| Dysfunction | End-range loading in restricted direction | Pain ONLY at end-range, no centralization, chronic tissue shortening, no change in baseline symptoms | Sustained end-range stretching in restricted direction, remodel shortened tissue | Slow improvement over weeks-months |
| Postural | Posture correction (no directional preference) | Pain with sustained positions ONLY, no ROM loss, no pain with movement | Postural education, ergonomic modification, movement variability | Excellent with compliance |
