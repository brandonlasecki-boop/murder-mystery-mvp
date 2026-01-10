"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setErr("Enter your purchase code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error ?? "Could not redeem code.");
        return;
      }

      // Go straight into your existing host flow
      router.push(`/setup/${encodeURIComponent(json.gameId)}?pin=${encodeURIComponent(json.hostPin)}`);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="deadair-page">
      <div className="deadair-wrap">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1 className="deadair-title">Start Game</h1>
            <p className="deadair-sub">Enter your purchase code. The narration is ready.</p>
          </div>
          <Link className="deadair-btn deadair-btnGhost" href="/">
            Back
          </Link>
        </header>

        <section style={{ marginTop: 18 }}>
          <div className="deadair-card" style={{ maxWidth: 520 }}>
            <form onSubmit={onSubmit}>
              <label style={{ display: "block", fontFamily: "var(--sans)", fontSize: 12, color: "var(--dim)" }}>
                Purchase Code
              </label>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="DA-XXXXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.25)",
                  color: "var(--ink)",
                  outline: "none",
                  fontFamily: "var(--mono)",
                  fontSize: 14,
                }}
              />

              {err && (
                <p style={{ marginTop: 10, marginBottom: 0, color: "rgba(255,120,120,0.9)", fontFamily: "var(--sans)", fontSize: 13 }}>
                  {err}
                </p>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <button
                  type="submit"
                  className={`deadair-btn deadair-btnPrimary ${loading ? "deadair-btnDisabled" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Checking…" : "Continue"}
                </button>

                <Link className="deadair-btn deadair-btnGhost" href="/pricing">
                  Buy a game
                </Link>
              </div>

              <p style={{ marginTop: 12, marginBottom: 0, color: "var(--dim)", fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.6 }}>
                Bought earlier? This is the “I lost the link” route.
                <br />
                The narration understands. Barely.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
