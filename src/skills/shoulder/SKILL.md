# Shoulder Clinical Skill

> Body-region clinical reasoning for Vero AI Physical Therapy shoulder module.
> This file is loaded as context by the orchestrator agent for all shoulder-related assessments, exercise prescriptions, and clinical decision-making.

---

## 1. Region Overview

### Functional Anatomy

The glenohumeral (GH) joint is a ball-and-socket joint with the greatest ROM of any joint in the body, achieved at the expense of inherent bony stability. Stability is provided by:

- **Static stabilizers:** glenoid labrum, GH ligaments (superior, middle, inferior), joint capsule, negative intra-articular pressure
- **Dynamic stabilizers:** rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis), long head of biceps, scapular stabilizers (serratus anterior, lower/middle/upper trapezius, rhomboids, levator scapulae)

The **scapulothoracic articulation** contributes approximately 60 degrees to full overhead elevation (2:1 GH-to-scapulothoracic rhythm). Disruption of this rhythm (scapular dyskinesis) is present in the majority of shoulder pathologies and must be assessed in every case.

### Common Pathologies by Prevalence

1. Rotator cuff tendinopathy / subacromial impingement (~65% of shoulder complaints)
2. Adhesive capsulitis (frozen shoulder) (~15%, higher in diabetic populations)
3. Glenohumeral instability (~8%, predominantly anterior, higher in age <30)
4. Acromioclavicular joint pathology (~5%)
5. Rotator cuff tears (partial/full) — prevalence increases with age: ~25% asymptomatic tears in age >60
6. Superior labral tears (SLAP) (~3%, predominantly overhead athletes)
7. Cervical referred pain masquerading as shoulder pain (~5-10% of presentations)

---

## 2. Special Tests (Pose-Based)

### 2.1 Hawkins-Kennedy Test (Subacromial Impingement)

- **Setup:** Patient standing, shoulder flexed to 90 degrees, elbow flexed to 90 degrees
- **Patient instruction:** "Raise your arm to shoulder height with your elbow bent at a right angle, like holding a tray. Now let your forearm drop downward toward the floor."
- **MediaPipe landmarks:** 11 (left shoulder), 13 (left elbow), 15 (left wrist) — or 12, 14, 16 for right side
- **Angle measurements:**
  - Shoulder flexion angle (landmarks 23/24-hip to 11/12-shoulder to 13/14-elbow): target 85-95 degrees
  - Elbow flexion angle (landmarks 11/12 to 13/14 to 15/16): target 85-95 degrees
  - Internal rotation angle: measure forearm deviation from horizontal (landmarks 13/14-elbow to 15/16-wrist relative to horizontal plane)
- **Positive finding:** Pain reported at anterior or lateral shoulder during passive internal rotation. Pain should reproduce the patient's chief complaint.
- **Sensitivity:** 79% | **Specificity:** 59% (Hegedus et al., 2012)
- **Clinical interpretation:** Compression of supraspinatus tendon and subacromial bursa under the coracoacromial arch. When combined with Neer test, positive predictive value for subacromial impingement increases to 75%.

### 2.2 Neer Test (Subacromial Impingement)

- **Setup:** Patient standing, arm at side, forearm pronated (thumb pointing down)
- **Patient instruction:** "Turn your thumb to point toward the floor. Now slowly raise your arm straight forward as high as you can, keeping your thumb down."
- **MediaPipe landmarks:** 11/12 (shoulder), 13/14 (elbow), 15/16 (wrist), 23/24 (hip)
- **Angle measurements:**
  - Shoulder flexion angle (hip-shoulder-elbow): track continuously from 0 to max
  - Note angle at which pain begins and ends (painful arc)
- **Positive finding:** Pain reproduced in the 70-120 degree arc (painful arc sign). Pain above 120 degrees is more suggestive of AC joint pathology.
- **Sensitivity:** 72% | **Specificity:** 60% (Hegedus et al., 2012)
- **Clinical interpretation:** Greater tuberosity impinges on the anteroinferior acromion. The painful arc between 60-120 degrees localizes subacromial structures.

### 2.3 Empty Can / Jobe Test (Supraspinatus)

- **Setup:** Arms abducted 90 degrees in the scapular plane (30 degrees forward of the coronal plane), thumbs pointing down (maximal internal rotation)
- **Patient instruction:** "Hold your arms out to the sides at shoulder height, angled slightly forward. Point your thumbs toward the floor like you are pouring out a can. Try to hold this position while I count to five."
- **MediaPipe landmarks:** 11, 12 (bilateral shoulders), 13, 14 (elbows), 15, 16 (wrists)
- **Angle measurements:**
  - Shoulder abduction (hip-shoulder-elbow in coronal plane): target 85-95 degrees
  - Scapular plane offset (forward flexion component): target 25-35 degrees
  - Arm drop: measure change in abduction angle over 5-second hold
- **Positive finding:** Pain (indicates tendinopathy) or weakness/arm drop (indicates tear). Weakness is more clinically significant than pain alone.
- **Sensitivity:** 69% (pain), 77% (weakness) | **Specificity:** 62% (pain), 68% (weakness)
- **Clinical interpretation:** Isolates supraspinatus. Weakness suggests partial or full-thickness tear, especially in patients >50 years. Compare bilaterally.

### 2.4 Apprehension and Relocation Test (Anterior Instability)

- **Setup:** Shoulder abducted 90 degrees, elbow flexed 90 degrees, maximally externally rotated
- **Patient instruction:** "Place your hand behind your head. Now slowly rotate your hand further back as if you are throwing a ball. Stop immediately if you feel your shoulder is about to slip out."
- **MediaPipe landmarks:** 11/12 (shoulder), 13/14 (elbow), 15/16 (wrist)
- **Angle measurements:**
  - Shoulder abduction (hip-shoulder-elbow): confirm 90 degrees
  - Elbow flexion (shoulder-elbow-wrist): confirm 90 degrees
  - External rotation angle: measure wrist position relative to the elbow-shoulder line in the transverse plane
- **Positive finding:** Apprehension (the feeling that the shoulder will dislocate) is a true positive. Pain alone without apprehension is NOT a positive test.
- **Sensitivity:** 72% | **Specificity:** 96% (when apprehension is the criterion)
- **Clinical interpretation:** Anterior GH instability, often from Bankart lesion (anterior labral tear) or capsular laxity. Relocation (posterior force on humeral head) that relieves apprehension confirms the diagnosis.

### 2.5 Cross-Body Adduction Test (AC Joint)

- **Setup:** Arm flexed 90 degrees, then adducted horizontally across the body
- **Patient instruction:** "Raise your arm to shoulder height, then bring it across your body toward the opposite shoulder as far as you can."
- **MediaPipe landmarks:** 11, 12 (bilateral shoulders), 13/14 (elbow of tested side)
- **Angle measurements:**
  - Shoulder flexion: confirm 90 degrees
  - Horizontal adduction angle: measure angle between the upper arm and the line connecting both shoulders (landmarks 11-12). Target: maximum adduction achievable.
- **Positive finding:** Pain localized specifically to the superior aspect of the shoulder (over the AC joint), NOT anterior or lateral.
- **Sensitivity:** 77% | **Specificity:** 79% (Chronopoulos et al., 2004)
- **Clinical interpretation:** AC joint osteoarthritis, sprain, or distal clavicle osteolysis. If pain is anterior/lateral rather than superior, consider impingement instead.

### 2.6 Lift-Off Test / Belly Press (Subscapularis)

- **Setup for Lift-Off:** Patient standing, hand placed behind the back at the level of the lumbar spine, dorsum of hand resting on the back
- **Patient instruction:** "Place the back of your hand on your lower back. Now try to push your hand away from your back without leaning forward."
- **MediaPipe landmarks:** 11/12 (shoulder), 13/14 (elbow), 15/16 (wrist), 23/24 (hip)
- **Angle measurements:**
  - Internal rotation angle: distance of wrist from the lumbar spine (wrist landmark relative to hip/shoulder vertical line)
  - Trunk compensation: monitor forward trunk lean (shoulder-hip alignment shift)
- **Positive finding:** Inability to lift hand off back, or compensation by extending the shoulder rather than internally rotating
- **Sensitivity:** 18% (lift-off alone), 60% (belly press) | **Specificity:** 100% (lift-off), 82% (belly press)
- **Clinical interpretation:** Subscapularis tear or insufficiency. The belly press modification (pressing hand into abdomen) is more sensitive and accessible for telehealth. Watch for elbow dropping posteriorly as a compensation sign.

### 2.7 Infraspinatus / External Rotation Lag Test

- **Setup:** Elbow at side, flexed 90 degrees, shoulder externally rotated near maximum
- **Patient instruction:** "Keep your elbow at your side with your arm bent at 90 degrees. Rotate your hand outward as far as possible, then try to hold it there."
- **MediaPipe landmarks:** 11/12 (shoulder), 13/14 (elbow), 15/16 (wrist)
- **Angle measurements:**
  - External rotation angle: measure angle of forearm relative to the sagittal plane
  - Lag angle: angular drop from maximum passive ER position when patient attempts to hold actively
- **Positive finding:** Lag of greater than 5 degrees (arm drops back toward midline). Lag of greater than 40 degrees suggests full-thickness tear.
- **Sensitivity:** 70% | **Specificity:** 100% for full-thickness infraspinatus tear
- **Clinical interpretation:** Infraspinatus integrity. A positive lag sign is highly specific for full-thickness tear. Compare side to side for partial involvement.

### 2.8 Speed's Test (Biceps Tendon / SLAP Lesion)

- **Setup:** Shoulder flexed 60-90 degrees, elbow fully extended, forearm supinated (palm up)
- **Patient instruction:** "Hold your arm out in front of you at shoulder height, palm facing up, elbow straight. Try to push your arm upward against resistance or hold this position."
- **MediaPipe landmarks:** 11/12 (shoulder), 13/14 (elbow), 15/16 (wrist)
- **Angle measurements:**
  - Shoulder flexion angle: target 60-90 degrees
  - Elbow extension: confirm full extension (170-180 degrees)
  - Forearm orientation: confirm supination (palm-up; wrist landmark position relative to elbow in the frontal plane)
- **Positive finding:** Pain at the anterior shoulder in the bicipital groove
- **Sensitivity:** 63% | **Specificity:** 55% (for biceps tendinopathy); 32% sensitivity for SLAP lesions
- **Clinical interpretation:** Biceps tendinopathy or SLAP lesion. Low specificity means it should be combined with other tests. Pain at the bicipital groove suggests tendinopathy; deeper or posterior pain may indicate SLAP involvement.

### 2.9 Passive Range of Motion Assessment (Adhesive Capsulitis Screen)

- **Setup:** Patient standing or seated. Assess flexion, abduction, external rotation, and internal rotation (hand behind back)
- **Patient instruction:** "Raise your arm as high as you can in front of you. Now out to the side. Now with your elbow at your side, rotate your hand outward. Finally, reach behind your back as high as you can."
- **MediaPipe landmarks:** All upper extremity landmarks bilaterally for comparison
- **Angle measurements:**
  - Flexion (hip-shoulder-elbow): compare left vs. right
  - Abduction (hip-shoulder-elbow in coronal plane): compare left vs. right
  - External rotation at 0 degrees abduction: forearm angle from sagittal
  - Internal rotation: hand-behind-back reach level (vertebral level estimation)
- **Positive finding:** Capsular pattern — loss of ER > loss of abduction > loss of flexion, with restriction in BOTH active and passive ROM (patient reports stiffness at end range, not just pain)
- **Sensitivity/specificity:** Not a single test; the capsular pattern combined with >50% ER loss has a positive predictive value of 90% for adhesive capsulitis
- **Clinical interpretation:** Adhesive capsulitis (frozen shoulder) staging:
  - Stage 1 (Freezing, 0-3 months): pain predominant, minimal ROM loss
  - Stage 2 (Freezing, 3-9 months): progressive stiffness, pain persists
  - Stage 3 (Frozen, 9-15 months): stiffness predominant, pain decreasing
  - Stage 4 (Thawing, 15-24 months): gradual ROM return

---

## 3. Differential Diagnosis Decision Tree

```
SHOULDER PAIN PRESENTATION
|
+-- STEP 1: Screen Red Flags (Section 6) --> If present, STOP and REFER
|
+-- STEP 2: Onset Type
|   +-- TRAUMATIC
|   |   +-- Mechanism: Fall on outstretched hand (FOOSH)
|   |   |   +-- Deformity present? --> Fracture/dislocation (refer imaging)
|   |   |   +-- No deformity + point tender clavicle/AC --> AC sprain (Cross-body test)
|   |   |   +-- No deformity + diffuse shoulder pain --> Rotator cuff contusion vs. tear
|   |   |
|   |   +-- Mechanism: Direct blow to lateral shoulder
|   |   |   +-- Step-off deformity at AC joint --> AC separation (grade I-VI)
|   |   |   +-- Loss of deltoid contour --> Dislocation (refer emergency)
|   |   |
|   |   +-- Mechanism: Forced abduction/external rotation
|   |   |   +-- History of "arm going dead" or subluxation --> Anterior instability
|   |   |   +-- Apprehension test positive --> Bankart lesion likely
|   |   |
|   |   +-- Mechanism: Traction injury (arm pulled)
|   |       +-- Neurological symptoms (numbness, weakness) --> Brachial plexus (refer)
|   |       +-- No neuro signs + anterior pain --> Biceps/labral injury
|   |
|   +-- ATRAUMATIC / INSIDIOUS
|       +-- Continue to Step 3
|
+-- STEP 3: Pain Location
|   +-- ANTERIOR / LATERAL
|   |   +-- Hawkins+ AND Neer+ --> SUBACROMIAL IMPINGEMENT pathway
|   |   |   +-- Empty Can: pain only --> Supraspinatus tendinopathy
|   |   |   +-- Empty Can: weakness --> Supraspinatus tear (partial vs. full)
|   |   |   |   +-- Age >50 + progressive weakness --> Full-thickness tear likely (refer imaging)
|   |   |   |   +-- Age <50 + pain predominant --> Partial tear / tendinopathy
|   |   |   +-- Painful arc 60-120 deg --> Subacromial bursitis / tendinopathy
|   |   |   +-- Pain >120 deg only --> AC joint (confirm with cross-body test)
|   |   |
|   |   +-- Hawkins+ but Neer- (or vice versa)
|   |   |   +-- Speed's test+ --> Biceps tendinopathy or SLAP
|   |   |   +-- Overhead athlete + deep anterior pain --> Internal impingement
|   |   |
|   |   +-- Neither Hawkins nor Neer positive
|   |       +-- Apprehension test+ --> Anterior instability
|   |       +-- Speed's test+ --> Biceps pathology
|   |       +-- Consider cervical referral (see Step 5)
|   |
|   +-- SUPERIOR (top of shoulder)
|   |   +-- Cross-body test+ --> AC JOINT pathway
|   |   |   +-- Insidious + age >40 --> AC osteoarthritis
|   |   |   +-- Weightlifter / overhead sport --> Distal clavicle osteolysis
|   |   |   +-- Post-traumatic --> AC sprain (grade by severity)
|   |   +-- Cross-body test- --> Cervical referral, trapezius strain
|   |
|   +-- POSTERIOR
|   |   +-- ER lag sign+ --> Infraspinatus / teres minor tear
|   |   +-- Tight posterior capsule (loss of IR) --> Posterior capsule tightness
|   |   |   +-- Overhead athlete --> GIRD (glenohumeral internal rotation deficit)
|   |   +-- Scapular border pain --> Scapular dyskinesis / periscapular muscle pathology
|   |
|   +-- GLOBAL / DIFFUSE
|       +-- PROM restricted in capsular pattern (ER > ABD > flex)
|       |   +-- Loss of passive ER >50% vs. contralateral --> ADHESIVE CAPSULITIS
|       |   |   +-- Onset <3 months, pain > stiffness --> Stage 1
|       |   |   +-- 3-9 months, increasing stiffness --> Stage 2
|       |   |   +-- 9-15 months, stiffness plateau --> Stage 3
|       |   |   +-- >15 months, improving ROM --> Stage 4
|       |   +-- Diabetes, thyroid disease, Dupuytren --> Higher risk for frozen shoulder
|       |
|       +-- PROM NOT restricted
|           +-- Night pain predominant --> Rule out tumor, infection
|           +-- Position-dependent relief --> Cervical referral pattern
|
+-- STEP 4: Instability Pathway (if suspected)
|   +-- ANTERIOR (most common, ~95%)
|   |   +-- Apprehension+ at 90/90 --> Anterior instability
|   |   +-- Recurrent subluxation episodes --> Structural Bankart vs. capsular laxity
|   |   +-- Age <25 + first dislocation --> High recurrence risk (~70%), consider surgical referral
|   |
|   +-- POSTERIOR (rare, ~2-5%)
|   |   +-- Pain with forward flexion + internal rotation + axial load
|   |   +-- Posterior apprehension test
|   |   +-- Seizure or electrocution history --> posterior dislocation (often missed)
|   |
|   +-- MULTIDIRECTIONAL (MDI)
|       +-- Sulcus sign positive (>2 cm inferior translation)
|       +-- Generalized ligamentous laxity (Beighton score >= 4)
|       +-- Bilateral symptoms common
|       +-- Conservative management first-line (scapular/rotator cuff strengthening)
|
+-- STEP 5: Cervical Contribution Screening
|   +-- Spurling test (neck extension + lateral flexion + compression)
|   +-- Dermatomal pattern (C5: lateral deltoid; C6: thumb/index; C7: middle finger)
|   +-- Neck ROM limitation or pain
|   +-- If positive --> Cervical radiculopathy (co-manage or refer)
|
+-- STEP 6: Referred Pain Screening
    +-- Chest pain / shortness of breath --> Cardiac (refer emergency)
    +-- Left shoulder + epigastric --> Splenic/cardiac (Kehr sign)
    +-- Right shoulder + RUQ pain --> Hepatic/gallbladder referral
    +-- Bilateral + systemic symptoms --> Polymyalgia rheumatica, RA (refer rheumatology)
```

---

## 4. Exercise-to-Finding Matrix

### Subacromial Impingement

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | Pendulums (Codman), supine passive ER, scapular squeezes/sets, cervical retraction | Pain-free only; avoid elevation >90 deg |
| Phase 2 (Subacute, 2-6 weeks) | Sidelying ER, prone Y/T/W, wall slides to tolerance, scapular clock exercises | Progressive ROM; stay below pain threshold |
| Phase 3 (Strengthening, 6-12 weeks) | Standing ER/IR with band, full can raises, rows, push-up plus, overhead press progression | Load progressively; monitor for painful arc |
| Phase 4 (Return to function, 12+ weeks) | Sport-specific overhead drills, plyometric tosses, PNF diagonals, interval throwing | Functional loading; sport simulation |
| **Contraindications** | Avoid behind-the-neck press, upright rows, dips with forward lean, combined abduction + internal rotation under load |

### Rotator Cuff Tendinopathy

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | Isometric ER/IR at 0 deg abduction (5-second holds), pendulums, scapular retraction | Isometrics at pain-free angles; ice post-exercise |
| Phase 2 (Subacute, 2-6 weeks) | Eccentric ER with band, sidelying ER, prone extension, low rows | Eccentric emphasis; 3-second lowering phase |
| Phase 3 (Strengthening, 6-12 weeks) | Full isotonic cuff program (ER/IR/flexion/extension), PNF D1/D2, rhythmic stabilization | Progressive resistance; bilateral comparison |
| Phase 4 (Return to function, 12+ weeks) | Heavy slow resistance, sport-specific loading patterns, overhead endurance training | Load management; monitor for overuse recurrence |
| **Contraindications** | Avoid maximal effort through painful arc, rapid ballistic overhead movements in early phases |

### Rotator Cuff Tear (Partial, Conservative)

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Protected, 0-4 weeks) | Pain-free AROM, isometric cuff in neutral, scapular stabilization, pendulums | Protect healing tissue; no resistance |
| Phase 2 (Active, 4-8 weeks) | Submaximal isotonic cuff (<50% max), scapular PNF, closed-chain weight shifts | Gradual loading; no sharp pain |
| Phase 3 (Strengthening, 8-16 weeks) | Progressive resistance cuff, functional reaching patterns, proprioceptive training | Build endurance before strength |
| Phase 4 (Return to function, 16+ weeks) | Occupation-specific tasks, overhead endurance, dynamic stabilization drills | Functional demand matching |
| **Contraindications** | Avoid heavy overhead pressing, maximal effort testing until cleared, sudden eccentric loading |

### Anterior Instability

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-3 weeks) | Isometric ER in neutral, scapular retraction, deltoid isometrics, elbow/wrist AROM | Avoid apprehension position (ABD + ER) |
| Phase 2 (Subacute, 3-8 weeks) | Rhythmic stabilization, closed-chain push-up plus, perturbation training, prone rows | Controlled mid-range only |
| Phase 3 (Strengthening, 8-16 weeks) | Dynamic stabilization, progressive ER strengthening, proprioceptive neuromuscular facilitation | Gradual end-range exposure |
| Phase 4 (Return to sport, 16+ weeks) | Plyometric progression, sport-specific drills, overhead confidence building | Must demonstrate dynamic stability |
| **Contraindications** | Avoid forced ER at 90 deg ABD, behind-the-neck exercises, bench press with excessive depth, sleeping with arm overhead |

### Adhesive Capsulitis (by Stage)

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Stage 1 (Freezing, pain dominant) | Gentle PROM within pain tolerance, pendulums, submaximal isometrics, heat prior to ROM | Do NOT force ROM; focus on pain management |
| Stage 2 (Progressive stiffness) | End-range PROM in all planes, wall walks, pulley-assisted elevation, contract-relax stretching | Gradually increase end-range time |
| Stage 3 (Frozen, stiffness dominant) | Aggressive stretching all planes, joint mobilization cues, sustained holds at end-range, functional reaching | Stretch tolerance is key metric |
| Stage 4 (Thawing) | Progressive strengthening through recovering range, functional task training, overhead endurance | Strengthen as ROM returns |
| **Contraindications** | Avoid aggressive manipulation in Stage 1, forceful stretching into significant pain, high-velocity movements |

### AC Joint Pathology

| Phase | Exercises | Key Parameters |
|-------|-----------|----------------|
| Phase 1 (Acute, 0-2 weeks) | Isometrics below 60 deg, scapular retraction, elbow/wrist ROM, pendulums | Avoid cross-body and overhead positions |
| Phase 2 (Subacute, 2-6 weeks) | Mid-range strengthening (flexion/abduction to 90 deg), rows, bicep curls | Avoid end-range horizontal adduction |
| Phase 3 (Strengthening, 6-12 weeks) | Progressive overhead loading, push-ups, bench press with limited depth | Gradually reintroduce cross-body |
| Phase 4 (Return to function, 12+ weeks) | Sport-specific loading, contact preparation if applicable | Full loading tolerance |
| **Contraindications** | Avoid dips, wide-grip bench press, cross-body movements in early phases, direct pressure on AC joint |

---

## 5. Angle Windows per Exercise

```json
[
  {
    "exercise": "Wall Slide",
    "primary_joint": "shoulder_flexion",
    "target_range": [0, 150],
    "critical_angles": { "start": 0, "mid": 90, "end": 150 },
    "tempo": "2s up, 2s hold, 2s down",
    "compensation_windows": {
      "scapular_elevation": { "max_degrees": 15, "description": "Excessive upper trap activation / shoulder hiking" },
      "lumbar_extension": { "max_degrees": 5, "description": "Arching low back to compensate for shoulder flexion deficit" },
      "elbow_flexion": { "max_degrees": 10, "description": "Bending elbows to reduce shoulder demand" }
    }
  },
  {
    "exercise": "Sidelying External Rotation",
    "primary_joint": "shoulder_external_rotation",
    "target_range": [0, 60],
    "critical_angles": { "start": 0, "mid": 30, "end": 60 },
    "tempo": "2s up, 1s hold, 3s down (eccentric emphasis)",
    "compensation_windows": {
      "trunk_rotation": { "max_degrees": 10, "description": "Rolling backward to use gravity assistance" },
      "elbow_abduction": { "max_degrees": 5, "description": "Elbow lifting away from side" }
    }
  },
  {
    "exercise": "Standing Band External Rotation",
    "primary_joint": "shoulder_external_rotation",
    "target_range": [0, 45],
    "critical_angles": { "start": 0, "mid": 25, "end": 45 },
    "tempo": "2s out, 1s hold, 2s return",
    "compensation_windows": {
      "elbow_abduction": { "max_degrees": 5, "description": "Elbow drifting away from torso" },
      "trunk_rotation": { "max_degrees": 8, "description": "Rotating trunk to assist movement" },
      "wrist_extension": { "max_degrees": 15, "description": "Compensating with wrist motion" }
    }
  },
  {
    "exercise": "Prone Y Raise",
    "primary_joint": "shoulder_flexion_scapular_plane",
    "target_range": [0, 130],
    "critical_angles": { "start": 0, "mid": 90, "end": 130 },
    "tempo": "2s up, 2s hold, 2s down",
    "compensation_windows": {
      "scapular_elevation": { "max_degrees": 12, "description": "Shrugging shoulders toward ears" },
      "lumbar_extension": { "max_degrees": 8, "description": "Hyperextending low back" },
      "cervical_extension": { "max_degrees": 10, "description": "Looking up excessively" }
    }
  },
  {
    "exercise": "Prone T Raise",
    "primary_joint": "shoulder_horizontal_abduction",
    "target_range": [0, 90],
    "critical_angles": { "start": 0, "mid": 45, "end": 90 },
    "tempo": "2s up, 2s hold, 2s down",
    "compensation_windows": {
      "scapular_elevation": { "max_degrees": 10, "description": "Compensatory upper trap" },
      "elbow_flexion": { "max_degrees": 10, "description": "Bending elbow to shorten lever arm" }
    }
  },
  {
    "exercise": "Full Can Raise (Scapular Plane Elevation)",
    "primary_joint": "shoulder_abduction_scapular_plane",
    "target_range": [0, 120],
    "critical_angles": { "start": 0, "mid": 60, "end": 120 },
    "tempo": "2s up, 1s hold, 3s down",
    "compensation_windows": {
      "trunk_lateral_lean": { "max_degrees": 8, "description": "Leaning away from working arm" },
      "scapular_elevation": { "max_degrees": 15, "description": "Shoulder hiking" }
    }
  },
  {
    "exercise": "Pendulum (Codman)",
    "primary_joint": "shoulder_flexion",
    "target_range": [0, 30],
    "critical_angles": { "start": 0, "mid": 15, "end": 30 },
    "tempo": "passive, rhythmic, 30-60 seconds per direction",
    "compensation_windows": {
      "active_muscle_use": { "max_degrees": 0, "description": "Should be fully passive, gravity-driven" },
      "trunk_sway": { "max_degrees": 10, "description": "Body generating movement, not gravity" }
    }
  },
  {
    "exercise": "Push-Up Plus",
    "primary_joint": "scapular_protraction",
    "target_range": [0, 30],
    "critical_angles": { "start": 0, "mid": 15, "end": 30 },
    "tempo": "2s protraction, 2s hold, 2s return",
    "compensation_windows": {
      "lumbar_sag": { "max_degrees": 10, "description": "Hips dropping, loss of plank position" },
      "cervical_protrusion": { "max_degrees": 15, "description": "Head dropping forward" },
      "scapular_winging": { "max_degrees": 0, "description": "Medial scapular border lifting off thorax" }
    }
  }
]
```

---

## 6. Red Flags (Immediate Referral Required)

| Red Flag | Possible Condition | Action |
|----------|-------------------|--------|
| Acute traumatic deformity (visible bump, step-off, loss of deltoid contour) | Fracture, dislocation, AC separation (grade III+) | Refer emergency / orthopedics immediately |
| Loss of deltoid contour with inability to abduct | Axillary nerve injury (post-dislocation) | Refer neurology / orthopedics |
| Severe night pain unresponsive to any position change | Tumor, infection, advanced rotator cuff tear | Refer for imaging and workup |
| Rapid progressive weakness without significant pain | Neurological lesion (Parsonage-Turner syndrome, cervical myelopathy) | Refer neurology urgently |
| Bilateral shoulder pain with jaw pain, chest tightness, or shortness of breath | Cardiac event (referred pain pattern) | Refer emergency immediately |
| Fever (>38.5C / 101.3F) combined with shoulder joint swelling, warmth, redness | Septic arthritis | Refer emergency — do not delay |
| History of cancer with new onset shoulder pain, especially at rest | Metastatic bone disease (humerus, scapula) | Refer oncology for imaging |
| Pulsatile mass or vascular changes in upper extremity (color, temperature, pulse) | Vascular emergency (subclavian/axillary pathology) | Refer vascular surgery |
| Progressive bilateral shoulder stiffness + hip stiffness + elevated ESR in age >50 | Polymyalgia rheumatica | Refer rheumatology |
| Acute onset of complete inability to raise arm after trauma with no prior symptoms | Full-thickness rotator cuff avulsion, fracture | Refer orthopedics for imaging |

---

## 7. Progression and Regression Criteria

### Progression Criteria

Advance to the next phase when ALL of the following are met for 3 consecutive sessions:

1. **Pain:** Exercise-related pain <= 3/10 AND pain does not increase >2 points post-session lasting more than 2 hours
2. **Form quality:** >= 80% of repetitions performed within acceptable compensation windows (Section 5)
3. **RPE:** < 5/10 for the current exercise prescription
4. **Compensation patterns:** No persistent shoulder hiking (>15 deg scapular elevation), trunk lean (>8 deg lateral deviation), or substitution patterns detected by pose analysis
5. **ROM:** Active ROM within 10 degrees of the target for the current phase
6. **Patient-reported confidence:** >= 6/10 self-rated confidence in performing current-phase exercises independently

### Regression Criteria

Regress to the previous phase when ANY of the following occur:

1. **Pain:** Exercise pain > 5/10 on two or more consecutive sessions
2. **Post-session flare:** Pain increase lasting >2 hours after session on two or more occasions
3. **Form breakdown:** Form quality < 50% despite verbal and visual cueing corrections
4. **New compensation:** Emergence of a new compensation pattern not present previously (e.g., new shoulder hiking, trunk rotation)
5. **Radiating symptoms:** Patient reports new radiating pain, numbness, or tingling into the arm
6. **Functional decline:** DASH score worsening by >= 6 points (exceeds MCID in the negative direction)
7. **Effusion or swelling:** New onset of visible or reported shoulder swelling
8. **Night pain escalation:** Increase in night pain frequency or severity over current phase baseline

---

## 8. Clinical Pearls

1. **Painful arc localization:** Pain between 60-120 degrees of abduction points to subacromial structures. Pain above 120 degrees suggests AC joint pathology. Both can coexist, so test the full arc.

2. **Scapular dyskinesis is not a diagnosis — it is a sign.** It is present in the majority of shoulder pathologies. Always assess it, always address it, but always look for the underlying cause.

3. **Cluster testing improves accuracy.** No single shoulder special test has sufficient sensitivity and specificity in isolation. Use test clusters: Hawkins + Neer + painful arc for impingement (sensitivity 75%, specificity 74% when 2/3 positive). Apprehension + relocation for instability (specificity >95%).

4. **Cervical spine screening is mandatory.** Between 5-10% of patients presenting with "shoulder pain" have cervical radiculopathy as the primary or contributory source. Always perform Spurling's test and a dermatomal screen (C5/C6/C7).

5. **Diabetes and frozen shoulder.** Adhesive capsulitis prevalence is 10-20% in diabetic populations (vs. 2-5% general). Always ask about diabetes history. Diabetic frozen shoulders tend to be more resistant to treatment and take longer to resolve.

6. **Age-dependent interpretation of rotator cuff findings.** Asymptomatic full-thickness rotator cuff tears are present in approximately 25% of individuals over age 60 and 50% over age 80. MRI findings must be correlated with clinical presentation. Treat the patient, not the image.

7. **Eccentric loading for tendinopathy.** Evidence supports eccentric exercise as superior to concentric for rotator cuff tendinopathy. Prescribe 3-second eccentric lowering phases. Pain up to 4/10 during eccentric loading is acceptable and does not indicate harm.

8. **Scapular stabilization before rotator cuff strengthening.** A stable scapular base is required for effective rotator cuff function. Address serratus anterior and lower trapezius activation before progressing to isolated cuff strengthening.

9. **The "empty can" vs. "full can" debate.** The full can position (thumb up, scapular plane) produces similar supraspinatus activation with less subacromial compression than the empty can position. Prefer full can for rehabilitation exercises; use empty can for provocative testing.

10. **Posterior capsule tightness drives anterior symptoms.** GIRD (glenohumeral internal rotation deficit) shifts the humeral head anteriorly and superiorly, contributing to impingement and labral pathology. Measure bilateral IR difference. A deficit >15 degrees warrants sleeper stretches and cross-body stretching.

11. **The kinetic chain in overhead athletes.** Shoulder velocity in throwing is generated primarily from the legs and trunk (approximately 50% of ball velocity). Shoulder rehabilitation for overhead athletes must include lower extremity and core assessment.

12. **Post-injection exercise timing.** After corticosteroid injection, relative rest for 2 weeks is recommended. Tendon rupture risk is elevated for 4-6 weeks post-injection. Adjust exercise intensity accordingly and avoid maximal loading.

---

## 9. Outcome Measures

### DASH (Disabilities of the Arm, Shoulder, and Hand)

- **Scoring:** 30 items, each scored 1-5. Formula: ((sum of responses / number of completed items) - 1) x 25. Score range: 0 (no disability) to 100 (maximum disability).
- **MCID (Minimal Clinically Important Difference):** 10.2 points (general shoulder), 10.8 points (surgical populations)
- **MDC (Minimal Detectable Change):** 12.7 points (95% confidence)
- **Interpretation thresholds:**
  - 0-20: Minimal disability (normal function with minor limitations)
  - 21-40: Mild disability (difficulty with demanding tasks)
  - 41-60: Moderate disability (significant functional limitation)
  - 61-80: Severe disability (difficulty with most ADLs)
  - 81-100: Extreme disability (near-complete functional loss)
- **Reassessment frequency:** Every 4 weeks during active treatment

### Penn Shoulder Score

- **Components:** Pain (30 points), satisfaction (10 points), function (60 points). Total: 100 points.
- **MCID:** 11.4 points
- **Usage:** More granular than DASH for shoulder-specific function

### Visual Analog Scale (VAS) for Pain

- **Scale:** 0-10 (or 0-100 mm)
- **MCID:** 1.4 points (0-10 scale), 14 mm (0-100 scale)
- **Tracking points:** Current pain, worst pain in last 24 hours, best pain in last 24 hours, pain with specific provocative movement

### Active ROM Benchmarks (Normative Values for Clinical Comparison)

| Movement | Normal Range | Functional Minimum |
|----------|-------------|-------------------|
| Flexion | 160-180 deg | 120 deg (overhead reach) |
| Abduction | 160-180 deg | 120 deg (overhead reach) |
| External rotation (at 0 deg ABD) | 60-90 deg | 45 deg (hand behind head) |
| Internal rotation (at 0 deg ABD) | 60-80 deg | T12 vertebral level (hand behind back) |
| Horizontal adduction | 130 deg | 90 deg (cross-body reach) |

---
