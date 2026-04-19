import Link from "next/link";

export default function ProgressPage() {
  return (
    <main className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(56,189,195,0.04) 0%, transparent 70%)" }}
      />

      <div className="text-center max-w-lg px-6 relative z-10 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl glass-card mx-auto mb-6 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M3 3v18h18"/>
            <path d="M7 16l4-8 4 4 4-6"/>
          </svg>
        </div>

        <h1 className="text-3xl font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Progress Dashboard
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Your ROM trends, session history, and adherence data will appear here
          after completing sessions.
        </p>

        {/* Placeholder chart area */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="data-label">ROM Trend</span>
            <span className="text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>No data yet</span>
          </div>
          <div className="h-32 flex items-end justify-center gap-2">
            {[20, 35, 25, 45, 30, 50, 40, 55, 45, 60, 50, 65].map((h, i) => (
              <div
                key={i}
                className="w-4 rounded-sm opacity-20"
                style={{
                  height: `${h}%`,
                  background: "var(--color-accent)",
                }}
              />
            ))}
          </div>
        </div>

        <Link href="/" className="btn-ghost text-sm">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
