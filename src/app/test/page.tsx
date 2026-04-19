"use client";

import { useState } from "react";

export default function TestPage() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ padding: 40, background: "#060a0e", minHeight: "100vh", color: "white" }}>
      <h1 style={{ fontSize: 32 }}>Test Page Works</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)} style={{ padding: "8px 16px", background: "#38bdc3", border: "none", borderRadius: 8, color: "black", cursor: "pointer", marginTop: 16 }}>
        Increment
      </button>
    </main>
  );
}
