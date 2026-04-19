"use client";

interface ExerciseDemoProps {
  exerciseId: string;
}

function WallSlideDemo() {
  return (
    <svg viewBox="0 0 120 160" width={120} height={160}>
      <style>{`
        @keyframes wallSlideArms {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(0, -30px); }
        }
        .ws-arms { animation: wallSlideArms 3s ease-in-out infinite; }
      `}</style>
      {/* Wall */}
      <line x1="95" y1="10" x2="95" y2="150" stroke="var(--color-border)" strokeWidth="3" />
      {/* Body */}
      <circle cx="60" cy="35" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="60" y1="43" x2="60" y2="90" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Legs */}
      <line x1="60" y1="90" x2="50" y2="130" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="60" y1="90" x2="70" y2="130" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="50" y1="130" x2="45" y2="145" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="70" y1="130" x2="75" y2="145" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Arms sliding on wall */}
      <g className="ws-arms">
        <line x1="60" y1="55" x2="90" y2="50" stroke="var(--color-accent)" strokeWidth="2" />
        <line x1="90" y1="50" x2="93" y2="35" stroke="var(--color-accent)" strokeWidth="2" />
        <circle cx="93" cy="35" r="2" fill="var(--color-accent)" />
      </g>
    </svg>
  );
}

function SupineFlexionDemo() {
  return (
    <svg viewBox="0 0 120 160" width={120} height={160}>
      <style>{`
        @keyframes supineArm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-150deg); }
        }
        .sf-arm { transform-origin: 62px 80px; animation: supineArm 4s ease-in-out infinite; }
      `}</style>
      {/* Ground line */}
      <line x1="5" y1="105" x2="115" y2="105" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4" />
      {/* Lying body - horizontal */}
      <circle cx="25" cy="95" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="33" y1="95" x2="62" y2="95" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Hips/legs */}
      <line x1="62" y1="95" x2="75" y2="102" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="75" y1="102" x2="72" y2="85" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="62" y1="95" x2="80" y2="98" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="80" y1="98" x2="82" y2="82" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Static arm (resting) */}
      <line x1="45" y1="95" x2="45" y2="103" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Moving arm */}
      <g className="sf-arm">
        <line x1="62" y1="80" x2="62" y2="55" stroke="var(--color-accent)" strokeWidth="2" />
        <circle cx="62" cy="55" r="2" fill="var(--color-accent)" />
      </g>
      {/* Label */}
      <text x="60" y="145" textAnchor="middle" fontSize="8" fill="var(--color-text-muted)">lying down</text>
    </svg>
  );
}

function PendulumDemo() {
  return (
    <svg viewBox="0 0 120 160" width={120} height={160}>
      <style>{`
        @keyframes pendulumSwing {
          0% { transform: rotate(-20deg); }
          25% { transform: rotate(0deg) translateX(5px); }
          50% { transform: rotate(20deg); }
          75% { transform: rotate(0deg) translateX(-5px); }
          100% { transform: rotate(-20deg); }
        }
        .pd-arm { transform-origin: 50px 55px; animation: pendulumSwing 2s ease-in-out infinite; }
      `}</style>
      {/* Table */}
      <rect x="70" y="55" width="45" height="5" rx="2" fill="var(--color-border)" />
      <line x1="80" y1="60" x2="80" y2="145" stroke="var(--color-border)" strokeWidth="2" />
      <line x1="105" y1="60" x2="105" y2="145" stroke="var(--color-border)" strokeWidth="2" />
      {/* Head - leaning forward */}
      <circle cx="45" cy="25" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Torso - bent forward */}
      <line x1="48" y1="32" x2="60" y2="70" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Support arm on table */}
      <line x1="55" y1="45" x2="75" y2="53" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Legs */}
      <line x1="60" y1="70" x2="55" y2="115" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="60" y1="70" x2="70" y2="115" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="55" y1="115" x2="50" y2="130" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="70" y1="115" x2="75" y2="130" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Swinging arm */}
      <g className="pd-arm">
        <line x1="50" y1="55" x2="40" y2="110" stroke="var(--color-accent)" strokeWidth="2" />
        <circle cx="40" cy="110" r="2" fill="var(--color-accent)" />
      </g>
      {/* Circular motion indicator */}
      <ellipse cx="40" cy="115" rx="8" ry="4" fill="none" stroke="var(--color-text-muted)" strokeWidth="0.5" strokeDasharray="2" />
    </svg>
  );
}

function ExternalRotationDemo() {
  return (
    <svg viewBox="0 0 120 160" width={120} height={160}>
      <style>{`
        @keyframes extRotate {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-70deg); }
        }
        .er-forearm { transform-origin: 60px 75px; animation: extRotate 3s ease-in-out infinite; }
      `}</style>
      {/* Ground / mat line */}
      <line x1="5" y1="140" x2="115" y2="140" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4" />
      {/* Lying on side - head */}
      <circle cx="30" cy="50" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Torso */}
      <line x1="30" y1="58" x2="30" y2="100" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Legs */}
      <line x1="30" y1="100" x2="25" y2="135" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="30" y1="100" x2="35" y2="135" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Upper arm pinned to side */}
      <line x1="30" y1="65" x2="60" y2="75" stroke="var(--color-accent)" strokeWidth="2" />
      <circle cx="60" cy="75" r="2.5" fill="var(--color-accent)" />
      {/* Rotating forearm */}
      <g className="er-forearm">
        <line x1="60" y1="75" x2="60" y2="105" stroke="var(--color-accent)" strokeWidth="2" />
        <circle cx="60" cy="105" r="2" fill="var(--color-accent)" />
        {/* Small weight */}
        <rect x="56" y="103" width="8" height="4" rx="1" fill="var(--color-text-muted)" />
      </g>
      {/* Rotation arc indicator */}
      <path d="M 65 100 A 25 25 0 0 0 65 55" fill="none" stroke="var(--color-text-muted)" strokeWidth="0.5" strokeDasharray="2" />
    </svg>
  );
}

function ScapularRetractionDemo() {
  return (
    <svg viewBox="0 0 120 160" width={120} height={160}>
      <style>{`
        @keyframes scapRetract {
          0%, 100% { transform: translate(0, 0); }
          40% { transform: translate(-6px, 0); }
          60% { transform: translate(-6px, 0); }
        }
        @keyframes scapRetractR {
          0%, 100% { transform: translate(0, 0); }
          40% { transform: translate(6px, 0); }
          60% { transform: translate(6px, 0); }
        }
        .sr-left { animation: scapRetract 3s ease-in-out infinite; }
        .sr-right { animation: scapRetractR 3s ease-in-out infinite; }
      `}</style>
      {/* Back view of figure */}
      {/* Head */}
      <circle cx="60" cy="30" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Spine */}
      <line x1="60" y1="38" x2="60" y2="95" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Legs */}
      <line x1="60" y1="95" x2="48" y2="135" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="60" y1="95" x2="72" y2="135" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="48" y1="135" x2="44" y2="150" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="72" y1="135" x2="76" y2="150" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Left shoulder + scapula */}
      <g className="sr-left">
        <line x1="60" y1="50" x2="40" y2="50" stroke="var(--color-accent)" strokeWidth="2" />
        <line x1="40" y1="50" x2="35" y2="80" stroke="var(--color-accent)" strokeWidth="2" />
        {/* Scapula shape */}
        <path d="M 48 44 L 44 55 L 48 66" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" />
      </g>
      {/* Right shoulder + scapula */}
      <g className="sr-right">
        <line x1="60" y1="50" x2="80" y2="50" stroke="var(--color-accent)" strokeWidth="2" />
        <line x1="80" y1="50" x2="85" y2="80" stroke="var(--color-accent)" strokeWidth="2" />
        {/* Scapula shape */}
        <path d="M 72 44 L 76 55 L 72 66" fill="none" stroke="var(--color-warning)" strokeWidth="1.5" />
      </g>
      {/* Squeeze arrows */}
      <text x="60" y="58" textAnchor="middle" fontSize="7" fill="var(--color-text-muted)">&larr; &rarr;</text>
    </svg>
  );
}

function ShoulderAbductionDemo() {
  return (
    <svg viewBox="0 0 120 160" width={120} height={160}>
      <style>{`
        @keyframes abdArm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-85deg); }
        }
        .sa-arm { transform-origin: 55px 55px; animation: abdArm 3s ease-in-out infinite; }
      `}</style>
      {/* Head */}
      <circle cx="60" cy="30" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Torso */}
      <line x1="60" y1="38" x2="60" y2="90" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Legs */}
      <line x1="60" y1="90" x2="50" y2="130" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="60" y1="90" x2="70" y2="130" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="50" y1="130" x2="45" y2="148" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="70" y1="130" x2="75" y2="148" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Static arm (left side, hanging) */}
      <line x1="65" y1="55" x2="75" y2="85" stroke="var(--color-accent)" strokeWidth="2" />
      {/* Moving arm (right side, abducting) */}
      <g className="sa-arm">
        <line x1="55" y1="55" x2="45" y2="85" stroke="var(--color-accent)" strokeWidth="2" />
        <circle cx="45" cy="85" r="2" fill="var(--color-accent)" />
        {/* Small weight */}
        <rect x="42" y="84" width="6" height="3" rx="1" fill="var(--color-text-muted)" />
      </g>
      {/* Arc indicator */}
      <path d="M 45 85 A 30 30 0 0 0 25 55" fill="none" stroke="var(--color-text-muted)" strokeWidth="0.5" strokeDasharray="2" />
    </svg>
  );
}

function GenericFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-center"
      style={{ width: 120, height: 120 }}
    >
      <svg viewBox="0 0 40 40" width={32} height={32}>
        <circle cx="20" cy="12" r="6" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        <line x1="20" y1="18" x2="20" y2="30" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        <line x1="20" y1="22" x2="12" y2="28" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        <line x1="20" y1="22" x2="28" y2="28" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        <line x1="20" y1="30" x2="14" y2="38" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        <line x1="20" y1="30" x2="26" y2="38" stroke="var(--color-text-muted)" strokeWidth="1.5" />
      </svg>
      <span className="text-[10px] leading-tight" style={{ color: "var(--color-text-muted)" }}>
        Follow the cues below
      </span>
    </div>
  );
}

const DEMO_MAP: Record<string, () => React.JSX.Element> = {
  wall_slide_01: WallSlideDemo,
  shoulder_flexion_supine_01: SupineFlexionDemo,
  pendulum_01: PendulumDemo,
  external_rotation_sidelying_01: ExternalRotationDemo,
  scapular_retraction_01: ScapularRetractionDemo,
  shoulder_abduction_standing_01: ShoulderAbductionDemo,
};

export default function ExerciseDemo({ exerciseId }: ExerciseDemoProps) {
  const DemoComponent = DEMO_MAP[exerciseId];

  return (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        padding: "12px",
      }}
    >
      {DemoComponent ? <DemoComponent /> : <GenericFallback />}
    </div>
  );
}
