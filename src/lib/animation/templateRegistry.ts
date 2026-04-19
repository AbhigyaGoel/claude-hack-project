import type { AnimationConfig, MovementTemplate } from "./types";

// Shoulder templates
import {
  overheadReach,
  lateralRaise,
  externalRotation,
  internalRotation,
  scapularSqueeze,
  pendulum,
  shrug,
  crossBody,
} from "./templates/shoulder";

// Knee templates
import {
  squat,
  legRaise,
  heelSlide,
  hamstringCurl,
  kneeExtension,
  clamshell,
} from "./templates/knee";

// Hip templates
import {
  bridge,
  sidelyingAbduction,
  fireHydrant,
  hipFlexorStretch,
  hipHinge,
} from "./templates/hip";

// Lumbar templates
import {
  deadBug,
  birdDog,
  pressUp,
  catCow,
  pelvicTilt,
  plank,
  sidePlank,
} from "./templates/lumbar";

// Cervical templates
import {
  chinTuck,
  neckRotation,
  neckLateralFlex,
  neckFlexion,
} from "./templates/cervical";

// Ankle templates
import {
  calfRaise,
  dorsiflexion,
  ankleCircle,
  singleLegBalance,
} from "./templates/ankle";

/**
 * Exact exercise ID -> template mapping.
 */
const EXACT_MATCH: Record<string, MovementTemplate> = {
  // Shoulder
  wall_slide_01: overheadReach,
  shoulder_flexion_supine_01: overheadReach,
  pendulum_01: pendulum,
  external_rotation_sidelying_01: externalRotation,
  scapular_retraction_01: scapularSqueeze,
  shoulder_abduction_standing_01: lateralRaise,
  prone_y_raise_01: overheadReach,
  internal_rotation_band_01: internalRotation,
  cross_body_stretch_01: crossBody,
  doorway_pec_stretch_01: crossBody,
  isometric_external_rotation_01: externalRotation,
  shoulder_shrug_01: shrug,
  prone_t_raise_01: lateralRaise,
  prone_w_raise_01: externalRotation,
  external_rotation_band_90_01: externalRotation,
  overhead_press_seated_01: overheadReach,
  scapular_push_up_01: scapularSqueeze,
  shoulder_er_standing_band_01: externalRotation,
  wall_angel_01: overheadReach,
  sleeper_stretch_01: internalRotation,

  // Knee
  quad_set_01: kneeExtension,
  straight_leg_raise_supine_01: legRaise,
  slr_sidelying_01: sidelyingAbduction,
  heel_slide_01: heelSlide,
  mini_squat_01: squat,
  step_up_01: squat,
  step_down_01: squat,
  terminal_knee_extension_01: kneeExtension,
  hamstring_curl_prone_01: hamstringCurl,
  single_leg_squat_01: squat,
  lateral_band_walk_knee_01: lateralRaise,
  wall_sit_01: squat,
  bulgarian_split_squat_01: squat,
  clamshell_knee_01: clamshell,
  seated_knee_extension_01: kneeExtension,
  nordic_hamstring_curl_01: hamstringCurl,
  knee_flexion_prone_01: hamstringCurl,
  standing_hamstring_curl_01: hamstringCurl,

  // Hip
  clamshell_hip_01: clamshell,
  glute_bridge_01: bridge,
  single_leg_bridge_01: bridge,
  hip_flexor_stretch_half_kneel_01: hipFlexorStretch,
  fire_hydrant_01: fireHydrant,
  lateral_band_walk_hip_01: lateralRaise,
  hip_hinge_01: hipHinge,
  hip_abduction_sidelying_01: sidelyingAbduction,
  prone_hip_extension_01: bridge,
  pigeon_stretch_01: hipFlexorStretch,
  ninety_ninety_position_01: hipFlexorStretch,
  copenhagen_adduction_01: sidelyingAbduction,
  standing_hip_flexion_01: legRaise,
  hip_internal_rotation_seated_01: clamshell,
  supine_figure_four_stretch_01: bridge,
  hip_circles_01: hipHinge,

  // Lumbar
  dead_bug_01: deadBug,
  bird_dog_01: birdDog,
  prone_press_up_01: pressUp,
  cat_cow_01: catCow,
  pelvic_tilt_supine_01: pelvicTilt,
  mcgill_curl_up_01: pelvicTilt,
  side_plank_01: sidePlank,
  pallof_press_01: plank,
  supine_march_01: deadBug,
  glute_bridge_lumbar_01: bridge,
  plank_forearm_01: plank,
  modified_superman_01: birdDog,
  seated_rotation_01: catCow,
  child_pose_lumbar_01: pressUp,
  knee_to_chest_supine_01: pelvicTilt,
  lumbar_rotation_stretch_01: catCow,

  // Cervical
  chin_tuck_01: chinTuck,
  deep_neck_flexor_endurance_01: neckFlexion,
  cervical_rotation_rom_01: neckRotation,
  levator_scapulae_stretch_01: neckLateralFlex,
  upper_trap_stretch_01: neckLateralFlex,
  thoracic_extension_seated_01: pressUp,
  scapular_retraction_cervical_01: scapularSqueeze,
  wall_angel_cervical_01: overheadReach,
  prone_cervical_retraction_01: chinTuck,
  isometric_cervical_multiplanar_01: chinTuck,
  cervical_flexion_rom_01: neckFlexion,
  cervical_lateral_flexion_01: neckLateralFlex,
  cervical_extension_rom_01: chinTuck,
  scalene_stretch_01: neckLateralFlex,
  neck_retraction_with_extension_01: chinTuck,

  // Ankle
  ankle_alphabet_01: ankleCircle,
  dorsiflexion_stretch_wall_01: dorsiflexion,
  eccentric_heel_drop_straight_01: calfRaise,
  eccentric_heel_drop_bent_01: calfRaise,
  calf_raise_standing_01: calfRaise,
  calf_raise_seated_01: calfRaise,
  single_leg_balance_01: singleLegBalance,
  single_leg_balance_eyes_closed_01: singleLegBalance,
  baps_board_01: ankleCircle,
  peroneal_strengthening_band_01: dorsiflexion,
  tibialis_posterior_band_01: dorsiflexion,
  toe_curls_01: dorsiflexion,
  band_eversion_01: dorsiflexion,
  band_inversion_01: dorsiflexion,
  calf_stretch_wall_01: dorsiflexion,
  soleus_stretch_wall_01: dorsiflexion,
  dorsiflexion_band_01: dorsiflexion,
  tibialis_anterior_raise_01: dorsiflexion,
  single_leg_calf_raise_01: calfRaise,
  ankle_dorsiflexion_active_01: dorsiflexion,
  ankle_circle_01: ankleCircle,
};

/**
 * Pattern-based lookup using primary_joint_angle and body_region.
 */
const PATTERN_MATCH: Record<string, MovementTemplate> = {
  // Joint angle patterns
  shoulder_flexion: overheadReach,
  shoulder_abduction: lateralRaise,
  shoulder_external_rotation: externalRotation,
  shoulder_internal_rotation: internalRotation,
  shoulder_extension: scapularSqueeze,
  shoulder_horizontal_adduction: crossBody,
  shoulder_horizontal_abduction: crossBody,
  shoulder_elevation: shrug,
  shoulder_protraction: scapularSqueeze,

  knee_flexion: hamstringCurl,
  knee_extension: kneeExtension,

  hip_flexion: legRaise,
  hip_extension: bridge,
  hip_abduction: sidelyingAbduction,
  hip_adduction: sidelyingAbduction,
  hip_external_rotation: clamshell,
  hip_internal_rotation: clamshell,

  lumbar_extension: pressUp,
  lumbar_flexion: catCow,
  trunk_flexion: pelvicTilt,
  trunk_rotation: catCow,
  trunk_lateral_flexion: sidePlank,
  pelvic_tilt: pelvicTilt,

  cervical_retraction: chinTuck,
  cervical_flexion: neckFlexion,
  cervical_rotation: neckRotation,
  cervical_lateral_flexion: neckLateralFlex,
  cervical_extension: chinTuck,
  cervical_neutral: chinTuck,
  thoracic_extension: pressUp,

  ankle_dorsiflexion: dorsiflexion,
  ankle_plantarflexion: calfRaise,
  ankle_inversion: ankleCircle,
  ankle_eversion: ankleCircle,
  ankle_neutral: singleLegBalance,
  toe_flexion: dorsiflexion,
};

/**
 * Body region defaults (tier 3 fallback).
 */
const REGION_DEFAULT: Record<string, MovementTemplate> = {
  shoulder: overheadReach,
  knee: squat,
  hip: bridge,
  lumbar: deadBug,
  cervical: chinTuck,
  ankle: calfRaise,
};

/**
 * Default rep duration per body region (ms).
 */
const DEFAULT_REP_DURATION: Record<string, number> = {
  shoulder: 3000,
  knee: 3000,
  hip: 3500,
  lumbar: 4000,
  cervical: 2500,
  ankle: 2500,
};

/**
 * Extracts a pattern key from a primary_joint_angle string.
 * E.g., "shoulder_flexion_degrees" -> "shoulder_flexion"
 */
function extractPatternKey(primaryJointAngle: string): string {
  return primaryJointAngle.replace(/_degrees$/, "").replace(/_cm$/, "");
}

/**
 * Three-tier lookup for animation config:
 * 1. Exact exercise ID match
 * 2. Pattern match on primary_joint_angle
 * 3. Body region default
 */
export function getAnimationConfig(
  exerciseId: string,
  bodyRegion?: string,
  primaryJointAngle?: string,
): AnimationConfig | null {
  // Tier 1: exact match
  const exactTemplate = EXACT_MATCH[exerciseId];
  if (exactTemplate) {
    return {
      template: exactTemplate,
      repDurationMs: DEFAULT_REP_DURATION[bodyRegion ?? "shoulder"] ?? 3000,
    };
  }

  // Tier 2: pattern match on joint angle
  if (primaryJointAngle) {
    const patternKey = extractPatternKey(primaryJointAngle);
    const patternTemplate = PATTERN_MATCH[patternKey];
    if (patternTemplate) {
      return {
        template: patternTemplate,
        repDurationMs: DEFAULT_REP_DURATION[bodyRegion ?? "shoulder"] ?? 3000,
      };
    }
  }

  // Tier 3: body region default
  if (bodyRegion) {
    const regionTemplate = REGION_DEFAULT[bodyRegion];
    if (regionTemplate) {
      return {
        template: regionTemplate,
        repDurationMs: DEFAULT_REP_DURATION[bodyRegion] ?? 3000,
      };
    }
  }

  return null;
}
