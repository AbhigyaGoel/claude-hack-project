"use client";

import { useMemo } from "react";

interface ExerciseDemoProps {
  exerciseId: string;
  exerciseName?: string;
  bodyRegion?: string;
  targetAngles?: Record<string, number>;
  category?: string;
}

// --- Color tokens ---
const C = {
  bone: "var(--color-accent)",
  boneDim: "color-mix(in srgb, var(--color-accent) 50%, transparent)",
  joint: "var(--color-accent)",
  jointGlow: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
  head: "var(--color-accent)",
  ground: "var(--color-border)",
  prop: "var(--color-text-muted)",
  arc: "var(--color-success)",
  arcDim: "color-mix(in srgb, var(--color-success) 40%, transparent)",
  label: "var(--color-text-muted)",
  muscle: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
  muscleBorder: "color-mix(in srgb, var(--color-warning) 60%, transparent)",
};

// --- Reusable body parts ---

function Head({ cx, cy, r = 10 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.head} strokeWidth="2" />
      {/* Simple face hint */}
      <circle cx={cx - 2.5} cy={cy - 1.5} r="1" fill={C.boneDim} />
      <circle cx={cx + 2.5} cy={cy - 1.5} r="1" fill={C.boneDim} />
    </g>
  );
}

function Joint({ cx, cy, r = 3.5, active = false }: { cx: number; cy: number; r?: number; active?: boolean }) {
  return (
    <g>
      {active && <circle cx={cx} cy={cy} r={r + 4} fill={C.jointGlow} />}
      <circle cx={cx} cy={cy} r={r} fill={active ? C.joint : "none"} stroke={C.joint} strokeWidth="1.5" />
    </g>
  );
}

function Bone({ x1, y1, x2, y2, w = 2.5 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.bone} strokeWidth={w} strokeLinecap="round" />;
}

function Ground({ y, x1 = 10, x2 = 230 }: { y: number; x1?: number; x2?: number }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.ground} strokeWidth="1" strokeDasharray="6 3" />;
}

function AngleArc({ cx, cy, r, startAngle, endAngle, label }: { cx: number; cy: number; r: number; startAngle: number; endAngle: number; label?: string }) {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const midRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
  const lx = cx + (r + 12) * Math.cos(midRad);
  const ly = cy + (r + 12) * Math.sin(midRad);

  return (
    <g>
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={C.arc}
        strokeWidth="2"
        strokeDasharray="3 2"
      />
      {label && (
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={C.arc}>
          {label}
        </text>
      )}
    </g>
  );
}

function MuscleHighlight({ points, label }: { points: string; label?: string }) {
  return (
    <g>
      <polygon points={points} fill={C.muscle} stroke={C.muscleBorder} strokeWidth="1" />
      {label && (
        <text x="0" y="0" fontSize="7" fill={C.label} opacity={0.7}>
          {label}
        </text>
      )}
    </g>
  );
}

function MotionArrow({ x, y, direction }: { x: number; y: number; direction: "up" | "down" | "left" | "right" | "cw" | "ccw" }) {
  const arrows: Record<string, string> = {
    up: `M ${x - 4} ${y + 5} L ${x} ${y - 5} L ${x + 4} ${y + 5}`,
    down: `M ${x - 4} ${y - 5} L ${x} ${y + 5} L ${x + 4} ${y - 5}`,
    left: `M ${x + 5} ${y - 4} L ${x - 5} ${y} L ${x + 5} ${y + 4}`,
    right: `M ${x - 5} ${y - 4} L ${x + 5} ${y} L ${x - 5} ${y + 4}`,
    cw: `M ${x} ${y - 8} A 8 8 0 1 1 ${x + 7} ${y + 4}`,
    ccw: `M ${x} ${y - 8} A 8 8 0 1 0 ${x - 7} ${y + 4}`,
  };
  return (
    <path d={arrows[direction]} fill="none" stroke={C.arc} strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#arrowhead)" />
  );
}

// --- Standing figure template ---
function StandingFigure({
  armAnimation,
  legAnimation,
  activeJoints = [],
  props: extraProps,
  annotations,
  viewBox = "0 0 240 280",
}: {
  armAnimation?: string;
  legAnimation?: string;
  activeJoints?: string[];
  props?: React.ReactNode;
  annotations?: React.ReactNode;
  viewBox?: string;
}) {
  return (
    <svg viewBox={viewBox} className="w-full h-full" style={{ maxHeight: 220 }}>
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill={C.arc} />
        </marker>
      </defs>
      <Ground y={260} />
      {extraProps}
      {/* Head */}
      <Head cx={120} cy={40} />
      {/* Torso */}
      <Bone x1={120} y1={52} x2={120} y2={140} w={3} />
      {/* Shoulders */}
      <Joint cx={96} cy={70} active={activeJoints.includes("l_shoulder")} />
      <Joint cx={144} cy={70} active={activeJoints.includes("r_shoulder")} />
      <Bone x1={96} y1={70} x2={144} y2={70} w={2} />
      {/* Hips */}
      <Joint cx={106} cy={140} active={activeJoints.includes("l_hip")} />
      <Joint cx={134} cy={140} active={activeJoints.includes("r_hip")} />
      <Bone x1={106} y1={140} x2={134} y2={140} w={2} />

      {/* Default arms (hanging) — overridden by armAnimation style */}
      <g className={armAnimation || ""}>
        <Bone x1={96} y1={70} x2={80} y2={120} />
        <Joint cx={80} cy={120} active={activeJoints.includes("l_elbow")} />
        <Bone x1={80} y1={120} x2={76} y2={155} />
      </g>
      <g>
        <Bone x1={144} y1={70} x2={160} y2={120} />
        <Joint cx={160} cy={120} active={activeJoints.includes("r_elbow")} />
        <Bone x1={160} y1={120} x2={164} y2={155} />
      </g>

      {/* Legs */}
      <g className={legAnimation || ""}>
        <Bone x1={106} y1={140} x2={98} y2={200} />
        <Joint cx={98} cy={200} active={activeJoints.includes("l_knee")} />
        <Bone x1={98} y1={200} x2={94} y2={255} />
      </g>
      <g>
        <Bone x1={134} y1={140} x2={142} y2={200} />
        <Joint cx={142} cy={200} active={activeJoints.includes("r_knee")} />
        <Bone x1={142} y1={200} x2={146} y2={255} />
      </g>

      {annotations}
    </svg>
  );
}

// --- Lying figure template ---
function LyingFigure({
  annotations,
  activeJoints = [],
  faceUp = true,
}: {
  annotations?: React.ReactNode;
  activeJoints?: string[];
  faceUp?: boolean;
}) {
  const y = faceUp ? 130 : 120;
  return (
    <svg viewBox="0 0 280 200" className="w-full h-full" style={{ maxHeight: 180 }}>
      <defs>
        <marker id="arrowhead2" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill={C.arc} />
        </marker>
      </defs>
      <Ground y={160} x1={5} x2={275} />
      {/* Head */}
      <Head cx={40} cy={y} r={9} />
      {/* Torso */}
      <Bone x1={50} y1={y} x2={130} y2={y} w={3} />
      {/* Hips */}
      <Joint cx={130} cy={y} active={activeJoints.includes("hip")} />
      {/* Legs */}
      <Bone x1={130} y1={y} x2={200} y2={y + 5} />
      <Joint cx={200} cy={y + 5} active={activeJoints.includes("knee")} />
      <Bone x1={200} y1={y + 5} x2={255} y2={y + 8} />
      {/* Arm (at side) */}
      <Joint cx={80} cy={y - 15} active={activeJoints.includes("shoulder")} />
      <Bone x1={80} y1={y - 15} x2={80} y2={y + 25} />
      {annotations}
    </svg>
  );
}

// --- Specific exercise demos ---

function ShoulderFlexionDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes shoulderFlex {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-140deg); }
        }
        .arm-flex { transform-origin: 96px 70px; animation: shoulderFlex 3.5s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 240 280" className="w-full h-full" style={{ maxHeight: 220 }}>
        <defs><marker id="ah" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill={C.arc} /></marker></defs>
        <Ground y={260} />
        <Head cx={120} cy={40} />
        <Bone x1={120} y1={52} x2={120} y2={140} w={3} />
        <Bone x1={96} y1={70} x2={144} y2={70} w={2} />
        <Bone x1={106} y1={140} x2={134} y2={140} w={2} />
        {/* Right arm static */}
        <Bone x1={144} y1={70} x2={160} y2={120} />
        <Bone x1={160} y1={120} x2={164} y2={155} />
        {/* Left arm — animated flexion */}
        <g className="arm-flex">
          <Bone x1={96} y1={70} x2={80} y2={120} />
          <Joint cx={80} cy={120} />
          <Bone x1={80} y1={120} x2={76} y2={155} />
          <circle cx={76} cy={155} r={2.5} fill={C.joint} />
        </g>
        <Joint cx={96} cy={70} active />
        {/* Arc */}
        <AngleArc cx={96} cy={70} r={55} startAngle={65} endAngle={-75} label="150°" />
        {/* Legs */}
        <Bone x1={106} y1={140} x2={98} y2={200} />
        <Bone x1={98} y1={200} x2={94} y2={255} />
        <Bone x1={134} y1={140} x2={142} y2={200} />
        <Bone x1={142} y1={200} x2={146} y2={255} />
        {/* Muscle highlight */}
        <MuscleHighlight points="90,60 96,70 102,60 100,52 92,52" />
      </svg>
    </div>
  );
}

function SquatDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes squat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(40px); }
        }
        @keyframes sqBend {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(35deg); }
        }
        .sq-body { animation: squat 3.5s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 240 280" className="w-full h-full" style={{ maxHeight: 220 }}>
        <Ground y={260} />
        <g className="sq-body">
          <Head cx={120} cy={30} />
          <Bone x1={120} y1={42} x2={120} y2={120} w={3} />
          <Bone x1={96} y1={60} x2={144} y2={60} w={2} />
          {/* Arms forward for balance */}
          <Bone x1={96} y1={60} x2={65} y2={75} />
          <Bone x1={144} y1={60} x2={175} y2={75} />
          <Joint cx={106} cy={120} active />
          <Joint cx={134} cy={120} active />
          <Bone x1={106} y1={120} x2={134} y2={120} w={2} />
        </g>
        {/* Legs stay planted */}
        <Bone x1={106} y1={160} x2={98} y2={210} />
        <Joint cx={98} cy={210} active />
        <Bone x1={98} y1={210} x2={94} y2={255} />
        <Bone x1={134} y1={160} x2={142} y2={210} />
        <Joint cx={142} cy={210} active />
        <Bone x1={142} y1={210} x2={146} y2={255} />
        {/* Knee angle arc */}
        <AngleArc cx={98} cy={210} r={30} startAngle={-90} endAngle={-45} label="90°" />
        {/* Alignment line */}
        <line x1={98} y1={210} x2={98} y2={260} stroke={C.arcDim} strokeWidth="1" strokeDasharray="3" />
        <text x={88} y={270} fontSize="8" fill={C.label}>knee over toe</text>
      </svg>
    </div>
  );
}

function BridgeDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes bridgeLift {
          0%, 100% { transform: translateY(0); }
          40%, 60% { transform: translateY(-20px); }
        }
        .bridge-hips { animation: bridgeLift 3s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 280 200" className="w-full h-full" style={{ maxHeight: 180 }}>
        <Ground y={160} x1={5} x2={275} />
        {/* Head on ground */}
        <Head cx={40} cy={138} r={9} />
        {/* Shoulders on ground */}
        <Bone x1={50} y1={138} x2={90} y2={138} w={3} />
        {/* Animated hip lift */}
        <g className="bridge-hips">
          <Bone x1={90} y1={138} x2={140} y2={120} w={3} />
          <Joint cx={140} cy={120} active />
          {/* Thigh to knee */}
          <Bone x1={140} y1={120} x2={190} y2={155} />
          <Joint cx={190} cy={155} active />
        </g>
        {/* Feet planted */}
        <Bone x1={190} y1={155} x2={210} y2={155} />
        {/* Muscle highlight - glutes */}
        <MuscleHighlight points="130,115 140,120 150,115 148,108 132,108" />
        {/* Angle */}
        <AngleArc cx={140} cy={120} r={25} startAngle={-30} endAngle={20} label="" />
        <MotionArrow x={135} y={100} direction="up" />
      </svg>
    </div>
  );
}

function ChinTuckDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes chinTuck {
          0%, 100% { transform: translateX(0); }
          40%, 60% { transform: translateX(-8px); }
        }
        .ct-head { animation: chinTuck 3s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 240 240" className="w-full h-full" style={{ maxHeight: 200 }}>
        {/* Side view */}
        <g className="ct-head">
          <Head cx={105} cy={50} r={12} />
          {/* Chin line */}
          <line x1={105} y1={60} x2={105} y2={68} stroke={C.bone} strokeWidth="2" />
        </g>
        {/* Neck */}
        <Bone x1={115} y1={65} x2={120} y2={100} w={2.5} />
        {/* Torso */}
        <Bone x1={120} y1={100} x2={120} y2={190} w={3} />
        {/* Spine alignment reference */}
        <line x1={120} y1={30} x2={120} y2={200} stroke={C.arcDim} strokeWidth="1" strokeDasharray="4" />
        {/* Arrow showing tuck direction */}
        <MotionArrow x={85} y={55} direction="left" />
        <text x={60} y={55} fontSize="9" fill={C.label} textAnchor="middle">tuck</text>
        {/* Cervical curve indicator */}
        <path d="M 118 70 Q 110 85 118 100" fill="none" stroke={C.arc} strokeWidth="1.5" strokeDasharray="3" />
      </svg>
    </div>
  );
}

function DeadBugDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes dbArm { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-80deg); } }
        @keyframes dbLeg { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(30deg); } }
        .db-arm { transform-origin: 80px 120px; animation: dbArm 3s ease-in-out infinite; }
        .db-leg { transform-origin: 160px 130px; animation: dbLeg 3s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 280 200" className="w-full h-full" style={{ maxHeight: 180 }}>
        <Ground y={160} x1={5} x2={275} />
        {/* Lying supine */}
        <Head cx={40} cy={138} r={9} />
        <Bone x1={50} y1={138} x2={160} y2={135} w={3} />
        <Joint cx={100} cy={135} active />
        {/* Core highlight */}
        <MuscleHighlight points="100,125 130,123 140,128 140,142 130,147 100,145" />
        {/* Arm extending overhead */}
        <g className="db-arm">
          <Bone x1={80} y1={120} x2={80} y2={90} />
          <circle cx={80} cy={90} r={2} fill={C.joint} />
        </g>
        {/* Leg extending */}
        <g className="db-leg">
          <Bone x1={160} y1={130} x2={200} y2={120} />
          <Joint cx={200} cy={120} />
          <Bone x1={200} y1={120} x2={240} y2={115} />
        </g>
        {/* Other leg - tabletop */}
        <Bone x1={160} y1={140} x2={180} y2={110} />
        <Joint cx={180} cy={110} />
        <Bone x1={180} y1={110} x2={200} y2={110} />
        <text x={120} y={180} textAnchor="middle" fontSize="9" fill={C.label}>keep back flat</text>
      </svg>
    </div>
  );
}

function CalfRaiseDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes calfRaise { 0%, 100% { transform: translateY(0); } 40%, 60% { transform: translateY(-25px); } }
        .cr-body { animation: calfRaise 2.5s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 240 280" className="w-full h-full" style={{ maxHeight: 220 }}>
        {/* Step/edge */}
        <rect x={80} y={240} width={80} height={20} rx={3} fill="none" stroke={C.prop} strokeWidth="1.5" />
        <g className="cr-body">
          <Head cx={120} cy={30} />
          <Bone x1={120} y1={42} x2={120} y2={130} w={3} />
          <Bone x1={96} y1={60} x2={144} y2={60} w={2} />
          <Bone x1={96} y1={60} x2={80} y2={100} />
          <Bone x1={144} y1={60} x2={160} y2={100} />
          <Bone x1={106} y1={130} x2={134} y2={130} w={2} />
          <Bone x1={106} y1={130} x2={106} y2={195} />
          <Bone x1={134} y1={130} x2={134} y2={195} />
          <Joint cx={106} cy={195} active />
          <Joint cx={134} cy={195} active />
          {/* Feet on edge */}
          <Bone x1={106} y1={195} x2={106} y2={235} />
          <Bone x1={134} y1={195} x2={134} y2={235} />
        </g>
        {/* Calf muscle highlight */}
        <MuscleHighlight points="100,200 106,195 112,200 112,220 106,225 100,220" />
        <MuscleHighlight points="128,200 134,195 140,200 140,220 134,225 128,220" />
        <MotionArrow x={120} y={15} direction="up" />
      </svg>
    </div>
  );
}

function ClamshellDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes clamOpen { 0%, 100% { transform: rotate(0deg); } 40%, 60% { transform: rotate(-35deg); } }
        .clam-top { transform-origin: 160px 115px; animation: clamOpen 3s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 280 200" className="w-full h-full" style={{ maxHeight: 180 }}>
        <Ground y={165} x1={5} x2={275} />
        {/* Sidelying */}
        <Head cx={40} cy={120} r={9} />
        <Bone x1={50} y1={120} x2={160} y2={115} w={3} />
        <Joint cx={160} cy={115} active />
        {/* Bottom leg stays */}
        <Bone x1={160} y1={120} x2={220} y2={140} />
        <Joint cx={220} cy={140} />
        <Bone x1={220} y1={140} x2={250} y2={155} />
        {/* Top leg opens */}
        <g className="clam-top">
          <Bone x1={160} y1={115} x2={220} y2={130} />
          <Joint cx={220} cy={130} />
          <Bone x1={220} y1={130} x2={250} y2={145} />
        </g>
        {/* Glute highlight */}
        <MuscleHighlight points="148,105 160,110 172,105 170,98 150,98" />
        {/* Rotation arc */}
        <AngleArc cx={160} cy={115} r={40} startAngle={10} endAngle={-25} label="" />
        <text x={160} y={190} textAnchor="middle" fontSize="9" fill={C.label}>feet together, knees apart</text>
      </svg>
    </div>
  );
}

function PlankDemo() {
  return (
    <svg viewBox="0 0 280 160" className="w-full h-full" style={{ maxHeight: 140 }}>
      <Ground y={140} x1={5} x2={275} />
      {/* Forearms on ground */}
      <Bone x1={40} y1={110} x2={70} y2={110} w={2.5} />
      <Joint cx={70} cy={110} active />
      {/* Body - straight line */}
      <Head cx={35} cy={95} r={8} />
      <Bone x1={70} y1={105} x2={200} y2={100} w={3} />
      {/* Core highlight */}
      <MuscleHighlight points="100,95 160,93 165,100 165,110 100,112" />
      {/* Hip */}
      <Joint cx={200} cy={100} />
      {/* Legs */}
      <Bone x1={200} y1={100} x2={250} y2={130} />
      {/* Toes */}
      <Bone x1={250} y1={130} x2={260} y2={135} />
      {/* Alignment line */}
      <line x1={40} y1={100} x2={260} y2={95} stroke={C.arcDim} strokeWidth="1" strokeDasharray="4" />
      <text x={150} y={80} textAnchor="middle" fontSize="9" fill={C.label}>straight line: ears to ankles</text>
    </svg>
  );
}

function SingleLegBalanceDemo() {
  return (
    <div className="relative">
      <style>{`
        @keyframes balanceSway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        .balance-body { transform-origin: 120px 255px; animation: balanceSway 2s ease-in-out infinite; }
      `}</style>
      <svg viewBox="0 0 240 280" className="w-full h-full" style={{ maxHeight: 220 }}>
        <Ground y={260} />
        <g className="balance-body">
          <Head cx={120} cy={40} />
          <Bone x1={120} y1={52} x2={120} y2={140} w={3} />
          <Bone x1={96} y1={70} x2={144} y2={70} w={2} />
          <Bone x1={96} y1={70} x2={80} y2={100} />
          <Bone x1={144} y1={70} x2={160} y2={100} />
          <Bone x1={106} y1={140} x2={134} y2={140} w={2} />
          {/* Standing leg */}
          <Bone x1={120} y1={140} x2={120} y2={200} />
          <Joint cx={120} cy={200} />
          <Bone x1={120} y1={200} x2={120} y2={255} />
          <Joint cx={120} cy={255} active />
          {/* Lifted leg */}
          <Bone x1={134} y1={140} x2={155} y2={160} />
          <Joint cx={155} cy={160} />
          <Bone x1={155} y1={160} x2={165} y2={185} />
        </g>
        {/* Balance indicator */}
        <line x1={120} y1={20} x2={120} y2={260} stroke={C.arcDim} strokeWidth="1" strokeDasharray="4" />
        <text x={185} y={175} fontSize="9" fill={C.label}>30s hold</text>
      </svg>
    </div>
  );
}

// --- Template-based renderer for exercises without specific demos ---

function TemplateDemo({ name, region, category }: { name: string; region: string; category: string }) {
  // Choose the best template based on region + category
  if (region === "lumbar" || region === "cervical") {
    if (category === "stabilization") return <PlankDemo />;
    if (name.toLowerCase().includes("dead bug")) return <DeadBugDemo />;
    if (name.toLowerCase().includes("chin tuck")) return <ChinTuckDemo />;
    if (name.toLowerCase().includes("bridge")) return <BridgeDemo />;
  }
  if (region === "knee" || region === "hip") {
    if (name.toLowerCase().includes("squat")) return <SquatDemo />;
    if (name.toLowerCase().includes("bridge")) return <BridgeDemo />;
    if (name.toLowerCase().includes("clam")) return <ClamshellDemo />;
    if (name.toLowerCase().includes("balance")) return <SingleLegBalanceDemo />;
  }
  if (region === "ankle") {
    if (name.toLowerCase().includes("calf") || name.toLowerCase().includes("heel")) return <CalfRaiseDemo />;
    if (name.toLowerCase().includes("balance")) return <SingleLegBalanceDemo />;
  }
  if (region === "shoulder") {
    return <ShoulderFlexionDemo />;
  }

  // Category-based fallback
  if (category === "strengthening") return <SquatDemo />;
  if (category === "stabilization") return <PlankDemo />;
  if (category === "mobility") return <ShoulderFlexionDemo />;
  if (category === "stretching") return <BridgeDemo />;

  // Ultimate fallback — animated standing figure
  return (
    <StandingFigure
      activeJoints={region === "shoulder" ? ["l_shoulder"] : region === "knee" ? ["l_knee", "r_knee"] : ["l_hip", "r_hip"]}
      annotations={
        <text x={120} y={275} textAnchor="middle" fontSize="9" fill={C.label}>
          Follow cues below
        </text>
      }
    />
  );
}

// --- Exercise ID → specific demo mapping ---
const SPECIFIC_DEMOS: Record<string, () => React.JSX.Element> = {
  // Shoulder
  wall_slide_01: ShoulderFlexionDemo,
  shoulder_flexion_supine_01: ShoulderFlexionDemo,
  shoulder_abduction_standing_01: ShoulderFlexionDemo,
  // Knee
  mini_squat_01: SquatDemo,
  bodyweight_squat_01: SquatDemo,
  single_leg_squat_01: SingleLegBalanceDemo,
  bulgarian_split_squat_01: SquatDemo,
  // Hip
  glute_bridge_01: BridgeDemo,
  single_leg_bridge_01: BridgeDemo,
  clamshell_01: ClamshellDemo,
  // Lumbar
  dead_bug_01: DeadBugDemo,
  forearm_plank_01: PlankDemo,
  glute_bridge_lumbar_01: BridgeDemo,
  // Cervical
  chin_tuck_01: ChinTuckDemo,
  // Ankle
  calf_raise_standing_01: CalfRaiseDemo,
  alfredson_eccentric_straight_01: CalfRaiseDemo,
  single_leg_balance_01: SingleLegBalanceDemo,
};

export default function ExerciseDemo({ exerciseId, exerciseName, bodyRegion, category }: ExerciseDemoProps) {
  const DemoComponent = useMemo(() => {
    // Check specific mapping first
    const specific = SPECIFIC_DEMOS[exerciseId];
    if (specific) return specific;

    // Check by partial ID match
    for (const [key, comp] of Object.entries(SPECIFIC_DEMOS)) {
      if (exerciseId.includes(key.replace(/_\d+$/, ""))) return comp;
    }

    return null;
  }, [exerciseId]);

  return (
    <div
      className="flex items-center justify-center rounded-xl overflow-hidden"
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        padding: "8px",
        minHeight: 160,
      }}
    >
      {DemoComponent ? (
        <DemoComponent />
      ) : (
        <TemplateDemo
          name={exerciseName || exerciseId}
          region={bodyRegion || "shoulder"}
          category={category || "mobility"}
        />
      )}
    </div>
  );
}
