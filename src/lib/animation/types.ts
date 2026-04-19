import type { Landmark } from "@/types/landmark";

export type BasePoseType =
  | "standing"
  | "standingSide"
  | "supine"
  | "prone"
  | "sidelying"
  | "quadruped"
  | "seated";

export interface MovementTemplate {
  basePose: BasePoseType;
  animate: (pose: Landmark[], t: number) => Landmark[];
  activeJoints: number[];
  description: string;
}

export interface AnimationConfig {
  template: MovementTemplate;
  repDurationMs: number;
}
