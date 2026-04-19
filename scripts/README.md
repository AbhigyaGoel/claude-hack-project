# Reference Pose Authoring Workflow

## Overview

Each exercise in Vero gets a pre-recorded MediaPipe keypoint timeseries of one ideal rep. This renders as an animated skeleton demo that matches the live user pose overlay exactly.

## Workflow

### 1. Source a demo video

```bash
# Download from YouTube (use PT-specific channels)
yt-dlp -f 'bestvideo[height<=720]' -o demo.mp4 "https://youtube.com/watch?v=VIDEO_ID"
```

**Quality checklist:**
- Single continuous rep, no cuts
- Fitted clothing (joints visible)
- Full body in frame
- Rep speed ≥ 2 seconds
- No on-screen graphics occluding joints
- Correct viewing angle for the exercise

### 2. Find the clean rep

```bash
# Preview with ffmpeg to find frame numbers
ffplay -vf "drawtext=text='%{n}':x=10:y=10:fontsize=24:fontcolor=white" demo.mp4
```

Note the start and end frame of one clean rep.

### 3. Generate the reference pose

```bash
npx tsx scripts/generate-reference-pose.ts \
  --video demo.mp4 \
  --exercise-id squat_bodyweight_01 \
  --start-frame 42 \
  --end-frame 98
```

This extracts frames, runs pose detection, normalizes to root coordinates, and writes to `public/reference-poses/{exercise_id}.json`.

### 4. Preview

Open the app, start a session with that exercise. The ExerciseDemo component will load and loop the reference pose.

### 5. Commit

```bash
git add public/reference-poses/squat_bodyweight_01.json
git commit -m "feat: add squat reference pose"
```

## Viewing Angle Rules

| Exercises | Required View | Why |
|-----------|--------------|-----|
| Squat, bridge, calf raise, split squat, wall sit, plank | Sagittal (side) | Knee/hip/trunk angles in sagittal plane |
| Wall slide, chin tuck, single-leg balance | Frontal (front) | Symmetry matters more than sagittal angles |
| Clamshell, dead bug | Side-lying / top-down | Unique camera positions |

## Schema

```json
{
  "fps": 30,
  "exercise_id": "squat_bodyweight_01",
  "frame_count": 56,
  "landmarks": [
    // frame 0: 33 landmarks, each [x, y, z, visibility]
    [[0.0, -1.2, 0.0, 1.0], [0.01, -1.18, 0.0, 1.0], ...],
    // frame 1...
  ]
}
```

- Coordinates are root-normalized: hip center at origin, scaled to unit torso length
- 33 MediaPipe BlazePose landmarks per frame
- fps is always 30

## Recommended Video Sources

- [E3 Rehab](https://youtube.com/@e3rehabexerciselibrary) — clinical-grade demos
- [Physiotutors](https://youtube.com/@Physiotutors) — clear angles, good framing
- [Bob & Brad](https://youtube.com/@BobAndBrad) — high volume library
