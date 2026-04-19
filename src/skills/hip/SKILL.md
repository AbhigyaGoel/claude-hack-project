# Hip Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy hip module.

## Special Tests (Pose-Based)

### FADIR Test (Femoroacetabular Impingement / Labral)

**Setup:** Patient supine, hip and knee flexed to 90 degrees.
**Execution via pose:** Cue patient to lie on back, pull knee to chest to 90 deg hip flexion, then bring knee across body (adduction) and rotate foot outward (internal rotation of hip).
**Keypoint validation:** Confirm hip_flexion ~90 deg via landmarks 23-25 (hip-knee), then track adduction angle (knee crossing midline) and internal rotation (foot/ankle position relative to knee).
**Positive finding:** Sharp, pinching pain in anterior groin (C-sign — patient cups hand around anterior hip).
**Interpretation:** Femoroacetabular impingement (FAI) or labral pathology. Sensitivity 96%, Specificity 17%. Very sensitive (good screening test) but not specific.

### FABER Test (Patrick's Test — SI/Hip Differentiation)

**Setup:** Patient supine.
**Execution via pose:** Cue patient to lie on back, place ankle of test leg on opposite knee (figure-4 position), then let test knee fall outward.
**Keypoint validation:** Confirm figure-4 position via landmarks. Measure distance from test knee to table/floor (or angle of hip abduction/external rotation). Compare sides.
**Positive finding:**
- **Groin pain** -> Hip joint pathology (OA, labral, FAI)
- **Posterior/SI pain** -> SI joint dysfunction
- **Asymmetric ROM** (test knee significantly higher than opposite) -> Hip capsular restriction
**Interpretation:** Differentiates hip from SI pathology based on pain location. Also assesses hip ER/ABD flexibility.

### Trendelenburg Test (Hip Abductor Strength)

**Setup:** Patient standing.
**Execution via pose:** Cue patient to stand on one leg for 30 seconds. Observe pelvis from behind (or via frontal plane keypoints).
**Keypoint validation:** Track bilateral hip landmark heights (landmarks 23 and 24) during single-leg stance. Measure pelvic drop angle on unsupported side.
**Positive finding:** Contralateral pelvis drops > 5 deg, or patient leans trunk over stance leg (compensated Trendelenburg).
**Interpretation:**
- **Positive (pelvis drops):** Gluteus medius weakness on stance leg
- **Compensated (trunk lean):** Severe gluteus medius weakness, patient compensates to shift center of gravity
**Sensitivity 73%, Specificity 77%** for gluteus medius pathology.

### Thomas Test (Hip Flexor Tightness)

**Setup:** Patient supine at edge of bed/table.
**Execution via pose:** Cue patient to lie on back at edge of bed, pull one knee to chest and hold, let other leg hang off edge.
**Keypoint validation:** Measure hanging leg's hip_flexion angle. If thigh stays above horizontal (hip flexion > 0), test is positive.
**Positive finding:**
- **Thigh rises off surface** -> Iliopsoas tightness
- **Knee extends** (loss of knee flexion) -> Rectus femoris tightness
- **Thigh abducts** -> IT band/TFL tightness
**Interpretation:** Identifies specific hip flexor component restriction. Common contributor to anterior hip pain and lumbar lordosis.

### Ober Test (IT Band/TFL Tightness)

**Setup:** Patient sidelying, test leg on top.
**Execution via pose:** Cue patient to lie on unaffected side, bend bottom knee for stability. Extend top leg behind body, then let it drop toward floor.
**Keypoint validation:** Track adduction angle of top leg. If leg remains above horizontal (cannot adduct past neutral), test is positive.
**Positive finding:** Test leg stays abducted, does not drop to table level.
**Interpretation:** IT band or TFL tightness. Common in runners, lateral hip pain, and patellofemoral dysfunction.

### Log Roll Test (Hip Joint Irritability)

**Setup:** Patient supine, leg relaxed.
**Execution via pose:** Cue patient to lie on back with legs relaxed. Slowly roll the entire leg inward and outward (passive IR and ER).
**Keypoint validation:** Track foot/ankle rotation as proxy for hip rotation. Minimal movement amplitude.
**Positive finding:** Pain with gentle passive rotation (only stresses hip capsule/joint, not muscles).
**Interpretation:** Intra-articular hip pathology (OA, labral tear, AVN, loose body). If painful, the hip joint itself is irritated.

## Differential Diagnosis Decision Tree

```
Hip/Groin Pain
|
+-- Red flags present? -> REFER IMMEDIATELY (see Red Flags below)
|
+-- Pain Location
|   +-- Anterior groin (C-sign)
|   |   +-- FADIR+ -> FAI / labral tear
|   |   +-- Log roll+ -> Intra-articular pathology (OA, AVN, labral)
|   |   +-- Age >55 + morning stiffness + ROM loss -> Hip OA
|   |   +-- Age 20-45 + athletic + mechanical symptoms -> Labral tear
|   |   +-- Age <50 + insidious + risk factors -> AVN (refer imaging)
|   |
|   +-- Lateral hip
|   |   +-- Point tenderness over greater trochanter -> Trochanteric bursitis / GTPS
|   |   +-- Trendelenburg+ -> Gluteus medius tendinopathy/tear
|   |   +-- Ober+ -> IT band syndrome
|   |   +-- Pain lying on affected side at night -> GTPS (greater trochanteric pain syndrome)
|   |
|   +-- Posterior hip/buttock
|   |   +-- FABER+ posterior -> SI joint dysfunction
|   |   +-- Deep buttock pain + SLR+ -> Lumbar radiculopathy (L4-S1)
|   |   +-- Deep buttock + piriformis stretch+ -> Piriformis syndrome / deep gluteal syndrome
|   |
|   +-- Anterior thigh
|       +-- Hip flexor pain with resisted flexion -> Iliopsoas strain/tendinopathy
|       +-- Thomas test+ -> Hip flexor tightness with secondary issues
|       +-- Femoral nerve pattern -> Lumbar radiculopathy (L2-L4)
|
+-- Mechanical symptoms?
|   +-- Clicking/catching -> Labral tear, snapping hip (internal/external)
|   +-- Locking -> Loose body, labral bucket-handle
|   +-- Giving way -> Gluteal weakness, labral instability
|
+-- Age-based considerations
    +-- Child/adolescent -> Legg-Calve-Perthes, SCFE (refer immediately)
    +-- Young adult -> FAI, labral, stress fracture
    +-- Middle age -> OA, labral degeneration, bursitis
    +-- Elderly -> OA, fracture (especially with osteoporosis), AVN
```

## Exercise-to-Finding Matching Matrix

| Finding | Phase 1 (Acute/Protected) | Phase 2 (Subacute) | Phase 3 (Strengthening/Return) |
|---|---|---|---|
| FAI (cam/pincer) | AROM within pain-free range (avoid deep flexion + IR), aquatic exercise | Hip strengthening avoiding impingement positions, core stability | Progressive loading, sport-specific (avoid end-range impingement) |
| Labral tear (conservative) | Pain-free AROM, isometric hip strengthening, avoid FADIR position | Progressive hip strengthening, core stability, proprioception | Functional loading, return to activity (avoid provocation) |
| Hip OA | Gentle AROM, aquatic exercise, stationary bike | Hip strengthening (abductors, extensors, rotators), walking program | Progressive resistance, functional training, balance |
| Trochanteric bursitis / GTPS | Avoid side-lying on affected side, isometric glute med, ice | Sidelying hip abduction, standing hip abduction, clamshells | Progressive resistance hip abductors, single-leg balance, running gait |
| Gluteus medius tendinopathy | Isometric hip abduction (pain-free positions), avoid stretch | Isotonic hip abduction (sidelying, standing), hip hikes | Heavy slow resistance, single-leg functional tasks |
| Piriformis / deep gluteal | Piriformis stretching, neural glides if sciatic component | Hip rotator strengthening, core stability, gluteal activation | Functional hip rotation control, sport-specific |
| Hip flexor strain | Rest from aggravating activities, gentle AROM | Progressive hip flexor strengthening, eccentric loading | Full hip flexor loading, running progression |
| Snapping hip (internal) | Iliopsoas stretching, avoid provocative movements | Hip flexor strengthening through range, core stability | Functional movement control, sport-specific |
| Snapping hip (external) | IT band/TFL stretching, avoid provocative positions | Gluteal strengthening, lateral hip control | Functional loading, running gait optimization |

## Red Flags (IMMEDIATE Session Halt)

- **Acute hip fracture:** Severe pain after fall + inability to bear weight + shortened/externally rotated leg -> EMERGENCY referral
- **Avascular necrosis (AVN):** Insidious groin pain + risk factors (corticosteroids, alcohol, sickle cell, radiation) -> URGENT referral for imaging
- **Septic arthritis:** Hot, swollen hip joint + fever + inability to bear weight -> EMERGENCY referral
- **Slipped capital femoral epiphysis (SCFE):** Adolescent + groin/knee pain + antalgic gait + obligate ER with flexion -> EMERGENCY referral
- **Stress fracture:** Insidious groin pain in athlete/runner + pain with hopping + risk factors (female athlete triad, rapid training increase) -> URGENT referral, non-weight-bearing
- **Progressive hip joint destruction** (rapid worsening over weeks) -> Refer for imaging (rapidly destructive OA, infection, tumor)
- **Night pain unrelated to position** -> Tumor screen
- **Referred cardiac/vascular pain** -> Iliac artery endofibrosis (cyclist), aortic aneurysm (elderly)
- **Femoral nerve palsy** (acute quad weakness + anterior thigh numbness) -> URGENT referral

## Progression Criteria

Advance to next phase when ALL met for 3 consecutive sessions:
1. Pain during exercise <= 3/10
2. No catching, locking, or giving way during exercises
3. Trendelenburg negative or improving (pelvic drop < 5 deg)
4. Form quality >= 80% (no compensatory pelvic drop, trunk lean, or Trendelenburg during single-leg exercises)
5. RPE < 5/10
6. LEFS score improving or stable

## Regression Criteria

Regress when ANY occur:
1. Pain during exercise > 5/10
2. New or increased mechanical symptoms (catching, locking, clicking with pain)
3. Increased night pain or rest pain
4. Compensated Trendelenburg pattern despite cueing
5. Form quality < 50% (significant pelvic and trunk compensations)
6. LEFS worsening >= 9 points

## Clinical Notes

- **Hip-spine interaction:** Hip OA and lumbar stenosis frequently coexist ("hip-spine syndrome"). Reduced hip ROM increases lumbar compensation. Always screen lumbar spine in hip patients and vice versa.
- **Gluteus medius is the hip's rotator cuff:** Tendinopathy and tears of gluteus medius are underdiagnosed and mimic "bursitis." Treatment is progressive loading, not stretching.
- **Avoid stretching GTPS:** Traditional IT band stretching over the greater trochanter can compress the bursa and irritated tendons. Focus on strengthening, not stretching.
- **FAI exercise modifications:** Avoid deep squat (> 90 deg hip flexion), especially with internal rotation and adduction. Use box squats, limit depth, wider stance.
- **Hip OA exercise dose:** Moderate exercise does NOT accelerate OA. Evidence strongly supports exercise as first-line treatment. Reassure patients.
- **Bilateral comparison:** Always compare hip ROM, strength, and Trendelenburg bilaterally. Asymmetry > 15% is clinically significant.
- **Gait analysis:** Single most informative functional assessment for hip patients. Look for Trendelenburg, antalgic pattern, shortened stride, toe-out.
