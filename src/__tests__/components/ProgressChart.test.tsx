import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressChart from "@/components/ProgressChart";

describe("ProgressChart", () => {
  it("imports without error", () => {
    expect(ProgressChart).toBeDefined();
  });

  it("renders without crashing with empty data", () => {
    const { container } = render(
      <ProgressChart data={[]} title="ROM Progress" yLabel="Degrees" />,
    );
    expect(container).toBeTruthy();
  });

  it("shows no data message when empty", () => {
    render(<ProgressChart data={[]} title="ROM Progress" yLabel="Degrees" />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });

  it("displays the title", () => {
    render(<ProgressChart data={[]} title="My Chart Title" yLabel="Degrees" />);
    expect(screen.getByText("My Chart Title")).toBeInTheDocument();
  });

  it("renders with data without crashing", () => {
    const data = [
      { session_number: 1, date: "2025-01-01", metric: "rom", value: 60 },
      { session_number: 2, date: "2025-01-02", metric: "rom", value: 75 },
      { session_number: 3, date: "2025-01-03", metric: "rom", value: 85 },
    ];
    const { container } = render(
      <ProgressChart data={data} title="ROM Trend" yLabel="Degrees" />,
    );
    expect(container).toBeTruthy();
  });

  it("renders with custom color and height", () => {
    const data = [
      { session_number: 1, date: "2025-01-01", metric: "rom", value: 60 },
    ];
    const { container } = render(
      <ProgressChart data={data} title="Test" yLabel="Val" color="#ff0000" height={300} />,
    );
    expect(container).toBeTruthy();
  });
});
