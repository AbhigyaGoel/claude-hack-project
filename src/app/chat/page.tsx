"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getActivePatient } from "@/lib/api";
import type { PatientRecord } from "@/types/storage";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function ChatPage() {
  const [profile, setProfile] = useState<PatientRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getActivePatient()
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !profile || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: profile.id,
          message: userMsg.content,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || "I couldn't process that. Please try again.",
        timestamp: Date.now(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Connection error. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  if (!profile) {
    return (
      <main className="flex-1 flex items-center justify-center" style={{ background: "var(--color-background)" }}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>No Active Profile</h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>Start a session first to create a profile.</p>
          <Link href="/session" className="btn-accent">Start Session</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col" style={{ background: "var(--color-background)" }}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
        <Link href="/" className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Home
        </Link>
        <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Chat with Vero — {profile.name}
        </div>
        <div className="w-16" />
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Ask Vero anything about your rehab — exercise form, soreness, progress, or schedule changes.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Is this soreness normal?", "Can I skip today?", "My knee clicked today"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)", border: "1px solid var(--color-border)" }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[70%] p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
              style={{
                background: msg.role === "user" ? "var(--color-accent)" : "var(--color-surface-raised)",
                color: msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
              }}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    h1: ({ children }) => <h1 className="text-base font-semibold mb-1 mt-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-semibold mb-1 mt-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-medium mb-1 mt-2">{children}</h3>,
                    code: ({ children }) => <code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: "var(--color-surface)", color: "var(--color-accent)" }}>{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 pl-3 my-1 italic" style={{ borderColor: "var(--color-accent)", color: "var(--color-text-secondary)" }}>{children}</blockquote>,
                    hr: () => <hr className="my-2" style={{ borderColor: "var(--color-border)" }} />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-2xl" style={{ background: "var(--color-surface-raised)" }}>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-accent)" }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-accent)", animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-accent)", animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask Vero..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-accent px-4">
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
