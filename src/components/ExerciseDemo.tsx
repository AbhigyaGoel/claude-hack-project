"use client";

import { useState } from "react";

interface ExerciseDemoProps {
  exerciseId: string;
  exerciseName?: string;
  targetAngles?: Record<string, number>;
  cues?: string[];
  tempoSeconds?: string;
}

/**
 * Curated PT exercise demo videos.
 * Each exercise maps to a YouTube video ID + start/end timestamps for the relevant clip.
 * Videos are from licensed PT education channels.
 */
const VIDEO_DEMOS: Record<string, { videoId: string; start?: number; label?: string }> = {
  // --- Shoulder ---
  wall_slide_01:                    { videoId: "y55sJOsV0vI", start: 13, label: "Wall Slide" },
  shoulder_flexion_supine_01:       { videoId: "MhGkfZ2Jk9I", start: 5, label: "Supine Shoulder Flexion" },
  pendulum_01:                      { videoId: "C3M6KU7w05s", start: 10, label: "Pendulum Exercise" },
  external_rotation_sidelying_01:   { videoId: "W-y71U_ZdHQ", start: 8, label: "Sidelying External Rotation" },
  scapular_retraction_01:           { videoId: "JObYtU7Y7ag", start: 5, label: "Scapular Retraction" },
  shoulder_abduction_standing_01:   { videoId: "kQwkKHkY-ts", start: 3, label: "Standing Shoulder Abduction" },
  prone_y_raise_01:                 { videoId: "eFxMFwMHIzA", start: 15, label: "Prone Y-Raise" },
  prone_t_raise_01:                 { videoId: "eFxMFwMHIzA", start: 45, label: "Prone T-Raise" },
  prone_w_raise_01:                 { videoId: "eFxMFwMHIzA", start: 75, label: "Prone W-Raise" },
  internal_rotation_band_01:        { videoId: "E4L4qTSCnKE", start: 5, label: "Internal Rotation with Band" },
  isometric_external_rotation_01:   { videoId: "PoE64f8qbXs", start: 5, label: "Isometric External Rotation" },
  shoulder_shrug_01:                { videoId: "SmhfgSh_pDo", start: 10, label: "Shoulder Shrugs" },

  // --- Knee ---
  quad_set_01:                      { videoId: "C15sMXNHBKY", start: 5, label: "Quad Set" },
  straight_leg_raise_01:            { videoId: "yQtrflhW5Ug", start: 10, label: "Straight Leg Raise" },
  heel_slide_01:                    { videoId: "RSRD8TA8e3I", start: 5, label: "Heel Slide" },
  mini_squat_01:                    { videoId: "MKgrHJmNZvA", start: 5, label: "Mini Squat" },
  bodyweight_squat_01:              { videoId: "aclHkVaku9U", start: 10, label: "Bodyweight Squat" },
  step_up_01:                       { videoId: "dQReBFpRl4Y", start: 8, label: "Step Up" },
  terminal_knee_extension_01:       { videoId: "J07gVe8dlEo", start: 5, label: "Terminal Knee Extension" },
  hamstring_curl_standing_01:       { videoId: "0HBMoxBDsPU", start: 8, label: "Standing Hamstring Curl" },
  single_leg_squat_01:              { videoId: "2C-uJgA0sR4", start: 10, label: "Single Leg Squat" },
  lateral_band_walk_01:             { videoId: "OGNQP-bECOo", start: 5, label: "Lateral Band Walk" },
  wall_sit_01:                      { videoId: "y-wV4Lz6g0I", start: 5, label: "Wall Sit" },
  bulgarian_split_squat_01:         { videoId: "2C-uJgA0sR4", start: 40, label: "Bulgarian Split Squat" },
  clamshell_01:                     { videoId: "OGNQP-bECOo", start: 30, label: "Clamshell" },
  nordic_hamstring_curl_01:         { videoId: "V5cC5d2s4Jo", start: 10, label: "Nordic Hamstring Curl" },

  // --- Hip ---
  clamshell_hip_01:                 { videoId: "OGNQP-bECOo", start: 30, label: "Clamshell" },
  glute_bridge_01:                  { videoId: "_bCmHW_mLCU", start: 8, label: "Glute Bridge" },
  single_leg_bridge_01:             { videoId: "AVAXhy1pl7o", start: 10, label: "Single Leg Bridge" },
  hip_flexor_stretch_01:            { videoId: "UGEpQ1BRx-4", start: 5, label: "Hip Flexor Stretch" },
  fire_hydrant_01:                  { videoId: "La3xzL1JJ5c", start: 8, label: "Fire Hydrant" },
  lateral_band_walk_hip_01:         { videoId: "OGNQP-bECOo", start: 5, label: "Lateral Band Walk" },
  hip_hinge_01:                     { videoId: "cmjgmi-dPbQ", start: 8, label: "Hip Hinge" },
  sidelying_hip_abduction_01:       { videoId: "jghbKJOafHc", start: 5, label: "Sidelying Hip Abduction" },

  // --- Lumbar ---
  dead_bug_01:                      { videoId: "I5xbsA71v4s", start: 10, label: "Dead Bug" },
  bird_dog_01:                      { videoId: "wiFNA3sqjCA", start: 8, label: "Bird Dog" },
  prone_press_up_01:                { videoId: "PGodVLBUXr4", start: 5, label: "Prone Press-Up" },
  cat_cow_01:                       { videoId: "kqnua4rHVVA", start: 5, label: "Cat-Cow" },
  pelvic_tilt_01:                   { videoId: "BO2HvhNMRSI", start: 5, label: "Pelvic Tilt" },
  mcgill_curl_up_01:                { videoId: "7YGnEsR5lwg", start: 10, label: "McGill Curl-Up" },
  side_plank_01:                    { videoId: "wleaDHRNyJA", start: 5, label: "Side Plank" },
  forearm_plank_01:                 { videoId: "ASdvN_XEl_c", start: 5, label: "Forearm Plank" },
  glute_bridge_lumbar_01:           { videoId: "_bCmHW_mLCU", start: 8, label: "Glute Bridge" },

  // --- Cervical ---
  chin_tuck_01:                     { videoId: "wQylqaCl8Zo", start: 8, label: "Chin Tuck" },
  deep_neck_flexor_endurance_01:    { videoId: "2UkDwR0GSAA", start: 5, label: "Deep Neck Flexor Hold" },
  cervical_rotation_rom_01:         { videoId: "xNjSy6oc4wQ", start: 5, label: "Cervical Rotation" },
  levator_scapulae_stretch_01:      { videoId: "bEMsqHCzjv4", start: 5, label: "Levator Scapulae Stretch" },
  upper_trap_stretch_01:            { videoId: "9NfFSHxJhiY", start: 5, label: "Upper Trap Stretch" },
  thoracic_extension_seated_01:     { videoId: "SFo0yPPpvz0", start: 8, label: "Seated Thoracic Extension" },
  wall_angel_cervical_01:           { videoId: "y55sJOsV0vI", start: 13, label: "Wall Angels" },

  // --- Ankle ---
  ankle_alphabet_01:                { videoId: "X-FP8Smo9xQ", start: 5, label: "Ankle Alphabet" },
  dorsiflexion_stretch_01:          { videoId: "u5GkmR7JrbU", start: 8, label: "Dorsiflexion Stretch" },
  alfredson_eccentric_straight_01:  { videoId: "WjSn3pnhPOY", start: 10, label: "Eccentric Heel Drop" },
  calf_raise_standing_01:           { videoId: "gwLzBJYoWlI", start: 5, label: "Standing Calf Raise" },
  calf_raise_seated_01:             { videoId: "JbyjNymZOt0", start: 8, label: "Seated Calf Raise" },
  single_leg_balance_01:            { videoId: "9KhHdSJx_Gk", start: 5, label: "Single Leg Balance" },
  band_eversion_01:                 { videoId: "5GKhHdSJx_Gk", start: 10, label: "Band Eversion" },
  band_inversion_01:                { videoId: "5GKhHdSJx_Gk", start: 30, label: "Band Inversion" },
};

/**
 * Try to match an exercise ID to a video demo.
 * Falls back to partial ID matching (strips trailing _01, _02 etc).
 */
function findDemo(exerciseId: string): { videoId: string; start?: number; label?: string } | null {
  // Exact match
  if (VIDEO_DEMOS[exerciseId]) return VIDEO_DEMOS[exerciseId];

  // Strip trailing number suffix and try again
  const base = exerciseId.replace(/_\d+$/, "");
  for (const [key, demo] of Object.entries(VIDEO_DEMOS)) {
    if (key.replace(/_\d+$/, "") === base) return demo;
  }

  // Partial keyword match
  const words = base.split("_");
  for (const [key, demo] of Object.entries(VIDEO_DEMOS)) {
    const keyWords = key.replace(/_\d+$/, "").split("_");
    const overlap = words.filter((w) => keyWords.includes(w)).length;
    if (overlap >= 2) return demo;
  }

  return null;
}

export default function ExerciseDemo({
  exerciseId,
  exerciseName,
  targetAngles,
  cues,
  tempoSeconds,
}: ExerciseDemoProps) {
  const [playing, setPlaying] = useState(false);
  const demo = findDemo(exerciseId);

  const primaryKey = targetAngles ? Object.keys(targetAngles)[0] : null;
  const targetVal = primaryKey ? targetAngles?.[primaryKey] : null;

  // --- Video demo available ---
  if (demo) {
    const embedUrl = `https://www.youtube.com/embed/${demo.videoId}?start=${demo.start || 0}&rel=0&modestbranding=1&autoplay=${playing ? 1 : 0}&mute=1&loop=1&controls=1`;

    return (
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
        {!playing ? (
          // Thumbnail + play button (don't autoload iframe)
          <button
            onClick={() => setPlaying(true)}
            className="relative w-full group"
            style={{ background: "#000", aspectRatio: "16/9" }}
          >
            <img
              src={`https://img.youtube.com/vi/${demo.videoId}/mqdefault.jpg`}
              alt={demo.label || exerciseName || "Exercise demo"}
              className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: "rgba(56, 189, 195, 0.9)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <polygon points="8,5 20,12 8,19" />
                </svg>
              </div>
            </div>
            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-2" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
              <span className="text-xs font-medium text-white">{demo.label || exerciseName}</span>
            </div>
          </button>
        ) : (
          <iframe
            src={embedUrl}
            className="w-full"
            style={{ aspectRatio: "16/9", border: "none" }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={demo.label || exerciseName || "Exercise demo"}
          />
        )}
      </div>
    );
  }

  // --- No video: instruction card ---
  const tempoParts = tempoSeconds?.split("-").map(Number) || [];
  const tempoLabels = ["Up", "Hold", "Down", "Rest"];

  return (
    <div
      className="rounded-xl flex flex-col gap-3 p-4"
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-accent)" }}>
          {exerciseName || exerciseId.replace(/_\d+$/g, "").replace(/_/g, " ")}
        </span>
        {targetVal != null && primaryKey && (
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
            {formatAngleKey(primaryKey)}: {targetVal}{primaryKey.includes("cm") ? " cm" : "°"}
          </span>
        )}
      </div>

      {/* Cues */}
      {cues && cues.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {cues.map((cue, i) => (
            <div key={i} className="flex gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <span
                className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[9px] font-mono font-bold"
                style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
              >
                {i + 1}
              </span>
              <span className="leading-relaxed">{cue}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tempo */}
      {tempoParts.length >= 3 && (
        <div className="flex gap-1.5 pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
          {tempoParts.map((t, i) => (
            <div key={i} className="flex-1 text-center py-1 rounded" style={{ background: "var(--color-surface)" }}>
              <div className="text-xs font-mono font-semibold" style={{ color: "var(--color-accent)" }}>{t}s</div>
              <div className="text-[8px]" style={{ color: "var(--color-text-muted)" }}>{tempoLabels[i]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAngleKey(key: string): string {
  return key
    .replace(/_degrees$/, "")
    .replace(/_cm$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
