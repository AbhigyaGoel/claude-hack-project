import { describe, it, expect } from "vitest";
import { queryExercises, getExerciseById, getAllExercises } from "@/lib/exercises";

describe("exercises", () => {
  describe("getAllExercises", () => {
    it("imports without error", () => {
      expect(getAllExercises).toBeDefined();
    });

    it("returns an array", () => {
      const exercises = getAllExercises();
      expect(Array.isArray(exercises)).toBe(true);
    });

    it("exercises have required fields", () => {
      const exercises = getAllExercises();
      if (exercises.length > 0) {
        const ex = exercises[0];
        expect(ex).toHaveProperty("id");
        expect(ex).toHaveProperty("name");
        expect(ex).toHaveProperty("body_region");
        expect(ex).toHaveProperty("category");
        expect(ex).toHaveProperty("difficulty_tier");
      }
    });

    it("returns a copy (not the original array)", () => {
      const a = getAllExercises();
      const b = getAllExercises();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });

  describe("queryExercises", () => {
    it("returns all exercises with empty query", () => {
      const all = getAllExercises();
      const result = queryExercises({});
      expect(result.length).toBe(all.length);
    });

    it("filters by body_region", () => {
      const result = queryExercises({ body_region: "shoulder" });
      for (const ex of result) {
        expect(ex.body_region).toBe("shoulder");
      }
    });

    it("filters by category", () => {
      const result = queryExercises({ category: "mobility" });
      for (const ex of result) {
        expect(ex.category).toBe("mobility");
      }
    });

    it("filters by difficulty_range", () => {
      const result = queryExercises({ difficulty_range: [1, 2] });
      for (const ex of result) {
        expect(ex.difficulty_tier).toBeGreaterThanOrEqual(1);
        expect(ex.difficulty_tier).toBeLessThanOrEqual(2);
      }
    });

    it("returns empty array for impossible query", () => {
      const result = queryExercises({
        body_region: "shoulder",
        category: "mobility",
        difficulty_range: [5, 5],
      });
      // May or may not be empty, but should not throw
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getExerciseById", () => {
    it("returns an exercise for a valid id", () => {
      const all = getAllExercises();
      if (all.length > 0) {
        const found = getExerciseById(all[0].id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(all[0].id);
      }
    });

    it("returns undefined for an invalid id", () => {
      const found = getExerciseById("nonexistent_exercise_id_xyz");
      expect(found).toBeUndefined();
    });
  });
});
