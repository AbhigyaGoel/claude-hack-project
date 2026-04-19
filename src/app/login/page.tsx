"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "signin" | "signup";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already signed in, bounce to home.
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) router.replace(nextPath);
      })
      .catch(() => {});
  }, [router, nextPath]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter a username and password");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Something went wrong");
        return;
      }
      // Hard nav so server components + middleware pick up the new cookie.
      window.location.href = nextPath;
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center relative">
      <div className="glass-card-bright p-8 w-full max-w-sm mx-4 animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-light tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Vero
          </h1>
          <p className="text-xs tracking-[0.2em] uppercase mt-1" style={{ color: "var(--color-accent)" }}>
            AI Physical Therapy
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}>
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); }}
              className="flex-1 text-sm py-1.5 rounded-md transition-colors"
              style={{
                background: mode === m ? "var(--color-accent-dim)" : "transparent",
                color: mode === m ? "var(--color-accent)" : "var(--color-text-muted)",
              }}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </label>

          {error && (
            <div className="text-xs py-2 px-3 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-accent text-sm mt-2">
            {submitting ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--color-text-muted)" }}>
          No email needed. Your data is scoped to your username.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center"><div className="spinner" /></main>}>
      <LoginInner />
    </Suspense>
  );
}
