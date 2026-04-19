import type { Exercise, BodyRegion, ExerciseCategory, DifficultyTier } from "@/types/exercise";
import exerciseData from "@/data/exercises.json";

const exercises: Exercise[] = exerciseData as unknown as Exercise[];

export interface ExerciseQuery {
  body_region?: BodyRegion;
  category?: ExerciseCategory;
  difficulty_range?: [DifficultyTier, DifficultyTier];
  equipment?: string[];
}

export function queryExercises(query: ExerciseQuery): Exercise[] {
  return exercises.filter((ex) => {
    if (query.body_region && ex.body_region !== query.body_region) return false;
    if (query.category && ex.category !== query.category) return false;
    if (query.difficulty_range) {
      const [min, max] = query.difficulty_range;
      if (ex.difficulty_tier < min || ex.difficulty_tier > max) return false;
    }
    if (query.equipment && query.equipment.length > 0) {
      const hasRequired = query.equipment.every((eq) =>
        ex.equipment.includes(eq) || ex.equipment.length === 0
      );
      if (!hasRequired) return false;
    }
    return true;
  });
}

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((ex) => ex.id === id);
}

export function getAllExercises(): Exercise[] {
  return [...exercises];
}
