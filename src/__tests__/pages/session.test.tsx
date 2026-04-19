import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SessionPage from "@/app/session/page";

describe("Session page", () => {
  it("imports without error", () => {
    expect(SessionPage).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(<SessionPage />);
    expect(container).toBeTruthy();
  });

  it("shows the intake step initially", () => {
    render(<SessionPage />);
    expect(screen.getByText("Diagnostic Intake")).toBeInTheDocument();
  });

  it("shows Exit link", () => {
    render(<SessionPage />);
    expect(screen.getByText("Exit")).toBeInTheDocument();
  });

  it("renders IntakeView component", () => {
    render(<SessionPage />);
    expect(screen.getByText("Where are you experiencing pain?")).toBeInTheDocument();
  });
});
