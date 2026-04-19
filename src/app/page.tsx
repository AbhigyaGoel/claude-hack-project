import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(56,189,195,0.06) 0%, rgba(56,189,195,0.02) 40%, transparent 70%)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(56,189,195,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,195,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="text-center max-w-2xl px-6 relative z-10 animate-fade-in">
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl glass-card-bright flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4L8 8V16L16 28L24 16V8L16 4Z" stroke="#38bdc3" strokeWidth="1.5" fill="rgba(56,189,195,0.1)"/>
              <circle cx="16" cy="14" r="3" stroke="#38bdc3" strokeWidth="1.5" fill="none"/>
              <path d="M13 18L16 24L19 18" stroke="#38bdc3" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h1 className="text-6xl font-light tracking-tight mb-2" style={{ color: "var(--color-text-primary)" }}>
          Vero
        </h1>
        <p className="text-sm font-medium tracking-[0.2em] uppercase mb-6" style={{ color: "var(--color-accent)" }}>
          AI Physical Therapy
        </p>
        <p className="text-lg font-light leading-relaxed mb-12" style={{ color: "var(--color-text-secondary)" }}>
          Real-time pose estimation, personalized exercise programming,
          and adaptive coaching — all in your browser.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/session" className="btn-accent text-base">
            Start Session
          </Link>
          <Link href="/progress" className="btn-ghost text-base">
            View Progress
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex gap-3 justify-center mt-16 flex-wrap">
          {["MediaPipe Pose", "AI Form Analysis", "Voice Coaching", "Adaptive Music"].map((feature) => (
            <span
              key={feature}
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{
                background: "var(--color-accent-dim)",
                color: "var(--color-accent)",
                border: "1px solid var(--color-border)",
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
