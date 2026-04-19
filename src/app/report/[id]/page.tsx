"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ProgressChart from "@/components/ProgressChart";
import type { ChartDataPoint } from "@/components/ProgressChart";

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

interface NextStep {
  title: string;
  description: string;
  url?: string | null;
}

interface ReportData {
  title: string;
  date: string;
  patient_name: string;
  patient_id?: string;
  session_number?: number;
  overall_score?: number;
  pain_pre?: number | null;
  pain_post?: number | null;
  sections: ReadonlyArray<ReportSection>;
  recommendations: ReadonlyArray<string>;
  highlights?: ReadonlyArray<string>;
  improvements?: ReadonlyArray<string>;
  next_steps?: ReadonlyArray<NextStep>;
  export_summary?: string;
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

const SUGGESTED_QUESTIONS: readonly string[] = [
  "Why did you program these exercises?",
  "What was my biggest improvement?",
  "What should I work on before the next session?",
];

interface ChatMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

const LOADING_MESSAGES = [
  "Reviewing your form data across all reps...",
  "Comparing against your previous sessions...",
  "Identifying compensation patterns...",
  "Calculating pain trajectory...",
  "Finding the best recovery resources...",
  "Writing your personalized next steps...",
  "Compiling clinical recommendations...",
  "Almost done — putting it all together...",
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return dateStr; }
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

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "var(--color-success)" : score >= 60 ? "var(--color-warning)" : "var(--color-danger)";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>score</span>
      </div>
    </div>
  );
}

function PainDelta({ pre, post }: { pre: number; post: number }) {
  const delta = post - pre;
  const improved = delta < 0;
  const neutral = delta === 0;
  const color = improved ? "var(--color-success)" : neutral ? "var(--color-text-muted)" : "var(--color-danger)";
  const bg = improved ? "var(--color-success-dim)" : neutral ? "var(--color-surface-raised)" : "var(--color-danger-dim)";
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: bg, border: `1px solid ${color}` }}
    >
      <span className="text-3xl font-bold font-mono leading-none" style={{ color }}>
        {improved ? "↓" : neutral ? "→" : "↑"}{Math.abs(delta)}
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold" style={{ color }}>
          Pain {improved ? "reduced" : neutral ? "unchanged" : "increased"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {pre} → {post} / 10
        </span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const closeToProgress = useCallback(() => {
    router.push("/progress");
  }, [router]);

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [chatMessages, setChatMessages] = useState<readonly ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2600);
    return () => clearInterval(iv);
  }, [loading]);

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
      setReport(await res.json() as ReportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { if (sessionId) fetchReport(); }, [sessionId, fetchReport]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendChatMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatLoading) return;
      const patientId = report?.patient_id;
      if (!patientId) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      setChatMessages((prev) => [...prev, userMessage]);
      setChatInput("");
      setChatLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient_id: patientId,
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
    },
    [chatLoading, report?.patient_id],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(chatInput);
    }
  };

  const downloadPdf = useCallback(() => {
    window.open(
      `/api/report/pdf?session_id=${encodeURIComponent(sessionId)}`,
      "_blank",
      "noopener",
    );
  }, [sessionId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
        {/* Spinner on its own row, centered, above the clipboard icon so
            the loading ring doesn't fight with the icon for attention. */}
        <div className="flex flex-col items-center gap-5">
          <div className="spinner" style={{ width: "64px", height: "64px" }} />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        </div>

        <div className="text-center max-w-xs">
          <p
            key={msgIdx}
            className="text-sm font-medium animate-fade-in"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {LOADING_MESSAGES[msgIdx]}
          </p>
          <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
            Usually takes 15–20 seconds
          </p>
        </div>

        <div className="flex gap-1.5">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === msgIdx ? "20px" : "6px",
                height: "6px",
                background: i === msgIdx ? "var(--color-accent)" : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-[var(--color-danger)] mb-4">{error}</p>
          <button onClick={fetchReport} className="btn-accent">Retry</button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const hasPain = report.pain_pre != null && report.pain_post != null;

  return (
    <div className="min-h-screen pb-44 print:pb-0">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="glass-card-bright mx-4 mt-4 p-6 sm:mx-auto sm:max-w-4xl animate-fade-in print:shadow-none">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {report.session_number != null && (
              <span
                className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full mb-2"
                style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}
              >
                Session #{report.session_number}
              </span>
            )}
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{report.title}</h1>
            <p className="text-[var(--color-text-secondary)] mt-0.5">{report.patient_name}</p>
            <p className="text-[var(--color-text-muted)] text-sm">{formatDate(report.date)}</p>
          </div>
          <div className="flex items-start gap-4">
            {report.overall_score != null && (
              <div className="text-center">
                <span className="data-label">Overall Score</span>
                <p className="text-3xl font-mono font-bold text-[var(--color-accent)]">
                  {report.overall_score}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={downloadPdf}
              className="btn-ghost text-sm px-3 py-2"
              aria-label="Download PDF"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={closeToProgress}
              className="btn-ghost text-sm px-3 py-2"
              aria-label="Close report and go to progress"
            >
              Close
            </button>
          </div>
        </div>
      </header>

      <main className="mx-4 sm:mx-auto sm:max-w-4xl mt-6 space-y-4 stagger-children">

        {/* ── Wins & Focus ────────────────────────────────────────────────── */}
        {((report.highlights?.length ?? 0) > 0 || (report.improvements?.length ?? 0) > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {(report.highlights?.length ?? 0) > 0 && (
              <section className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-success-dim)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>What You Did Well</h2>
                </div>
                <ul className="space-y-2.5">
                  {report.highlights!.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="shrink-0 mt-0.5" style={{ color: "var(--color-success)" }}>✓</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(report.improvements?.length ?? 0) > 0 && (
              <section className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-warning-dim)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-warning)" }}>Focus Next Session</h2>
                </div>
                <ul className="space-y-2.5">
                  {report.improvements!.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="shrink-0 mt-0.5" style={{ color: "var(--color-warning)" }}>›</span>
                      {imp}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* ── Report Sections ─────────────────────────────────────────────── */}
        {report.sections.map((section, idx) => (
          <section key={idx} className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">{section.heading}</h2>
            <div className="text-[var(--color-text-secondary)] text-sm whitespace-pre-wrap leading-relaxed">
              {section.content}
            </div>
            {section.charts && section.charts.length > 0 && (
              <div className="mt-4 space-y-4">
                {section.charts.map((chart, cIdx) => {
                  const yField = chart.y_label?.toLowerCase().replace(/\s+/g, "_") ?? "value";
                  return (
                    <ProgressChart key={cIdx} data={transformChartData(chart.data, yField)} title={chart.title} yLabel={chart.y_label ?? "Value"} />
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* ── Pain Trend Chart ────────────────────────────────────────────── */}
        {report.charts && report.charts.length > 0 && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Pain Trend</h2>
            <div className="space-y-4">
              {report.charts.map((chart, idx) => {
                const fields = chart.data.length > 0
                  ? Object.keys(chart.data[0]).filter((k) => k !== "session" && k !== "date")
                  : [];
                return fields.map((field) => (
                  <ProgressChart
                    key={`${idx}-${field}`}
                    data={transformChartData(chart.data, field)}
                    title={field.replace(/_/g, " ")}
                    yLabel={field.replace(/_/g, " ")}
                    color={field.includes("post") ? "#34d399" : "#60a5fa"}
                  />
                ));
              })}
            </div>
          </section>
        )}

        {/* ── Outcome Measure ─────────────────────────────────────────────── */}
        {report.outcome_measure && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Outcome Measure</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><span className="data-label">Instrument</span><p className="data-value">{report.outcome_measure.instrument}</p></div>
              <div><span className="data-label">Current</span><p className="data-value">{report.outcome_measure.current_score}</p></div>
              <div>
                <span className="data-label">Change</span>
                <p className="data-value" style={{ color: report.outcome_measure.change < 0 ? "var(--color-success)" : report.outcome_measure.change > 0 ? "var(--color-danger)" : "var(--color-text-secondary)" }}>
                  {report.outcome_measure.change > 0 ? "+" : ""}{report.outcome_measure.change}
                </p>
              </div>
              <div>
                <span className="data-label">MCID Reached</span>
                <p className="data-value" style={{ color: report.outcome_measure.mcid_achieved ? "var(--color-success)" : "var(--color-warning)" }}>
                  {report.outcome_measure.mcid_achieved ? "Yes" : "Not yet"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Recommendations ─────────────────────────────────────────────── */}
        {report.recommendations.length > 0 && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Recommendations</h2>
            <ul className="space-y-2">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[var(--color-text-secondary)] text-sm">
                  <span className="text-[var(--color-accent)] mt-0.5 shrink-0">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Next Steps ──────────────────────────────────────────────────── */}
        {(report.next_steps?.length ?? 0) > 0 && (
          <section className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-accent-dim)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Next Steps</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {report.next_steps!.map((step, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl flex flex-col gap-1.5"
                  style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
                >
                  <span className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>{step.title}</span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{step.description}</p>
                  {step.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs mt-0.5 self-start underline underline-offset-2"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Learn more →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Export summary (print only) ──────────────────────────────────── */}
        {report.export_summary && (
          <section className="hidden print:block p-5 border border-gray-200 rounded-xl">
            <h2 className="text-base font-semibold mb-2 text-gray-800">Clinical Summary (for supervising PT)</h2>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">{report.export_summary}</p>
          </section>
        )}
      </main>

      {/* ── Chat panel ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-background)] border-t border-[var(--color-border)] print:hidden">
        {chatMessages.length > 0 && (
          <div className="max-h-48 overflow-y-auto mx-4 sm:mx-auto sm:max-w-4xl px-2 pt-3 space-y-2">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm p-2 rounded-lg ${msg.role === "user"
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-text-primary)] ml-12"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] mr-12"}`}
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

        {/* Suggested questions — only while the conversation is empty, to
            offer a starting point without crowding the input once a back-
            and-forth begins. */}
        {chatMessages.length === 0 && (
          <div className="mx-4 sm:mx-auto sm:max-w-4xl pt-3 pb-1 flex flex-wrap gap-2">
            <span className="text-xs text-[var(--color-text-muted)] self-center mr-1">
              Ask your report:
            </span>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendChatMessage(q)}
                disabled={chatLoading || !report.patient_id}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-bright)] transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="mx-4 sm:mx-auto sm:max-w-4xl py-3 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask Vero about your report... e.g. "Why this exercise?"'
            disabled={chatLoading || !report.patient_id}
            className="flex-1 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-bright)] transition-colors"
          />
          <button
            onClick={() => sendChatMessage(chatInput)}
            disabled={chatLoading || !chatInput.trim() || !report.patient_id}
            className="btn-accent px-5 py-3 text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
