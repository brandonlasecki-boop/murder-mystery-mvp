"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Join() {
  const [code, setCode] = useState("");
  const router = useRouter();

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2>Join Game</h2>
      <p>Enter your player code.</p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.trim())}
        placeholder="e.g. X7a9KpQ"
        style={{ width: "100%", padding: 10, fontSize: 16 }}
      />

      <button onClick={() => router.push(`/p/${encodeURIComponent(code)}`)} style={{ marginTop: 12 }}>
        Continue
      </button>
    </main>
  );
}
