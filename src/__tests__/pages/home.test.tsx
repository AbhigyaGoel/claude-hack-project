import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home page", () => {
  it("imports without error", () => {
    expect(Home).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(<Home />);
    expect(container).toBeTruthy();
  });

  it("displays the app name", () => {
    render(<Home />);
    expect(screen.getByText("Vero")).toBeInTheDocument();
  });

  it("displays the tagline", () => {
    render(<Home />);
    expect(screen.getByText("AI Physical Therapy")).toBeInTheDocument();
  });

  it("has Start Session link", () => {
    render(<Home />);
    expect(screen.getByText("Start Session")).toBeInTheDocument();
  });

  it("has View Progress link", () => {
    render(<Home />);
    expect(screen.getByText("View Progress")).toBeInTheDocument();
  });

  it("displays feature pills", () => {
    render(<Home />);
    expect(screen.getByText("MediaPipe Pose")).toBeInTheDocument();
    expect(screen.getByText("AI Form Analysis")).toBeInTheDocument();
    expect(screen.getByText("Voice Coaching")).toBeInTheDocument();
    expect(screen.getByText("Adaptive Music")).toBeInTheDocument();
  });
});
