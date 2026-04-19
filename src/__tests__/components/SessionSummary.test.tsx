import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SessionSummary from "@/components/SessionSummary";
import type { ExercisePlanItem } from "@/types/exercise";
import type { FormAssessment } from "@/types/assessment";

const mockExercise: ExercisePlanItem = {
  id: "ex1",
  name: "Wall Slide",
  target_muscles: ["deltoid"],
  target_angles: { shoulder: 90 },
  tolerances: { shoulder: 10 },
  tempo_seconds: "2-1-2-0",
  sets: 3,
  reps: 10,
  rest_seconds: 60,
  cues: ["Keep back flat"],
  compensation_patterns: [],
  regression: "Reduce ROM",
  progression: "Add band",
};

const mockAssessment: FormAssessment = {
  rep_quality: "green",
  deviations: [],
  compensations_detected: [],
  coaching_priority: null,
  rep_counted: true,
  tempo_assessment: "on_tempo",
};

describe("SessionSummary", () => {
  const defaultProps = {
    exerciseSummaries: [
      {
        exercise: mockExercise,
        assessments: [mockAssessment, mockAssessment],
        setsCompleted: 3,
        repsPerSet: [10, 10, 8],
      },
    ],
    painPre: 6,
    painPost: 3,
    durationMinutes: 25,
    onClose: vi.fn(),
  };

  it("imports without error", () => {
    expect(SessionSummary).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(<SessionSummary {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it("displays Session Complete heading", () => {
    render(<SessionSummary {...defaultProps} />);
    expect(screen.getByText("Session Complete")).toBeInTheDocument();
  });

  it("displays duration", () => {
    render(<SessionSummary {...defaultProps} />);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Minutes")).toBeInTheDocument();
  });

  it("displays total reps", () => {
    render(<SessionSummary {...defaultProps} />);
    expect(screen.getByText("28")).toBeInTheDocument(); // 10+10+8
  });

  it("displays pain change", () => {
    render(<SessionSummary {...defaultProps} />);
    expect(screen.getByText("6/10")).toBeInTheDocument();
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByText("Pain reduced by 3 points")).toBeInTheDocument();
  });

  it("displays exercise name", () => {
    render(<SessionSummary {...defaultProps} />);
    expect(screen.getByText("Wall Slide")).toBeInTheDocument();
  });

  it("calls onClose when button clicked", () => {
    const onClose = vi.fn();
    render(<SessionSummary {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Return Home"));
    expect(onClose).toHaveBeenCalled();
  });

  it("handles empty exercise summaries", () => {
    const { container } = render(
      <SessionSummary
        {...defaultProps}
        exerciseSummaries={[]}
      />,
    );
    expect(container).toBeTruthy();
  });

  it("handles pain post >= pain pre", () => {
    const { container } = render(
      <SessionSummary {...defaultProps} painPre={3} painPost={5} />,
    );
    expect(container).toBeTruthy();
    expect(screen.queryByText(/Pain reduced/)).not.toBeInTheDocument();
  });
});
