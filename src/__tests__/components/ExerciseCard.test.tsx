import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExerciseCard from "@/components/ExerciseCard";
import type { ExercisePlanItem } from "@/types/exercise";

const mockExercise: ExercisePlanItem = {
  id: "test_exercise",
  name: "Test Exercise",
  target_muscles: ["deltoid", "rotator_cuff"],
  target_angles: { left_shoulder_flexion: 90 },
  tolerances: { left_shoulder_flexion: 10 },
  tempo_seconds: "2-1-2-0",
  sets: 3,
  reps: 10,
  rest_seconds: 60,
  cues: ["Keep elbow straight", "Breathe steadily"],
  compensation_patterns: [],
  regression: "Reduce ROM",
  progression: "Add weight",
};

describe("ExerciseCard", () => {
  it("imports without error", () => {
    expect(ExerciseCard).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <ExerciseCard exercise={mockExercise} currentSet={1} currentRep={0} />,
    );
    expect(container).toBeTruthy();
  });

  it("displays the exercise name", () => {
    render(<ExerciseCard exercise={mockExercise} currentSet={1} currentRep={3} />);
    expect(screen.getByText("Test Exercise")).toBeInTheDocument();
  });

  it("displays set and rep counts", () => {
    render(<ExerciseCard exercise={mockExercise} currentSet={2} currentRep={5} />);
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("5/10")).toBeInTheDocument();
  });

  it("displays coaching cues", () => {
    render(<ExerciseCard exercise={mockExercise} currentSet={1} currentRep={0} />);
    expect(screen.getByText("Keep elbow straight")).toBeInTheDocument();
    expect(screen.getByText("Breathe steadily")).toBeInTheDocument();
  });

  it("displays target muscles", () => {
    render(<ExerciseCard exercise={mockExercise} currentSet={1} currentRep={0} />);
    expect(screen.getByText("deltoid")).toBeInTheDocument();
    expect(screen.getByText("rotator cuff")).toBeInTheDocument();
  });

  it("displays tempo", () => {
    render(<ExerciseCard exercise={mockExercise} currentSet={1} currentRep={0} />);
    expect(screen.getByText("2-1-2-0")).toBeInTheDocument();
  });
});
