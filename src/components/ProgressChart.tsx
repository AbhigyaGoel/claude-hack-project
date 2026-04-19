"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
export interface ChartDataPoint {
  session_number: number;
  date: string;
  metric: string;
  value: number;
}

interface ProgressChartProps {
  data: ChartDataPoint[];
  title: string;
  yLabel: string;
  color?: string;
  height?: number;
}

export default function ProgressChart({
  data,
  title,
  yLabel,
  color = "#3b82f6",
  height = 200,
}: ProgressChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Left margin bumped from 40 → 56 so decimal tick labels (e.g. "0.40")
    // and the rotated y-axis label stop overlapping.
    const margin = { top: 20, right: 20, bottom: 30, left: 56 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // With one data point, clamp the x domain to a symmetric range so the
    // dot draws at the center of the plot area instead of the left edge
    // (d3's default for a degenerate domain is ambiguous and looks empty).
    const xValues = data.map((d) => d.session_number);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const xDomain: [number, number] =
      xMin === xMax ? [xMin - 0.5, xMax + 0.5] : [xMin, xMax];

    const x = d3.scaleLinear().domain(xDomain).range([0, width]);

    // Similarly, give the y-axis headroom when all values are equal (or 0)
    // so a flat line isn't drawn directly on the top edge.
    const yMax = Math.max(...data.map((d) => d.value));
    const yDomain: [number, number] = yMax === 0 ? [0, 1] : [0, yMax * 1.1];
    const y = d3.scaleLinear().domain(yDomain).range([chartHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "#374151")
      .attr("stroke-dasharray", "2,2");

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.format("d")))
      .attr("color", "#9ca3af");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#9ca3af");

    // Line
    const line = d3
      .line<ChartDataPoint>()
      .x((d) => x(d.session_number))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Dots
    g.selectAll(".dot")
      .data(data)
      .join("circle")
      .attr("cx", (d) => x(d.session_number))
      .attr("cy", (d) => y(d.value))
      .attr("r", 4)
      .attr("fill", color);

    // Y label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 10)
      .attr("x", -chartHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size", "11px")
      .text(yLabel);
  }, [data, color, height, yLabel]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white text-sm font-medium mb-2">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No data yet</p>
      ) : (
        <svg ref={svgRef} width="100%" height={height} />
      )}
    </div>
  );
}
