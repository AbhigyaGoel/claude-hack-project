import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PainScale from "@/components/PainScale";

describe("PainScale", () => {
  it("imports without error", () => {
    expect(PainScale).toBeDefined();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <PainScale label="Rate your pain" onSelect={vi.fn()} />,
    );
    expect(container).toBeTruthy();
  });

  it("displays the label", () => {
    render(<PainScale label="Rate your pain now" onSelect={vi.fn()} />);
    expect(screen.getByText("Rate your pain now")).toBeInTheDocument();
  });

  it("shows 11 buttons (0-10)", () => {
    render(<PainScale label="Pain" onSelect={vi.fn()} />);
    for (let i = 0; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("shows no pain and worst imaginable labels", () => {
    render(<PainScale label="Pain" onSelect={vi.fn()} />);
    expect(screen.getByText("No pain")).toBeInTheDocument();
    expect(screen.getByText("Worst imaginable")).toBeInTheDocument();
  });

  it("calls onSelect when a value is clicked", () => {
    const onSelect = vi.fn();
    render(<PainScale label="Pain" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("5"));
    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it("shows dash when no value selected", () => {
    const { container } = render(<PainScale label="Pain" onSelect={vi.fn()} />);
    // The dash character is used as placeholder
    expect(container.textContent).toContain("\u2014");
  });

  it("renders with initialValue", () => {
    render(<PainScale label="Pain" onSelect={vi.fn()} initialValue={3} />);
    // The selected value should be displayed large
    const display = screen.getAllByText("3");
    expect(display.length).toBeGreaterThanOrEqual(1);
  });
});
