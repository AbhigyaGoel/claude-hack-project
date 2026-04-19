# Shoulder Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy shoulder module.

## Special Tests (Pose-Based)

### Hawkins-Kennedy (Subacromial Impingement)

**Setup:** Patient standing, shoulder flexed to 90 degrees, elbow flexed to 90 degrees.
**Execution via pose:** Cue patient to raise arm to shoulder height (90 deg flexion), bend elbow 90 deg, then internally rotate the forearm downward.
**Keypoint validation:** Confirm shoulder_flexion ~90 deg, elbow_flexion ~90 deg via MediaPipe landmarks 11-13-15. Measure internal rotation angle at shoulder (landmarks 13-15 relative to vertical).
**Positive finding:** Pain at anterior/lateral shoulder during internal rotation.
**Interpretation:** Supraspinatus tendon compressed under coracoacromial arch. Sensitivity 79%, Specificity 59% for subacromial impingement.

### Neer Test (Subacromial Impingement)

**Setup:** Patient standing, arm at side, thumb pointing down (pronated).
**Execution via pose:** Cue patient to lift arm straight forward overhead with thumb down.
**Keypoint validation:** Track shoulder_flexion from 0 to max via landmarks 11-13-15. Note angle at pain onset.
**Positive finding:** Pain in 70-120 deg arc (painful arc sign).
**Interpretation:** Greater tuberosity impinges on acromion. Sensitivity 72%, Specificity 60%.

### Empty Can / Jobe Test (Supraspinatus)

**Setup:** Arms abducted 90 deg in scapular plane (30 deg forward of coronal), thumbs pointing down.
**Execution via pose:** Cue patient to hold arms out like pouring a can, resist downward pressure (self-resist or gravity).
**Keypoint validation:** Shoulder abduction ~90 deg, ~30 deg forward flexion, internal rotation confirmed.
**Positive finding:** Pain or weakness (arm drops / cannot hold).
**Interpretation:** Supraspinatus pathology (tear or tendinopathy). Sensitivity 69%, Specificity 62%.

### Apprehension / Relocation (Anterior Instability)

**Setup:** Shoulder abducted 90 deg, elbow 90 deg, externally rotated.
**Execution via pose:** Cue patient to place hand behind head, then externally rotate further.
**Keypoint validation:** Confirm 90/90 position. Measure external rotation angle.
**Positive finding:** Apprehension (patient reports feeling shoulder will "come out"), not just pain.
**Interpretation:** Anterior glenohumeral instability. Sensitivity 72%, Specificity 96% (apprehension, not pain).

### Cross-Body Adduction (AC Joint)

**Setup:** Arm flexed 90 deg, adduct across body.
**Execution via pose:** Cue patient to bring arm across chest toward opposite shoulder.
**Keypoint validation:** Track horizontal adduction angle via landmarks 11-13 relative to midline.
**Positive finding:** Pain localized to top of shoulder (AC joint).
**Interpretation:** AC joint pathology (OA, sprain, osteolysis). Sensitivity 77%, Specificity 79%.

## Differential Diagnosis Decision Tree

```
Shoulder Pain Onset
|
+-- Traumatic?
|   +-- YES: Dislocation? -> Instability workup (Apprehension test)
|   |         Fall on outstretched hand? -> Fracture screen (refer imaging)
|   |         Direct blow to shoulder? -> AC joint (Cross-body test)
|   +-- NO: Insidious onset -> continue below
|
+-- Pain Location
|   +-- Anterior/lateral -> Impingement pathway
|   |   +-- Hawkins+ AND Neer+ -> Subacromial impingement (high confidence)
|   |   +-- Empty Can+ -> Supraspinatus involvement
|   |   +-- Age >50 + weakness -> Rotator cuff tear (refer imaging)
|   |   +-- Age <40 + overhead sport -> Tendinopathy / internal impingement
|   |
|   +-- Superior (top of shoulder) -> AC joint pathway
|   |   +-- Cross-body+ -> AC joint pathology
|   |
|   +-- Global / diffuse -> Adhesive capsulitis pathway
|   |   +-- Loss of passive ER >50% -> Frozen shoulder (stage?)
|   |   +-- Capsular pattern: ER > ABD > IR loss
|   |
|   +-- Posterior -> Infraspinatus / posterior capsule
|       +-- Hornblower+ -> Teres minor / infraspinatus tear
|
+-- Neurological signs? -> Refer (cervical radiculopathy, thoracic outlet)
```

## Exercise-to-Finding Matching Matrix

| Finding | Phase 1 (Acute) | Phase 2 (Subacute) | Phase 3 (Strengthening) |
|---|---|---|---|
| Subacromial impingement | Pendulums, supine ER, scapular sets | Sidelying ER, prone Y/T, wall slides | Standing ER/IR with band, overhead press progression |
| Rotator cuff tendinopathy | Isometric ER/IR at side, pendulums | Eccentric ER, sidelying ER, prone extension | Full isotonic cuff program, PNF diagonals |
| Rotator cuff tear (partial) | Pain-free AROM, isometric cuff | Submaximal isotonic cuff, scapular stabilization | Progressive resistance cuff, functional patterns |
| Anterior instability | Isometric ER in neutral, scapular retraction | Rhythmic stabilization, closed-chain push-up plus | Dynamic stabilization, plyometric progression |
| Frozen shoulder (stage 1-2) | Gentle PROM within tolerance, pendulums | End-range PROM, wall walks, pulleys | Functional ROM with strengthening at end-range |
| Frozen shoulder (stage 3) | Aggressive stretching all planes | Mobilization + stretch, functional reaching | Full strengthening through available range |
| AC joint pathology | Avoid cross-body and overhead, isometrics | Mid-range strengthening avoiding end-range | Progressive loading, sport-specific if applicable |

## Red Flags (Immediate Referral)

- **Acute traumatic deformity** (visible bump, step-off) -> possible dislocation/fracture
- **Loss of deltoid contour** with inability to abduct -> axillary nerve injury
- **Severe night pain unresponsive to position change** -> tumor, infection
- **Rapid progressive weakness** without pain -> neurological lesion
- **Bilateral shoulder pain + jaw/chest symptoms** -> cardiac referral
- **Fever + shoulder swelling** -> septic joint (emergency)
- **History of cancer + new shoulder pain** -> metastatic screen
- **Pulsatile mass or vascular changes in arm** -> vascular emergency

## Progression Criteria

Advance to next phase when ALL of the following are met for 3 consecutive sessions:
1. Pain during exercise <= 3/10 (and not increasing post-session)
2. Form quality >= 80% across all exercises
3. RPE < 5/10 for current prescription
4. No compensation patterns detected (shoulder hiking, trunk lean)

## Regression Criteria

Regress to previous phase when ANY of the following occur:
1. Pain during exercise > 5/10
2. Pain increase lasting > 2 hours post-session
3. Form quality < 50% despite verbal cueing
4. New compensation pattern emerges
5. Patient reports new radiating symptoms
6. Functional decline on DASH score (>= 6 point worsening)

## Clinical Notes

- **Painful arc (60-120 deg):** Hallmark of subacromial impingement. Pain above 120 deg more suggestive of AC joint.
- **Scapular dyskinesis:** Assess during all overhead movements. If present, add scapular stabilization regardless of primary diagnosis.
- **Cervical contribution:** Always screen cervical spine when shoulder pain has no clear mechanical pattern. Spurling test should be included in differential.
- **Diabetes association:** Frozen shoulder prevalence 10-20% in diabetic patients. Screen glucose management.
- **Post-surgical protocols:** Defer to surgeon's protocol. This skill applies to conservative management only.
