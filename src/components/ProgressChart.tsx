"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ChartDataPoint } from "@/agents/progressAnalyst";

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

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([1, Math.max(...data.map((d) => d.session_number))])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, Math.max(...data.map((d) => d.value)) * 1.1])
      .range([chartHeight, 0]);

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
