import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RepCounter from "@/components/RepCounter";

describe("RepCounter", () => {
  it("imports without error", () => {
    expect(RepCounter).toBeDefined();
  });

  it("renders without crashing with minimal props", () => {
    const { container } = render(
      <RepCounter currentRep={0} totalReps={10} currentSet={1} totalSets={3} />,
    );
    expect(container).toBeTruthy();
  });

  it("displays current rep count", () => {
    render(<RepCounter currentRep={5} totalReps={10} currentSet={2} totalSets={3} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("of 10")).toBeInTheDocument();
  });

  it("displays set info", () => {
    render(<RepCounter currentRep={0} totalReps={10} currentSet={2} totalSets={3} />);
    expect(screen.getByText("Set 2 of 3")).toBeInTheDocument();
  });

  it("renders with quality badge when provided", () => {
    render(
      <RepCounter currentRep={1} totalReps={10} currentSet={1} totalSets={3} lastRepQuality="green" />,
    );
    expect(screen.getByText("Good Form")).toBeInTheDocument();
  });

  it("renders yellow quality badge", () => {
    render(
      <RepCounter currentRep={1} totalReps={10} currentSet={1} totalSets={3} lastRepQuality="yellow" />,
    );
    expect(screen.getByText("Needs Correction")).toBeInTheDocument();
  });

  it("renders red quality badge", () => {
    render(
      <RepCounter currentRep={1} totalReps={10} currentSet={1} totalSets={3} lastRepQuality="red" />,
    );
    expect(screen.getByText("Poor Form")).toBeInTheDocument();
  });

  it("renders angle readout when both angles provided", () => {
    render(
      <RepCounter
        currentRep={1}
        totalReps={10}
        currentSet={1}
        totalSets={3}
        currentAngle={85.3}
        targetAngle={90}
      />,
    );
    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText(/90/)).toBeInTheDocument();
  });

  it("does not render angle readout when angles not provided", () => {
    const { container } = render(
      <RepCounter currentRep={0} totalReps={10} currentSet={1} totalSets={3} />,
    );
    expect(container.textContent).not.toContain("\u00B0");
  });

  it("handles zero totalReps without division error", () => {
    const { container } = render(
      <RepCounter currentRep={0} totalReps={0} currentSet={1} totalSets={1} />,
    );
    expect(container).toBeTruthy();
  });
});
