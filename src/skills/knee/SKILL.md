# Knee Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy knee module.
> This file is loaded as context by the orchestrator agent for all knee-related assessments, exercise prescriptions, and clinical decision-making.

---

## 1. Region Overview

### Functional Anatomy

The knee is a modified hinge joint (tibiofemoral) coupled with the patellofemoral joint, designed for load-bearing stability with controlled sagittal-plane mobility and limited rotational freedom.

- **Bony structures:** Femoral condyles (medial larger than lateral), tibial plateau (with menisci deepening the articulation), patella (largest sesamoid, tracks in the trochlear groove)
- **Ligamentous stabilizers:**
  - ACL: Primary restraint to anterior tibial translation and rotational stability. Origin: posterolateral femoral condyle; insertion: anterior tibial spine.
  - PCL: Primary restraint to posterior tibial translation. Origin: anterolateral medial femoral condyle; insertion: posterior tibial surface. Strongest knee ligament.
  - MCL (superficial + deep): Primary restraint to valgus stress. Deep MCL attaches to medial meniscus.
  - LCL: Primary restraint to varus stress. Does NOT attach to lateral meniscus.
  - Posterolateral corner (PLC): popliteus, popliteofibular ligament, LCL — critical for posterolateral rotatory stability.
- **Menisci:** Fibrocartilage shock absorbers. Medial meniscus is C-shaped and less mobile (more injury-prone). Lateral meniscus is O-shaped and more mobile. Peripheral 1/3 (red-red zone) has blood supply and healing potential; inner 2/3 (white-white zone) is avascular.
- **Dynamic stabilizers:** Quadriceps (primary knee extensor, VMO for medial patellar tracking), hamstrings (knee flexors, dynamic ACL agonists), popliteus (unlocks the knee from full extension), gastrocnemius (assists flexion), IT band (lateral stabilizer).
- **Q-angle:** Angle between the line from ASIS to patella center and patella center to tibial tubercle. Normal: 12-15 degrees (males), 15-18 degrees (females). Increased Q-angle is a risk factor for patellofemoral dysfunction.

### Common Pathologies by Prevalence

1. Patellofemoral pain syndrome (~25% of all knee complaints, most common in active females)
2. Knee osteoarthritis (~15% of adults >45; leading cause of chronic knee pain)
3. Meniscal tears (~12-14% of knee injuries; medial:lateral ratio approximately 3:1)
4. ACL injuries (~3% of athletic knee injuries but high impact; 70% non-contact mechanism)
5. Patellar tendinopathy (~8% of recreational athletes, ~15% of elite jumping athletes)
6. MCL sprains (~8% of knee injuries; most common knee ligament injury)
7. IT band syndrome (~5-14% of running injuries; most common lateral knee pain in runners)
8. Baker's cyst (popliteal cyst, often secondary to intra-articular pathology)
9. Osgood-Schlatter disease (adolescents during growth spurts, tibial tubercle apophysitis)
10. PCL injuries (~3%, often dashboard mechanism; frequently missed on initial evaluation)

---

## 2. Special Tests (Pose-Based)

### 2.1 Lachman Test (ACL Integrity)

- **Setup:** Patient supine, knee flexed 20-30 degrees (pillow under distal thigh)
- **Patient instruction:** "Lie on your back with a pillow under your knee to create a slight bend. Completely relax your leg. Now gently try to slide your shin bone forward while holding your thigh steady." (Note: self-administered Lachman has limited accuracy; this is primarily a history correlator and functional surrogate assessment.)
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle)
- **Angle measurements:**
  - Knee flexion angle (hip-knee-ankle): target 20-30 degrees
  - Anterior tibial translation: estimated by observing anterior shift of ankle landmark relative to knee landmark (limited precision via pose)
- **Positive finding:** Patient reports excessive forward movement of the shin, soft or absent endpoint. History of "giving way" episodes, especially with pivoting or deceleration.
- **Sensitivity:** 87% | **Specificity:** 93% (manual clinical exam; telehealth adaptation relies on history + functional surrogates)
- **Functional surrogates for telehealth:** Single-leg squat stability assessment, lateral step-down control, history of pivot shift episodes, inability to cut/pivot in sport
- **Clinical interpretation:** Gold standard clinical test for ACL integrity. Grade I: firm endpoint with translation. Grade II: soft endpoint, increased translation. Grade III: no endpoint, gross instability. Always assess in conjunction with functional testing.

### 2.2 McMurray Test (Meniscal Pathology)

- **Setup:** Patient supine, hip and knee maximally flexed
- **Patient instruction:** "Lie on your back. Pull your knee up toward your chest as far as comfortable. Now slowly straighten your knee while I guide you to rotate your foot. Turn your foot outward (for medial meniscus) or inward (for lateral meniscus)."
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle), 29/30 (heel), 31/32 (foot index)
- **Angle measurements:**
  - Knee flexion angle: track from max flexion through the full extension arc
  - Tibial rotation angle: estimated from foot/ankle position relative to knee (foot landmark lateral deviation = external rotation, medial deviation = internal rotation)
  - Note exact knee flexion angle at which pain or click occurs
- **Positive finding:** Palpable or audible click/pop combined with pain at the joint line during the extension-rotation arc. Pain without a click is a less reliable positive. A click without pain may be normal.
- **Sensitivity:** 61% (medial), 45% (lateral) | **Specificity:** 84% (medial), 90% (lateral) (Scholten et al., 2001)
- **Clinical interpretation:** Medial meniscus tested with external tibial rotation; lateral meniscus with internal rotation. The further from full extension the click occurs, the more posterior the lesion location. Combined with Thessaly and joint line tenderness, diagnostic accuracy improves significantly.

### 2.3 Thessaly Test (Meniscal — Functional)

- **Setup:** Patient standing on affected leg, knee flexed 20 degrees
- **Patient instruction:** "Stand on your affected leg with your knee slightly bent — about a quarter squat. Hold onto a chair for balance if needed. Now twist your body left and right three times, keeping your foot planted."
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle), 11/12 (shoulders for trunk rotation)
- **Angle measurements:**
  - Knee flexion angle: confirm 15-25 degrees throughout
  - Trunk rotation angle: measure shoulder line rotation relative to hip line (landmarks 11-12 vs. 23-24)
  - Weight distribution: confirm single-leg stance (contralateral foot off ground)
- **Positive finding:** Joint line pain, locking sensation, catching, or giving way during the rotational maneuver. Patient inability to complete the test due to pain is also a positive.
- **Sensitivity:** 89% | **Specificity:** 97% (Karachalios et al., 2005)
- **Clinical interpretation:** More functional and sensitive than McMurray, particularly for telehealth where manual joint line palpation is not possible. Highly accurate as a screening test. At 20 degrees flexion, the menisci bear approximately 50% of axial load, making this position diagnostically relevant.

### 2.4 Patellar Tracking Assessment / J-Sign

- **Setup:** Patient seated with knee hanging off edge of a surface, or standing
- **Patient instruction:** "Sit on a high surface with your leg hanging. Now slowly straighten your knee all the way, then bend it back. Repeat three times. I will watch your kneecap."
- **MediaPipe landmarks:** 25/26 (knee), 27/28 (ankle); frontal-plane view required for patellar tracking
- **Angle measurements:**
  - Knee flexion/extension arc: track from 90 degrees through full extension
  - Patellar lateral deviation: monitor the knee landmark's medial-lateral position relative to the hip-ankle line during terminal extension (last 30 degrees)
  - J-sign: sudden lateral displacement of the patella in the final 20-30 degrees of extension
- **Positive finding:** Visible lateral tracking of the patella during terminal extension (J-sign), lateral patellar tilt, or inability to maintain smooth tracking. Crepitus during the arc may indicate chondral surface changes.
- **Sensitivity/specificity:** Not standardized as a single test; J-sign has high clinical relevance for patellar instability (PPV ~80% in symptomatic populations)
- **Clinical interpretation:** Indicates VMO insufficiency, lateral retinacular tightness, increased Q-angle contribution, or trochlear dysplasia. The J-sign specifically suggests subluxation tendency and is a key indicator for patellar stabilization exercises.

### 2.5 Valgus Stress Test (MCL)

- **Setup:** Knee tested at 0 degrees (full extension) and 30 degrees flexion
- **Patient instruction:** "Stand on one leg (your affected leg). Slowly lower into a mini squat. I will watch your knee alignment from the front."
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle) — frontal plane view
- **Angle measurements:**
  - Knee valgus angle: angle formed by hip-knee-ankle in the frontal plane. Normal: 170-175 degrees (slight physiological valgus). Dynamic valgus: deviation >10 degrees from static baseline during single-leg squat.
  - Compare valgus angle at 0 degrees knee flexion vs. 30 degrees flexion
- **Positive finding:**
  - At 0 degrees: medial gapping indicates Grade III MCL + possible ACL/PCL/posteromedial capsule injury (more serious)
  - At 30 degrees: medial gapping indicates MCL injury (isolated)
  - Dynamic valgus >10 degrees during single-leg squat indicates combined MCL laxity and hip weakness
- **Sensitivity:** 86% | **Specificity:** 78% (for grade II-III MCL tears)
- **Clinical interpretation:** MCL grading: Grade I: pain, no laxity (0-5mm opening). Grade II: pain, increased laxity with endpoint (5-10mm). Grade III: pain, no endpoint (>10mm). Instability at 0 degrees flexion indicates a more severe, multi-ligament injury.

### 2.6 Varus Stress Test (LCL / Posterolateral Corner)

- **Setup:** Same positions as valgus — 0 degrees and 30 degrees flexion
- **Patient instruction:** "Stand on your affected leg. I will watch the outside of your knee. Look for any outward bowing of the knee."
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle) — frontal plane view
- **Angle measurements:**
  - Knee varus angle: hip-knee-ankle angle in frontal plane
  - Lateral thrust: sudden varus angulation during gait or squat initiation (observable via knee landmark lateral deviation)
- **Positive finding:** Lateral gapping, lateral thrust during stance phase of gait, or varus angulation during single-leg activities
- **Sensitivity:** 75% | **Specificity:** 85% (combined with posterolateral corner assessment)
- **Clinical interpretation:** Isolated LCL injuries are uncommon. Varus instability at 30 degrees suggests isolated LCL. Instability at 0 degrees suggests posterolateral corner involvement (popliteus, popliteofibular ligament) — a more significant injury requiring surgical referral.

### 2.7 Posterior Drawer / Posterior Sag Sign (PCL)

- **Setup:** Patient supine, hip flexed 45 degrees, knee flexed 90 degrees
- **Patient instruction:** "Lie on your back. Bend your hip and knee to 90 degrees. Let your leg relax completely. I will look at the position of your shin bone from the side."
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle) — lateral view
- **Angle measurements:**
  - Confirm hip flexion ~45 degrees and knee flexion ~90 degrees
  - Tibial step-off: In a normal knee, the tibial plateau is approximately 10mm anterior to the femoral condyles. Loss of this step-off (posterior sag) indicates PCL insufficiency.
  - Compare the anterior tibial profile (knee landmark position relative to expected line from hip to ankle) bilaterally
- **Positive finding:** Visible posterior sag of the tibia (loss of normal anterior tibial prominence when viewed laterally). Patient may report posterior knee pain with dashboard-type mechanisms or hyperflexion injuries.
- **Sensitivity:** 79% (posterior sag) | **Specificity:** 100% (posterior sag is pathognomonic for PCL injury)
- **Clinical interpretation:** PCL injuries are frequently missed because they present with less functional instability than ACL injuries. The posterior sag sign is the most reliable clinical indicator. Grade by tibial step-off: Grade I (anterior tibial plateau still anterior to femoral condyles), Grade II (flush), Grade III (posterior to condyles).

### 2.8 Clarke's Test / Patellar Grind (Patellofemoral)

- **Setup:** Patient supine or seated with knee extended (relaxed quadriceps)
- **Patient instruction:** "Straighten your knee fully and relax your thigh muscle. Now tighten your thigh muscle (contract your quad) and hold for 5 seconds. Tell me if you feel pain or grinding behind your kneecap."
- **MediaPipe landmarks:** 25/26 (knee), 27/28 (ankle) — confirm full extension
- **Angle measurements:**
  - Knee extension angle: confirm 0-5 degrees (full extension)
  - Quad contraction: visual confirmation of VMO activation (muscle bulk change at medial knee)
- **Positive finding:** Retropatellar pain or grinding (crepitus) with quadriceps contraction. Note: this test has a high false-positive rate, especially in asymptomatic individuals.
- **Sensitivity:** 49% | **Specificity:** 67% (limited diagnostic value in isolation)
- **Clinical interpretation:** Suggests patellofemoral chondral irritation or chondromalacia patellae. Due to high false-positive rate, this test should only be interpreted as positive when it reproduces the patient's specific pain complaint. Most useful when combined with patellar tracking assessment and single-leg squat findings.

### 2.9 Single-Leg Squat Assessment (Functional Composite)

- **Setup:** Patient standing on affected leg, arms across chest or on hips
- **Patient instruction:** "Stand on your affected leg. Cross your arms over your chest. Slowly squat down as far as you can control, then stand back up. Repeat five times. Keep your knee over your toes."
- **MediaPipe landmarks:** 23/24 (hip), 25/26 (knee), 27/28 (ankle), 11/12 (shoulders), 31/32 (foot)
- **Angle measurements:**
  - Knee flexion depth: target 60-90 degrees for adequate assessment
  - Frontal plane knee valgus: hip-knee-ankle angle (should remain >165 degrees, i.e., <15 degrees valgus)
  - Trunk lateral lean: shoulder midpoint deviation from hip midpoint (>10 degrees = positive Trendelenburg)
  - Pelvic drop: contralateral hip drop (hip landmark comparison)
  - Knee-over-foot alignment: knee landmark should track over 2nd-3rd toe (foot index landmark)
- **Positive finding:** Dynamic valgus >10 degrees, trunk lean >10 degrees (Trendelenburg), contralateral pelvic drop >5 degrees, knee medialization past great toe, inability to achieve 60 degrees flexion, loss of balance
- **Sensitivity/specificity:** Not a single-pathology test. This is a composite functional assessment that reveals:
  - Hip abductor/external rotator weakness (valgus + Trendelenburg)
  - Quadriceps weakness (insufficient depth, slow speed)
  - Patellar tracking dysfunction (pain in the 30-60 degree flexion zone)
  - ACL insufficiency (giving way, apprehension)
  - Ankle dorsiflexion limitation (early heel rise, forward trunk lean)
- **Clinical interpretation:** The single-leg squat is the most important functional test for the knee. It integrates the entire lower extremity kinetic chain and reveals compensatory patterns that single-joint tests miss. Score each repetition on a 3-point scale (good/fair/poor) and track over time as a rehabilitation outcome measure.

---

## 3. Differential Diagnosis Decision Tree

```
KNEE PAIN PRESENTATION
|
+-- STEP 1: Screen Red Flags (Section 6) --> If present, STOP and REFER
|
+-- STEP 2: Onset Type
|   +-- TRAUMATIC
|   |   +-- Mechanism: Non-contact pivot / deceleration / landing
|   |   |   +-- Audible pop + immediate swelling (<2 hours) --> ACL tear (Lachman, functional testing)
|   |   |   +-- Pop + giving way + hemarthrosis --> ACL tear (70% probability with this triad)
|   |   |   +-- No pop + delayed swelling (>6 hours) --> Meniscal tear
|   |   |
|   |   +-- Mechanism: Contact valgus force (hit from lateral side)
|   |   |   +-- Medial pain + valgus laxity at 30 deg --> Isolated MCL sprain
|   |   |   +-- Medial + anterolateral pain + valgus laxity at 0 deg --> MCL + ACL (O'Donoghue triad)
|   |   |   +-- Include meniscal assessment --> "Unhappy triad" (ACL + MCL + medial meniscus)
|   |   |
|   |   +-- Mechanism: Twisting on planted foot
|   |   |   +-- Joint line pain + locking/catching --> Meniscal tear (McMurray, Thessaly)
|   |   |   +-- Medial joint line --> Medial meniscus (3x more common)
|   |   |   +-- Lateral joint line --> Lateral meniscus
|   |   |   +-- Locked knee (unable to fully extend) --> Bucket-handle tear (refer urgently)
|   |   |
|   |   +-- Mechanism: Dashboard injury (posterior force on proximal tibia)
|   |   |   +-- Posterior knee pain + posterior sag sign --> PCL tear
|   |   |   +-- Often missed initially; always check tibial step-off
|   |   |
|   |   +-- Mechanism: Hyperextension
|   |   |   +-- Posterior pain --> PCL or posterior capsule
|   |   |   +-- Combined with varus/valgus --> Multi-ligament injury (refer surgery)
|   |   |
|   |   +-- Mechanism: Direct patellar blow / fall on flexed knee
|   |   |   +-- Anterior pain + effusion --> Patellar fracture, chondral injury (refer imaging)
|   |   |   +-- Patellar dislocation (lateral) --> Assess medial retinaculum, MPFL
|   |   |
|   |   +-- Mechanism: Varus force (hit from medial side)
|   |       +-- Lateral pain + varus laxity --> LCL +/- posterolateral corner
|   |       +-- Lateral thrust in gait --> PLC involvement (refer surgery if grade III)
|   |
|   +-- ATRAUMATIC / INSIDIOUS --> Continue to Step 3
|
+-- STEP 3: Pain Location
|   +-- ANTERIOR (front of knee)
|   |   +-- Worse with stairs (especially descending), prolonged sitting, squatting
|   |   |   +-- Onset during puberty/growth spurt --> Osgood-Schlatter (tibial tubercle tenderness)
|   |   |   +-- Onset during adolescence, inferior pole pain --> Sinding-Larsen-Johansson
|   |   |   +-- Young female, bilateral, peripatellar --> Patellofemoral pain syndrome (PFPS)
|   |   |   +-- Age >50, crepitus, morning stiffness <30 min --> Patellofemoral osteoarthritis
|   |   |
|   |   +-- Localized below kneecap at patellar tendon
|   |   |   +-- Jumping athlete + inferior pole pain --> Patellar tendinopathy ("jumper's knee")
|   |   |   +-- Load-dependent (worse with jumping/landing, better with rest) --> Confirms tendinopathy
|   |   |   +-- VISA-P score for severity staging
|   |   |
|   |   +-- J-sign or patellar subluxation history
|   |   |   +-- Recurrent episodes + hypermobility --> Patellar instability
|   |   |   +-- First episode + hemarthrosis --> MPFL tear (refer imaging + orthopedics)
|   |   |
|   |   +-- Anterior pain worse with resisted extension only
|   |       +-- Quad tendinopathy (less common, typically age >40)
|   |
|   +-- MEDIAL (inside of knee)
|   |   +-- Joint line tenderness + mechanical symptoms (locking, catching, clicking)
|   |   |   +-- McMurray+ or Thessaly+ --> Medial meniscus tear
|   |   |   +-- True locking (unable to extend) --> Bucket-handle tear (refer urgently)
|   |   |
|   |   +-- Diffuse medial + morning stiffness >30 min, age >50
|   |   |   +-- Crepitus, bony enlargement --> Medial compartment OA
|   |   |   +-- Standing X-ray (refer for Kellgren-Lawrence grading)
|   |   |
|   |   +-- Below joint line, medial tibial flare area
|   |   |   +-- Point tenderness at pes anserine --> Pes anserine bursitis/tendinopathy
|   |   |   +-- Common in obese patients, medial OA, and diabetics
|   |   |
|   |   +-- Medial pain in adolescents near tibial tubercle
|   |       +-- Tender tibial tubercle + activity-related --> Osgood-Schlatter (more anteromedial)
|   |
|   +-- LATERAL (outside of knee)
|   |   +-- Runner/cyclist + lateral femoral condyle pain
|   |   |   +-- Pain at 30 deg flexion (impingement zone) --> IT band syndrome (ITBS)
|   |   |   +-- Ober test positive (tight IT band) --> Confirms ITBS
|   |   |   +-- Noble compression test positive --> ITBS
|   |   |
|   |   +-- Lateral joint line + mechanical symptoms
|   |   |   +-- McMurray+ with internal rotation --> Lateral meniscus tear
|   |   |
|   |   +-- Lateral compartment narrowing, varus alignment
|   |       +-- Lateral compartment OA (less common than medial)
|   |
|   +-- POSTERIOR (back of knee)
|   |   +-- Popliteal swelling, fullness behind knee
|   |   |   +-- Fluctuant mass, transilluminates --> Baker's cyst (popliteal cyst)
|   |   |   +-- Often secondary to intra-articular pathology (meniscal, OA)
|   |   |   +-- If ruptured --> Calf swelling, ecchymosis (differentiate from DVT!)
|   |   |
|   |   +-- Deep posterior pain with dashboard mechanism
|   |   |   +-- Posterior sag sign --> PCL injury
|   |   |
|   |   +-- Posterior pain with knee extension
|   |       +-- Popliteus tendinopathy or posterior capsule strain
|   |
|   +-- DIFFUSE / PERIARTICULAR
|       +-- Acute: hot, red, swollen, non-traumatic --> Septic joint, gout, pseudogout (refer)
|       +-- Chronic: multi-compartment OA
|       +-- Bilateral + systemic symptoms --> Inflammatory arthritis (RA, psoriatic; refer rheum)
|
+-- STEP 4: Mechanical Symptoms Assessment
|   +-- TRUE LOCKING (knee mechanically blocked, cannot extend fully)
|   |   +-- Bucket-handle meniscal tear (refer urgently for surgical evaluation)
|   |   +-- Loose body (osteochondral fragment, synovial chondromatosis)
|   |
|   +-- PSEUDO-LOCKING (pain inhibition prevents full extension but can be achieved passively)
|   |   +-- Patellofemoral pain, effusion, muscle guarding
|   |
|   +-- GIVING WAY
|   |   +-- True giving way (unexpected buckling under load) --> ACL deficiency, patellar subluxation
|   |   +-- Pain-inhibited giving way (quad inhibition) --> Patellofemoral pain, effusion
|   |
|   +-- CATCHING / CLICKING
|       +-- Painful catching at joint line --> Meniscal tear
|       +-- Painless clicking --> Often normal (patellar glide, plica), reassure patient
|
+-- STEP 5: Kinetic Chain Screening
    +-- Hip abductor weakness --> Contributing to dynamic valgus and PFPS
    +-- Ankle dorsiflexion deficit (<10 deg with knee bent) --> Compensatory knee valgus
    +-- Core weakness --> Poor single-leg stability
    +-- Lumbar radiculopathy (L3-L4) --> Anterior knee pain referral pattern (check quad reflex)
```

---

## 4. Exercise-to-Finding Matrix

### ACL Insufficiency (Conservative Management)

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | Quad sets, straight leg raises (4 directions), heel slides, patellar mobilizations, ankle pumps | Full extension goal; manage effusion; NMES for quad activation if available |
| Phase 2 (Subacute, 2-8 weeks) | Partial squats 0-60 degrees, step-ups (4-6 inch), stationary bike, balance board (bilateral), hamstring curls | CKC priority; avoid open-chain knee extension 0-45 degrees (ACL strain zone) |
| Phase 3 (Strengthening, 8-16 weeks) | Full-depth squats, single-leg press, lateral band walks, single-leg balance, progression to single-leg squat | Build toward LSI >80% for quad and hamstring |
| Phase 4 (Return to function, 16+ weeks) | Lateral agility drills, plyometrics (box jumps, depth jumps), sport-specific cutting, interval running | Hop test LSI >90%, quad LSI >90%, psychological readiness |
| **Contraindications** | Avoid open-chain knee extension 0-45 degrees (max ACL strain), pivoting/cutting before Phase 4, plyometrics before adequate quad strength (LSI >80%) |

### ACL Post-Operative Rehabilitation

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Protection, 0-4 weeks) | Patellar mobilizations, quad sets with NMES, SLR (4-way), heel slides, passive extension to 0 degrees, bike when ROM allows | Full extension by week 1 is critical; 90 degrees flexion by week 2 |
| Phase 2 (Early strengthening, 4-12 weeks) | CKC 0-90 degrees (wall sits, leg press), bike progression, pool walking/running, balance training | Regain full ROM by week 8; progressive CKC loading |
| Phase 3 (Strengthening, 12-24 weeks) | Progressive resistance squats, single-leg press, hamstring eccentrics, step-downs, perturbation training | Quad LSI >70% by month 4, >80% by month 6 |
| Phase 4 (Return to sport, 6-12 months) | Running progression (start month 4-6), agility drills, plyometrics, sport-specific skills, psychological readiness assessment | Hop test battery LSI >90%, quad/hamstring LSI >90%, ACL-RSI score >56 |
| **Contraindications** | No open-chain extension 0-45 degrees for first 12 weeks (hamstring graft) or 6 weeks (patellar tendon graft per surgeon); no pivoting sports before month 9 minimum |

### Medial Meniscus Tear (Conservative)

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | AROM within pain-free range, quad sets, SLR, pool walking, gentle bike if tolerated | Avoid deep flexion >90 degrees, twisting, squatting |
| Phase 2 (Subacute, 2-6 weeks) | Mini squats 0-45 degrees, step-ups, hamstring curls, bike with progressive resistance | Gradual increase in ROM; monitor for mechanical symptoms |
| Phase 3 (Strengthening, 6-12 weeks) | Full ROM strengthening, single-leg work, balance/proprioception, lateral movements | Build endurance before intensity; progress squat depth |
| Phase 4 (Return to function, 12+ weeks) | Sport-specific drills, agility, pivoting progression, impact activities | Functional testing must be pain-free and without mechanical symptoms |
| **Contraindications** | Avoid deep squats in early phases, forced tibial rotation under load, high-impact activities until pain-free through full ROM |

### Patellofemoral Pain Syndrome (PFPS)

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | VMO isometrics (quad sets with adductor squeeze), SLR, hip abduction/ER strengthening, pool walking | Avoid painful ROM (often 30-60 degrees of knee flexion); reduce aggravating activities |
| Phase 2 (Subacute, 2-6 weeks) | Terminal knee extension (90-45 degrees — pain-free zone), lateral band walks, clamshells, step-downs (low height), bridging | Hip strengthening is critical — proximal control before distal loading |
| Phase 3 (Strengthening, 6-12 weeks) | Pain-free squats (full depth if tolerated), single-leg press, lateral step-ups, forward step-downs (increased height), single-leg balance | Progressive loading through previously painful ranges |
| Phase 4 (Return to function, 12+ weeks) | Single-leg squats, hopping/landing mechanics, stair training (eccentric focus), sport-specific activities | Dynamic valgus control is the graduation criterion |
| **Contraindications** | Avoid deep squats if painful, leg extensions through full ROM in early phases, excessive hill running, prolonged kneeling |

### Patellar Tendinopathy

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Pain management, 0-2 weeks) | Isometric quad holds at 70 degrees (5 x 45-second holds, heavy load), hip strengthening, calf raises | Isometrics provide immediate analgesic effect; load management |
| Phase 2 (Load introduction, 2-6 weeks) | Eccentric decline squat (25 degrees decline board, 3 x 15, slow 3-second descent), Spanish squat, slow tempo bilateral squat | Pain up to 4/10 during exercise is acceptable; 24-hour symptom response is the guide |
| Phase 3 (Heavy slow resistance, 6-12 weeks) | Heavy slow resistance (leg press, hack squat: 4 x 6 at 8RM, 3-second concentric + 3-second eccentric), single-leg decline squat | Progressive overload; track VISA-P score every 2 weeks |
| Phase 4 (Return to sport, 12+ weeks) | Energy storage and release (jumping/landing progression), sport-specific plyometrics, running intervals | Graduate loading from heavy slow resistance to speed/impact |
| **Contraindications** | Avoid complete rest (deloading worsens tendon capacity), stretching the patellar tendon directly, corticosteroid injection into the tendon substance |

### Knee Osteoarthritis

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Symptom management) | Gentle AROM, stationary bike (low resistance), pool walking/aqua therapy, isometric quad/ham sets | Stay within 2/10 pain increase over baseline during exercise |
| Phase 2 (Active strengthening) | Quad strengthening (leg press, wall sits), hamstring curls, hip abduction/ER, tai chi, step-ups | 2-3x/week strength training; pain should return to baseline within 24 hours |
| Phase 3 (Progressive loading) | Progressive resistance training (bodyweight to weighted squats/press), balance training, functional task practice | GLA:D program principles; load progression every 2 weeks |
| Phase 4 (Maintenance/function) | Ongoing strength maintenance, walking program, cycling, functional fitness, self-management education | Lifelong exercise adherence; minimum 150 min/week moderate activity |
| **Contraindications** | Avoid high-impact repetitive loading (running on hard surfaces), deep squats if painful, prolonged kneeling, exercising during flare (reduce to Phase 1) |

### IT Band Syndrome

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | Hip abductor isometrics, foam rolling (lateral thigh — NOT directly on IT band insertion), glute activation drills | Reduce running volume 50-100%; avoid downhill running |
| Phase 2 (Subacute, 2-6 weeks) | Side-lying hip abduction, clamshells (progressive resistance), single-leg bridges, lateral step-ups | Strengthen hip; avoid the "impingement zone" (30 degrees knee flexion) repetitively |
| Phase 3 (Strengthening, 6-12 weeks) | Single-leg squats, lateral band walks with squat, Copenhagen adduction, running gait retraining | Address running cadence (increase 5-10% reduces IT band load); gradual running return |
| Phase 4 (Return to sport, 12+ weeks) | Progressive running program, hill training (gradual), trail running, sport-specific lateral movements | Monitor for recurrence at specific weekly mileage thresholds |
| **Contraindications** | Avoid aggressive IT band stretching (recent evidence suggests it is not effective and may be provocative), excessive foam rolling directly over the lateral epicondyle, sudden increases in running volume (>10% per week) |

### MCL Sprain (Grade I-II)

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | Protected AROM (hinged brace if grade II), quad sets, SLR, ankle pumps, ice and compression | Grade I: brace optional. Grade II: hinged brace at 0-90 degrees for 2-4 weeks |
| Phase 2 (Subacute, 2-6 weeks) | Progressive ROM, CKC strengthening (mini squats, leg press), bike, balance training | Remove brace for exercise if stable; avoid valgus stress |
| Phase 3 (Strengthening, 6-12 weeks) | Full strengthening, lateral movements (controlled), single-leg work, proprioception | Grade I: return to sport at 3-4 weeks. Grade II: 6-8 weeks |
| Phase 4 (Return to sport) | Sport-specific cutting, pivoting, contact preparation, agility testing | Functional testing pain-free; valgus stress test pain-free; confidence assessment |
| **Contraindications** | Avoid valgus stress activities in early phases, breaststroke swimming kick, wide-stance activities under load |

---

## 5. Angle Windows per Exercise

```json
[
  {
    "exercise": "Partial Squat (ACL-safe)",
    "primary_joint": "knee_flexion",
    "target_range": [0, 60],
    "critical_angles": { "start": 0, "mid": 30, "end": 60 },
    "tempo": "3s down, 1s hold, 2s up",
    "compensation_windows": {
      "knee_valgus": { "max_degrees": 10, "description": "Knee medialization past great toe — indicates hip weakness or poor motor control" },
      "trunk_forward_lean": { "max_degrees": 15, "description": "Excessive forward trunk lean compensating for quad weakness or ankle stiffness" },
      "heel_rise": { "max_degrees": 0, "description": "Heels must remain flat; rising indicates ankle dorsiflexion deficit" }
    }
  },
  {
    "exercise": "Full Depth Squat",
    "primary_joint": "knee_flexion",
    "target_range": [0, 120],
    "critical_angles": { "start": 0, "quarter": 45, "half": 90, "full": 120 },
    "tempo": "3s down, 1s hold, 2s up",
    "compensation_windows": {
      "knee_valgus": { "max_degrees": 10, "description": "Dynamic valgus — most critical compensation to monitor" },
      "trunk_forward_lean": { "max_degrees": 30, "description": "Some lean is normal at depth; excessive indicates posterior chain dominance" },
      "heel_rise": { "max_degrees": 0, "description": "Heels must stay planted" },
      "lumbar_flexion": { "max_degrees": 15, "description": "Butt wink — posterior pelvic tilt at depth" },
      "knee_translation": { "max_cm": 5, "description": "Knee should not translate excessively anterior to toes (relative to foot length)" }
    }
  },
  {
    "exercise": "Step-Up (6-8 inch)",
    "primary_joint": "knee_flexion",
    "target_range": [0, 65],
    "critical_angles": { "start": 65, "mid": 35, "end": 0 },
    "tempo": "2s up, 1s hold, 3s down (eccentric emphasis on step-down)",
    "compensation_windows": {
      "knee_valgus": { "max_degrees": 8, "description": "Valgus during push-off phase" },
      "pelvic_drop": { "max_degrees": 5, "description": "Contralateral hip drop indicating gluteus medius weakness" },
      "trunk_lateral_lean": { "max_degrees": 8, "description": "Leaning over stance leg — Trendelenburg compensation" },
      "push_off_from_trailing_leg": { "max_degrees": 0, "description": "Should drive entirely from lead leg" }
    }
  },
  {
    "exercise": "Single-Leg Squat",
    "primary_joint": "knee_flexion",
    "target_range": [0, 75],
    "critical_angles": { "start": 0, "mid": 40, "end": 75 },
    "tempo": "3s down, 1s hold, 3s up",
    "compensation_windows": {
      "knee_valgus": { "max_degrees": 10, "description": "Primary compensation — most predictive of injury risk" },
      "trunk_lateral_lean": { "max_degrees": 10, "description": "Trendelenburg sign" },
      "pelvic_drop": { "max_degrees": 5, "description": "Contralateral pelvic drop" },
      "contralateral_foot_touch": { "max_degrees": 0, "description": "Non-stance foot should not touch ground" },
      "knee_internal_rotation": { "max_degrees": 8, "description": "Femoral IR contributing to dynamic valgus" }
    }
  },
  {
    "exercise": "Terminal Knee Extension (Short Arc Quad)",
    "primary_joint": "knee_extension",
    "target_range": [45, 0],
    "critical_angles": { "start": 45, "mid": 20, "end": 0 },
    "tempo": "2s extend, 2s hold at full extension, 2s return",
    "compensation_windows": {
      "hip_flexion": { "max_degrees": 5, "description": "Lifting thigh off surface to assist extension" },
      "ankle_dorsiflexion": { "max_degrees": 10, "description": "Using ankle motion as substitute movement" }
    }
  },
  {
    "exercise": "Eccentric Decline Squat (Patellar Tendinopathy)",
    "primary_joint": "knee_flexion",
    "target_range": [0, 70],
    "critical_angles": { "start": 0, "pain_zone": 30, "end": 70 },
    "tempo": "3s eccentric descent (key phase), return to start with both legs",
    "decline_angle": 25,
    "compensation_windows": {
      "heel_rise": { "max_degrees": 0, "description": "Must stay on decline board" },
      "trunk_forward_lean": { "max_degrees": 10, "description": "Leaning forward reduces patellar tendon load" },
      "speed": { "max_seconds": 3, "description": "Must maintain slow eccentric — rushing defeats purpose" }
    }
  },
  {
    "exercise": "Lateral Band Walk",
    "primary_joint": "hip_abduction",
    "target_range": [0, 25],
    "critical_angles": { "start": 0, "end": 25 },
    "tempo": "controlled, 2s per step",
    "compensation_windows": {
      "trunk_lateral_lean": { "max_degrees": 8, "description": "Leaning toward stepping leg" },
      "knee_valgus": { "max_degrees": 5, "description": "Band pulling knees inward" },
      "toe_out": { "max_degrees": 15, "description": "Excessive foot external rotation to cheat abduction" },
      "squat_depth_loss": { "max_degrees": 10, "description": "Coming out of athletic position during stepping" }
    }
  },
  {
    "exercise": "Wall Sit (Isometric)",
    "primary_joint": "knee_flexion",
    "target_range": [60, 90],
    "critical_angles": { "target_hold": 70 },
    "tempo": "hold 30-60 seconds",
    "compensation_windows": {
      "knee_valgus": { "max_degrees": 8, "description": "Knees collapsing inward under fatigue" },
      "hip_hike": { "max_degrees": 5, "description": "Uneven weight bearing" },
      "back_arching": { "max_degrees": 5, "description": "Lumbar extension away from wall" }
    }
  }
]
```

---

## 6. Red Flags (Immediate Referral Required)

| Red Flag | Possible Condition | Rationale | Action |
|----------|-------------------|-----------|--------|
| Locked knee — unable to fully extend mechanically (not pain-limited) | Bucket-handle meniscal tear, loose body | Mechanical block requires surgical intervention to restore function; delaying causes chondral damage | Refer orthopedics urgently (within 48 hours) |
| Acute hemarthrosis — rapid onset swelling within 2 hours of injury | ACL tear (70%), osteochondral fracture (15%), patellar dislocation (10%), peripheral meniscal tear (5%) | Rapid blood filling of the joint indicates vascular disruption; structural damage likely requires imaging | Refer orthopedics for MRI and aspiration |
| Hot, red, swollen joint WITHOUT trauma | Septic arthritis, gout, pseudogout (calcium pyrophosphate) | Septic arthritis is a surgical emergency; untreated leads to rapid joint destruction within 24-48 hours | Refer emergency; joint aspiration required for culture and crystal analysis |
| Fever (>38.5C) + joint swelling | Septic arthritis | Infection risk — do NOT delay for conservative treatment or observation | Refer emergency immediately |
| Severe deformity post-trauma (angulation, rotation) | Fracture, dislocation (tibiofemoral or patellar) | Neurovascular compromise risk; requires emergency reduction and imaging | Refer emergency; assess distal pulses |
| Ottawa Knee Rules positive: age >55, isolated patellar tenderness, fibular head tenderness, inability to flex >90 degrees, inability to weight-bear 4 steps | Fracture (sensitivity 98.5% with Ottawa Rules) | Ottawa Rules validated to rule out fracture; positive findings require radiographic assessment | Refer for knee X-ray |
| Progressive neurological deficit in the lower extremity | Lumbar radiculopathy (L3/L4), cauda equina, peripheral neuropathy | Neurological symptoms masquerading as knee pain require spinal assessment; cauda equina is emergency | Refer neurology/spine; cauda equina → emergency |
| Popliteal pain + calf swelling + warmth, especially with risk factors (immobility, recent surgery, OCP use) | Deep vein thrombosis (DVT) | Pulmonary embolism risk if DVT propagates; cannot be ruled out clinically | Refer for Doppler ultrasound urgently; do NOT massage or exercise |
| Night pain not position-dependent + age >50 + history of cancer | Metastatic bone disease (distal femur, proximal tibia are common metastatic sites) | These are red flag combinations for malignancy; screening radiographs and blood work required | Refer oncology/orthopedics for imaging |
| Bilateral knee effusions + systemic symptoms (fatigue, weight loss, morning stiffness >1 hour) | Rheumatoid arthritis, psoriatic arthritis, reactive arthritis | Inflammatory arthropathy requires disease-modifying therapy; not amenable to conservative PT alone initially | Refer rheumatology |

---

## 7. Progression and Regression Criteria

### Progression Criteria

Advance to the next phase when ALL of the following are met for 3 consecutive sessions:

1. **Pain:** Exercise-related pain <= 3/10 AND pain returns to baseline within 24 hours post-session
2. **Effusion:** No increase in effusion after exercise sessions (patient reports no new swelling)
3. **Form quality:** >= 80% of repetitions performed within acceptable compensation windows (especially dynamic valgus <10 degrees)
4. **RPE:** < 5/10 at current exercise load/prescription
5. **Quad strength (phase-specific LSI targets):**
   - Phase 1 to Phase 2: able to perform SLR without extensor lag
   - Phase 2 to Phase 3: quad LSI >70%
   - Phase 3 to Phase 4: quad LSI >85%
   - Phase 4 to return to sport: quad LSI >90%
6. **Hamstring strength LSI:** >80% for phase transitions after Phase 2
7. **Balance:** Single-leg stance >30 seconds without loss of balance (Phase 2+)
8. **Functional milestones:**
   - Phase 3: Pain-free single-leg squat to 60 degrees with good form
   - Phase 4: Hop test battery (single hop, triple hop, crossover hop, 6-meter timed hop) — all >90% LSI

### Regression Criteria

Regress to the previous phase when ANY of the following occur:

1. **Pain:** Exercise-related pain > 5/10 on two consecutive sessions
2. **Effusion:** New or increased swelling post-session (reported by patient or visually observed via pose)
3. **Mechanical symptoms:** New or increased episodes of locking, catching, or giving way
4. **Dynamic valgus:** >10 degrees during single-leg squat despite cueing on two consecutive sessions
5. **Form breakdown:** Form quality < 50% consistently across two or more exercises
6. **KOOS worsening:** Any subscale worsening >= 8 points (exceeds MCID)
7. **Extensor lag:** Re-emergence of quadriceps extensor lag (inability to achieve full active extension)
8. **Confidence decline:** Patient-reported fear of movement or significant increase in kinesiophobia (Tampa Scale)

### Limb Symmetry Index (LSI) Measurement

LSI = (involved limb / uninvolved limb) x 100

- **>90%:** Acceptable for return to sport (for ALL hop tests and strength measures)
- **80-90%:** Acceptable for progressive strengthening (Phase 3)
- **70-80%:** Acceptable for basic functional activities (Phase 2)
- **<70%:** Indicates significant deficit requiring continued isolated strengthening

---

## 8. Clinical Pearls

1. **Quadriceps arthrogenic muscle inhibition (AMI).** After knee injury or surgery, the quadriceps are neurologically inhibited — the patient cannot fully activate the muscle even when trying maximally. This is not a simple weakness problem; it is a neural inhibition. NMES (neuromuscular electrical stimulation) has the strongest evidence for overcoming AMI. If quad activation is poor despite effort, refer to supervising PT for NMES prescription.

2. **Dynamic valgus is the master compensation.** It is the single most important movement quality assessment for the knee. Dynamic valgus during single-leg tasks correlates with ACL injury risk (especially in females), patellofemoral pain, IT band syndrome, and tibial stress fracture. It results from the combination of hip adduction, hip internal rotation, knee abduction, and tibial external rotation. Address at the hip first (gluteus medius/maximus strengthening), then train motor control with visual feedback.

3. **The kinetic chain matters more than the knee itself.** Knee pain frequently has proximal (hip weakness, core instability) and distal (ankle dorsiflexion deficit, foot overpronation) contributors. Always screen the hip and ankle in any knee presentation. A 5-degree deficit in ankle dorsiflexion causes compensatory knee valgus and increased patellofemoral joint stress.

4. **Bilateral comparison is essential, not optional.** Always compare the affected to unaffected side for ROM, strength, movement quality, and single-leg functional performance. LSI is the standard metric for rehabilitation progression decisions.

5. **Do not fear knee flexion past 90 degrees.** Common misconception is that deep squatting is harmful to the knee. In healthy knees and most pathological knees (excluding acute meniscal tears and early post-op ACL), full-depth squatting is safe and beneficial. Patellofemoral contact area increases with flexion depth, distributing force. Avoid only if specifically contraindicated.

6. **Patellar tendinopathy responds to load, not rest.** Complete rest deconditions the tendon and worsens outcomes. The evidence-based approach is graduated loading: isometrics for immediate pain relief (5 x 45s at 70 degrees), eccentric decline squats for tendon remodeling, then heavy slow resistance for restoring tendon capacity. Use the VISA-P questionnaire to track severity and progress.

7. **ACL return-to-sport timing.** Each month of rehabilitation delayed (up to 9 months) reduces reinjury risk by 51%. The current consensus favors 9-12 months minimum before return to pivoting sports, with passage of ALL criteria-based testing (not time alone). Psychological readiness (ACL-RSI score >56) is as important as physical readiness.

8. **Meniscal tears in patients over 45 are often degenerative.** These respond well to conservative management (PT) and have outcomes comparable to arthroscopic partial meniscectomy at 1-2 years (ESCAPE trial, FIDELITY trial). Surgery should not be the first-line recommendation unless there is true mechanical locking.

9. **Ice versus load for managing effusion.** While ice provides symptomatic relief, the most effective long-term effusion management is appropriate exercise dosing. If effusion increases post-exercise, the exercise intensity/volume was too high. Titrate exercise to the 24-hour effusion response rather than avoiding loading entirely.

10. **The "movie theater sign" (prolonged sitting pain) is classic PFPS.** Patellofemoral joint contact pressure increases with prolonged knee flexion (seated position compresses patella into trochlea). If a patient reports anterior knee pain that worsens after 30+ minutes of sitting and improves with walking, PFPS is the most likely diagnosis.

11. **Running cadence modification for knee offloading.** Increasing running cadence by 5-10% (from natural self-selected rate) reduces patellofemoral joint stress by approximately 14% and tibial loading. This is a first-line intervention for runners with anterior knee pain, IT band syndrome, or tibial stress injuries.

12. **Crepitus is NOT a reliable indicator of pathology.** Painless crepitus during knee flexion/extension is extremely common in asymptomatic individuals (up to 99% of knees have some crepitus). Do not alarm the patient or change the treatment plan based on crepitus alone. Only crepitus accompanied by pain is clinically relevant.

---

## 9. Outcome Measures

### KOOS (Knee Injury and Osteoarthritis Outcome Score)

- **Subscales (5):** Pain, Symptoms, ADL (Activities of Daily Living), Sport/Recreation, Quality of Life (QOL)
- **Scoring:** 42 items, each scored 0-4. Each subscale scored independently: 0 (extreme problems) to 100 (no problems). No total composite score.
- **MCID by subscale:**
  - Pain: 8 points
  - Symptoms: 8 points
  - ADL: 8 points
  - Sport/Rec: 10 points
  - QOL: 10 points
- **MDC (95% confidence):**
  - Pain: 6.1 points
  - Symptoms: 5.8 points
  - ADL: 6.3 points
  - Sport/Rec: 6.7 points
  - QOL: 7.0 points
- **Interpretation:** Subscale scores should be interpreted individually, not averaged. The Sport/Rec and QOL subscales are the most sensitive to change in active populations.
- **Reassessment frequency:** Every 4 weeks during active treatment; every 3 months during maintenance phase

### VISA-P (Victorian Institute of Sports Assessment — Patellar Tendon)

- **Scoring:** 8 items, total score 0-100. Score of 100 = fully functional, asymptomatic.
- **MCID:** 13 points
- **Interpretation:**
  - 0-30: Severe tendinopathy, significant functional limitation
  - 31-50: Moderate tendinopathy, unable to perform sport
  - 51-70: Mild-moderate, modified sport participation
  - 71-100: Minimal symptoms, near-full or full sport participation
- **Usage:** Specific to patellar tendinopathy; tracks both pain and function under load

### Lysholm Knee Score

- **Scoring:** 8 items, total 0-100
- **MCID:** 10 points
- **Interpretation:**
  - 95-100: Excellent
  - 84-94: Good
  - 65-83: Fair
  - <65: Poor
- **Usage:** General knee function, particularly validated for ligamentous injuries

### ACL-RSI (Return to Sport after Injury)

- **Scoring:** 12 items, each scored 0-10 on a visual analog scale. Average score x 10 = 0-100.
- **Threshold:** Score >56 associated with successful return to sport
- **Usage:** Measures psychological readiness for return to sport after ACL injury. Should be included in all return-to-sport decision-making alongside physical testing.

### Numeric Pain Rating Scale (NPRS)

- **Scale:** 0-10
- **MCID:** 2 points (for knee conditions)
- **Tracking points:** Current pain, worst in 24 hours, pain during specific provocative activity (e.g., stairs, squatting, running)

### Active ROM Benchmarks (Normative Values for Clinical Comparison)

| Movement | Normal Range | Functional Minimum |
|----------|-------------|-------------------|
| Knee flexion | 130-150 degrees | 110 degrees (stairs), 90 degrees (sitting), 65 degrees (walking) |
| Knee extension | 0 degrees (full extension) to -5 degrees (hyperextension) | 0 degrees — loss of terminal extension is functionally significant and must be restored early |
| Ankle dorsiflexion (knee bent — soleus) | 15-25 degrees | 10 degrees minimum for normal gait and squat mechanics |
| Ankle dorsiflexion (knee straight — gastroc) | 10-15 degrees | 5 degrees minimum |

---
