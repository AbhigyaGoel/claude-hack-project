import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import WebcamView from "@/components/WebcamView";

describe("WebcamView", () => {
  it("imports without error", () => {
    expect(WebcamView).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(<WebcamView />);
    expect(container).toBeTruthy();
  });

  it("renders with all props", () => {
    const onLandmarks = vi.fn();
    const { container } = render(
      <WebcamView
        onLandmarksDetected={onLandmarks}
        jointColors={{ 11: "red", 12: "yellow" }}
        showAngles={true}
      />,
    );
    expect(container).toBeTruthy();
  });

  it("shows error state when camera is denied", async () => {
    const { findByText } = render(<WebcamView />);
    // The mock rejects with NotAllowedError
    const errorText = await findByText("Camera access required for pose detection.");
    expect(errorText).toBeInTheDocument();
  });
});
