"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import ProgressChart from "@/components/ProgressChart";
import type { ChartDataPoint } from "@/agents/progressAnalyst";

interface ReportSection {
  heading: string;
  content: string;
  charts?: ReadonlyArray<{
    type: string;
    title: string;
    x_label?: string;
    y_label?: string;
    data: ReadonlyArray<Record<string, unknown>>;
  }>;
}

interface ReportData {
  title: string;
  date: string;
  patient_name: string;
  session_number?: number;
  overall_score?: number;
  sections: ReadonlyArray<ReportSection>;
  recommendations: ReadonlyArray<string>;
  charts?: ReadonlyArray<{
    type: string;
    title: string;
    data: ReadonlyArray<Record<string, unknown>>;
  }>;
  outcome_measure?: {
    instrument: string;
    current_score: number;
    initial_score: number;
    change: number;
    mcid_achieved: boolean;
  };
}

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function transformChartData(
  rawData: ReadonlyArray<Record<string, unknown>>,
  yField: string,
): ChartDataPoint[] {
  return rawData.map((point, index) => ({
    session_number: (point.session as number) ?? index + 1,
    date: (point.date as string) ?? "",
    metric: yField,
    value: (point[yField] as number) ?? 0,
  }));
}

export default function ReportPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<readonly ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }

      const data: ReportData = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchReport();
    }
  }, [sessionId, fetchReport]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: sessionId,
          message: trimmed,
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.response ?? "I'm sorry, I couldn't process that.",
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">
            Generating session report...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-[var(--color-danger)] mb-4">{error}</p>
          <button onClick={fetchReport} className="btn-accent">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="glass-card-bright mx-4 mt-4 p-6 sm:mx-auto sm:max-w-4xl animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {report.title}
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              {report.patient_name}
              {report.session_number != null && ` \u2014 Session ${report.session_number}`}
            </p>
            <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
              {formatDate(report.date)}
            </p>
          </div>
          {report.overall_score != null && (
            <div className="text-center">
              <span className="data-label">Overall Score</span>
              <p className="text-3xl font-mono font-bold text-[var(--color-accent)]">
                {report.overall_score}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Sections */}
      <main className="mx-4 sm:mx-auto sm:max-w-4xl mt-6 stagger-children space-y-4">
        {report.sections.map((section, idx) => (
          <section key={idx} className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              {section.heading}
            </h2>
            <div className="text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap leading-relaxed">
              {section.content}
            </div>
            {section.charts && section.charts.length > 0 && (
              <div className="mt-4 space-y-4">
                {section.charts.map((chart, cIdx) => {
                  const yField =
                    chart.y_label?.toLowerCase().replace(/\s+/g, "_") ?? "value";
                  const chartData = transformChartData(chart.data, yField);
                  return (
                    <ProgressChart
                      key={cIdx}
                      data={chartData}
                      title={chart.title}
                      yLabel={chart.y_label ?? "Value"}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* Top-level charts */}
        {report.charts && report.charts.length > 0 && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              Trends
            </h2>
            <div className="space-y-4">
              {report.charts.map((chart, idx) => {
                const fields = chart.data.length > 0
                  ? Object.keys(chart.data[0]).filter(
                      (k) => k !== "session" && k !== "date",
                    )
                  : [];
                return fields.map((field) => (
                  <ProgressChart
                    key={`${idx}-${field}`}
                    data={transformChartData(chart.data, field)}
                    title={`${chart.title} - ${field.replace(/_/g, " ")}`}
                    yLabel={field.replace(/_/g, " ")}
                    color={field.includes("post") ? "#34d399" : "#3b82f6"}
                  />
                ));
              })}
            </div>
          </section>
        )}

        {/* Outcome Measure */}
        {report.outcome_measure && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              Outcome Measure
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="data-label">Instrument</span>
                <p className="data-value">{report.outcome_measure.instrument}</p>
              </div>
              <div>
                <span className="data-label">Current</span>
                <p className="data-value">{report.outcome_measure.current_score}</p>
              </div>
              <div>
                <span className="data-label">Change</span>
                <p
                  className="data-value"
                  style={{
                    color:
                      report.outcome_measure.change < 0
                        ? "var(--color-success)"
                        : report.outcome_measure.change > 0
                          ? "var(--color-danger)"
                          : "var(--color-text-secondary)",
                  }}
                >
                  {report.outcome_measure.change > 0 ? "+" : ""}
                  {report.outcome_measure.change}
                </p>
              </div>
              <div>
                <span className="data-label">MCID Reached</span>
                <p
                  className="data-value"
                  style={{
                    color: report.outcome_measure.mcid_achieved
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                  }}
                >
                  {report.outcome_measure.mcid_achieved ? "Yes" : "Not yet"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              Recommendations
            </h2>
            <ul className="space-y-2">
              {report.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-[var(--color-text-secondary)] text-sm"
                >
                  <span className="text-[var(--color-accent)] mt-0.5 shrink-0">
                    &#x2192;
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* Chat panel — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-background)] border-t border-[var(--color-border)]">
        {/* Chat messages */}
        {chatMessages.length > 0 && (
          <div className="max-h-48 overflow-y-auto mx-4 sm:mx-auto sm:max-w-4xl px-2 pt-3 space-y-2">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm p-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-text-primary)] ml-12"
                    : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] mr-12"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] text-sm p-2 rounded-lg mr-12">
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Input row */}
        <div className="mx-4 sm:mx-auto sm:max-w-4xl py-3 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your report... e.g. &quot;Why split squats?&quot;"
            disabled={chatLoading}
            className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-bright)] transition-colors"
          />
          <button
            onClick={sendChatMessage}
            disabled={chatLoading || !chatInput.trim()}
            className="btn-accent px-5 py-3 text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
