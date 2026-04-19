import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IntakeView from "@/components/IntakeView";

describe("IntakeView", () => {
  const mockOnComplete = vi.fn();

  it("imports without error", () => {
    expect(IntakeView).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(<IntakeView onComplete={mockOnComplete} />);
    expect(container).toBeTruthy();
  });

  it("shows body region selection initially", () => {
    render(<IntakeView onComplete={mockOnComplete} />);
    expect(screen.getByText("Where are you experiencing pain?")).toBeInTheDocument();
  });

  it("shows all 6 body regions", () => {
    render(<IntakeView onComplete={mockOnComplete} />);
    expect(screen.getByText("Shoulder")).toBeInTheDocument();
    expect(screen.getByText("Knee")).toBeInTheDocument();
    expect(screen.getByText("Hip")).toBeInTheDocument();
    expect(screen.getByText("Ankle")).toBeInTheDocument();
    expect(screen.getByText("Lower Back")).toBeInTheDocument();
    expect(screen.getByText("Neck")).toBeInTheDocument();
  });

  it("advances to safety screening on region selection", () => {
    render(<IntakeView onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Shoulder"));
    expect(screen.getByText("Safety Screening")).toBeInTheDocument();
  });

  it("shows red flag questions after region selection", () => {
    render(<IntakeView onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Shoulder"));
    expect(screen.getByText("Do you experience numbness or tingling?")).toBeInTheDocument();
  });

  it("displays progress steps", () => {
    render(<IntakeView onComplete={mockOnComplete} />);
    expect(screen.getByText("Region")).toBeInTheDocument();
  });
});
