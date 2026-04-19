import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressPage from "@/app/progress/page";

describe("Progress page", () => {
  it("imports without error", () => {
    expect(ProgressPage).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(<ProgressPage />);
    expect(container).toBeTruthy();
  });

  it("displays Progress Dashboard heading", () => {
    render(<ProgressPage />);
    expect(screen.getByText("Progress Dashboard")).toBeInTheDocument();
  });

  it("shows no data message", () => {
    render(<ProgressPage />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });

  it("has Back to Home link", () => {
    render(<ProgressPage />);
    expect(screen.getByText("Back to Home")).toBeInTheDocument();
  });
});
