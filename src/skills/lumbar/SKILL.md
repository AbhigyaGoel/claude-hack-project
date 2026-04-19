# Lumbar Spine Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy lumbar module.

## Special Tests (Pose-Based)

### Straight Leg Raise (SLR) — Neural Tension

**Setup:** Patient supine, legs straight.
**Execution via pose:** Cue patient to lie on back, keep knee straight, and slowly raise one leg.
**Keypoint validation:** Track hip_flexion angle via landmarks 23-25 (hip-knee) with knee_extension confirmed near 0 deg. Note angle at symptom onset.
**Positive finding:** Reproduction of radicular leg pain (not just hamstring tightness) between 30-70 deg of hip flexion.
**Interpretation:** Lumbar disc herniation with nerve root compression (L4-S1). Sensitivity 91%, Specificity 26%. High sensitivity makes it a good screening tool.
**Differentiation:** Hamstring tightness = posterior thigh only. Positive SLR = pain radiating below knee, following dermatomal pattern.

### Slump Test (Neural Tension — Seated)

**Setup:** Patient seated on edge of chair, feet flat.
**Execution via pose:** Cue patient to slouch fully (thoracic flexion), then extend one knee while keeping slouched, then add ankle dorsiflexion, then add cervical flexion (chin to chest).
**Keypoint validation:** Confirm thoracic flexion, then knee_extension angle, head_flexion angle sequentially.
**Positive finding:** Reproduction of radicular symptoms with sequential loading; relieved by extending neck (removing cervical flexion component).
**Interpretation:** Neural tension / adverse neurodynamics. More sensitive than SLR for higher lumbar levels and chronic presentations. Sensitivity 84%, Specificity 83%.

### Repeated Movement Testing (McKenzie)

**Setup:** Patient standing (extension) or prone (extension), then standing (flexion).
**Execution via pose:** Cue patient to perform repeated lumbar extension (10 reps standing or prone press-ups) and repeated lumbar flexion (10 reps standing forward bend).
**Keypoint validation:** Track lumbar extension/flexion ROM via trunk angle relative to pelvis. Monitor symptom location after each set.
**Positive finding:** Classify response pattern:
- **Centralization:** Peripheral symptoms move toward midline. Favorable prognosis.
- **Peripheralization:** Symptoms move distally. Stop that direction immediately.
- **No effect:** Symptoms unchanged.
- **Abolition:** Symptoms eliminated in one direction.
**Interpretation:** Guides directional preference treatment (McKenzie MDT). Centralization with extension = posterior derangement (most common). Centralization with flexion = anterior derangement (rare).

### Prone Instability Test

**Setup:** Patient prone, trunk on table/bed, feet on floor.
**Execution via pose:** Cue patient to lie face-down on bed with legs hanging off. Assess symptoms. Then cue patient to lift legs off floor (engage extensors).
**Keypoint validation:** Confirm prone position, then hip_extension activation.
**Positive finding:** Pain present with legs relaxed, abolished when legs lifted (extensors active).
**Interpretation:** Lumbar segmental instability. Stabilization exercises are indicated. Sensitivity 72%, Specificity 58%.

## Centralization/Peripheralization Tracking

This is the MOST IMPORTANT assessment metric for lumbar patients:

```
Session tracking format:
{
  "direction_tested": "extension" | "flexion" | "lateral",
  "reps_performed": number,
  "symptom_response": "centralized" | "peripheralized" | "unchanged" | "abolished",
  "pain_location_before": "midline" | "unilateral_proximal" | "unilateral_distal" | "bilateral",
  "pain_location_after": "midline" | "unilateral_proximal" | "unilateral_distal" | "bilateral",
  "pain_intensity_before": number,
  "pain_intensity_after": number
}
```

**Treatment decision:** ALWAYS pursue the direction that centralizes. NEVER continue a direction that peripheralizes.

## McKenzie Classifications

| Classification | Directional Preference | Typical Presentation | Exercise Strategy |
|---|---|---|---|
| Derangement (posterior) | Extension | Flexion-aggravated LBP +/- leg pain, centralizes with extension | Prone press-ups, standing extension, avoid flexion |
| Derangement (anterior) | Flexion | Extension-aggravated, centralizes with flexion | Flexion in lying, seated flexion (rare, ~5% of cases) |
| Derangement (lateral) | Lateral shift correction | Visible lateral shift, requires correction before extension | Side-glide correction, then extension protocol |
| Dysfunction | End-range loading | Pain only at end-range, no centralization, chronic tissue shortening | Sustained end-range stretching in restricted direction |
| Postural | Posture correction | Pain with sustained positions only, no loss of movement | Postural education, ergonomic modification |

## Differential Diagnosis Decision Tree

```
Low Back Pain
|
+-- Red flags present? -> REFER IMMEDIATELY (see Red Flags below)
|
+-- Radicular symptoms (below knee)?
|   +-- YES:
|   |   +-- SLR positive -> Disc herniation with radiculopathy
|   |   +-- SLR negative + age >60 + bilateral -> Spinal stenosis
|   |   +-- Progressive weakness -> URGENT referral (cauda equina screen)
|   |
|   +-- NO: Axial LBP only -> continue
|
+-- Centralizes with repeated movements?
|   +-- YES -> Derangement (follow directional preference)
|   +-- NO:
|       +-- Pain only at end-range? -> Dysfunction
|       +-- Pain only with sustained posture? -> Postural syndrome
|       +-- Morning stiffness >60min + age <40 -> Inflammatory (refer rheum)
|
+-- Pain location
|   +-- Central -> Disc, facet, segmental instability
|   +-- Unilateral paraspinal -> Facet, muscle strain
|   +-- Over SI joint -> SI joint dysfunction (see below)
|   +-- Buttock/hip referral -> Facet referral, piriformis, hip pathology
|
+-- SI Joint Involvement?
|   +-- 3+ of: FABER+, Gaenslen+, compression+, distraction+, thigh thrust+
|   +-- -> SI joint dysfunction (provocation cluster)
```

## Exercise-to-Finding Matching Matrix

| Finding | Phase 1 (Acute) | Phase 2 (Subacute) | Phase 3 (Strengthening) |
|---|---|---|---|
| Disc herniation (extension responder) | Prone press-ups, repeated extension in lying | Standing extension, extension with overpressure, nerve glides | Core stabilization, deadlift progression, functional lifting |
| Disc herniation (flexion responder) | Flexion in supine (knees to chest) | Seated flexion, prayer stretch | Core stabilization, squat progression |
| Spinal stenosis | Flexion-based: stationary bike, posterior pelvic tilt | Walking program with flexion breaks, core endurance | Progressive walking distance, aquatic therapy |
| Facet syndrome | Extension avoidance, flexion stretching, rotation mobility | Core stabilization, hip mobility (especially extension) | Progressive loading in neutral spine, rotational control |
| Segmental instability | Bracing education, dead bug, bird-dog (low level) | Pallof press, plank progression, hip hinge training | Loaded carries, functional movement integration |
| SI joint dysfunction | SI belt consideration, isometric glute/adductor, pelvic floor | Bridging, clamshells, single-leg stance progression | Hip strengthening, lumbopelvic stability, functional tasks |
| Postural syndrome | Postural education, ergonomic setup, McKenzie sitting roll | Endurance positioning, standing desk protocol | Core endurance (McGill big 3), movement variability |

## Red Flags (IMMEDIATE Session Halt)

- **Cauda equina syndrome:** Bowel/bladder changes, saddle anesthesia, bilateral leg weakness -> EMERGENCY referral
- **Progressive neurological deficit:** Worsening weakness over days/weeks -> URGENT referral
- **Fever + back pain:** Spinal infection (discitis, epidural abscess) -> EMERGENCY referral
- **History of cancer + new back pain:** Metastatic disease screen -> URGENT referral
- **Significant trauma** (fall from height, MVA) + back pain -> Fracture screen
- **Unexplained weight loss** (>10 lbs in 6 months) + back pain -> Systemic disease screen
- **Night pain unresponsive to position** -> Tumor, infection screen
- **Immunosuppression** (steroids, HIV) + back pain -> Infection risk, refer
- **Age >50 with new onset LBP** + any of above -> Lower threshold for referral
- **Peripheralization that does not reverse** -> Refer for imaging and specialist evaluation

## Progression Criteria

Advance to next phase when ALL met for 3 consecutive sessions:
1. Centralization maintained or symptoms abolished
2. Pain during exercise <= 3/10
3. No peripheralization with any prescribed movement
4. Form quality >= 80% (neutral spine maintained during exercises)
5. RPE < 5/10
6. ODI improved or stable

## Regression Criteria

Regress when ANY occur:
1. Peripheralization of symptoms during or after session
2. Pain during exercise > 5/10
3. New neurological symptoms (numbness, tingling, weakness)
4. Loss of neutral spine control (form quality < 50%)
5. Increased pain lasting > 24 hours post-session
6. ODI worsening >= 6 points

## Clinical Notes

- **Centralization is the single best predictor** of good outcome in lumbar disc pathology. Track it every session.
- **McGill Big 3:** Curl-up, side plank, bird-dog. Evidence-based core endurance program for most lumbar patients. Use as baseline stabilization program.
- **Avoid flexion in acute disc patients** unless they are confirmed flexion-responders. Most disc patients are extension-responders.
- **Hip mobility:** Reduced hip extension and rotation commonly contribute to lumbar overload. Screen and address hip mobility in all lumbar patients.
- **Fear-avoidance:** Monitor for kinesiophobia. Patients who avoid all movement have worse outcomes. Use graded exposure principles.
- **Sitting tolerance:** Track and progressively increase sitting tolerance for patients with flexion-intolerant presentations.
