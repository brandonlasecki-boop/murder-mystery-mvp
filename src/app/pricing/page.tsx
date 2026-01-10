"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const PACKS = [
  { players: 6, note: "Lean. Fast. Less plausible deniability." },
  { players: 7, note: "Slightly risky. Still manageable." },
  { players: 8, note: "The sweet spot. Socially dangerous." },
  { players: 9, note: "A little chaotic. A lot of confidence." },
  { players: 10, note: "Crowded. Loud. Everyone has a theory." },
  { players: 11, note: "Bold. The narration is taking notes." },
  { players: 12, note: "You’re sure this will go well. Interesting." },
];

// Temporary placeholder pricing (swap to Stripe price IDs later)
function priceForPlayers(n: number) {
  return 29 + (n - 6) * 4;
}

function isValidEmail(input: string) {
  const v = input.trim();
  if (!v) return true; // optional for mock purchase
  // simple, pragmatic check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlayers, setLoadingPlayers] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const emailOk = useMemo(() => isValidEmail(email), [email]);

  async function buy(players: number) {
    setErr(null);

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setErr("That email doesn’t look right. (You can also leave it blank for mock purchase.)");
      return;
    }

    setLoadingPlayers(players);
    try {
      const res = await fetch("/api/mock-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packSize: players, email: trimmedEmail || null }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error ?? "Purchase failed.");
        return;
      }

      router.push(
        `/purchase/success?code=${encodeURIComponent(json.redeemCode)}&gameId=${encodeURIComponent(
          json.gameId
        )}&pin=${encodeURIComponent(json.hostPin)}`
      );
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setLoadingPlayers(null);
    }
  }

  return (
    <main className="deadair-page">
      <div className="deadair-wrap">
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 className="deadair-title">Buy Dead Air</h1>
            <p className="deadair-sub">Choose your group size. 6–12 players.</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="deadair-btn deadair-btnGhost" href="/">
              Back
            </Link>
            <Link className="deadair-btn deadair-btnGhost" href="/start">
              Start with code
            </Link>
            <Link className="deadair-btn deadair-btnGhost" href="/reviews">
              Reviews
            </Link>
          </div>
        </header>

        <section style={{ marginTop: 18 }}>
          <div className="deadair-card">
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              This is the storefront flow.
              <br />
              For now, “Buy” uses a <strong>mock purchase</strong> so you can test end-to-end. Stripe comes next.
            </p>

            <div style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 420 }}>
              <label style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--dim)" }}>
                Email (to send your host link + code)
              </label>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "12px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.25)",
                  color: "var(--ink)",
                  outline: "none",
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                }}
              />

              {!emailOk && (
                <p style={{ margin: 0, color: "rgba(255,120,120,0.9)", fontFamily: "var(--sans)", fontSize: 12 }}>
                  That email doesn’t look right.
                </p>
              )}

              <p style={{ margin: 0, fontFamily: "var(--sans)", fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>
                Optional for mock purchase. Required once Stripe is live.
              </p>
            </div>

            {err && (
              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  color: "rgba(255,120,120,0.9)",
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                }}
              >
                {err}
              </p>
            )}
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {PACKS.map((p) => (
              <div key={p.players} className="deadair-card">
                <div className="deadair-chip">
                  <span className="deadair-dot" />
                  <span>{p.players} players</span>
                </div>

                <p style={{ marginTop: 10, marginBottom: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                  {p.note}
                </p>

                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    color: "var(--paper)",
                    fontFamily: "var(--sans)",
                    fontWeight: 800,
                  }}
                >
                  ${priceForPlayers(p.players)}
                </p>

                <button
                  className={`deadair-btn deadair-btnPrimary ${loadingPlayers === p.players ? "deadair-btnDisabled" : ""}`}
                  style={{ marginTop: 12, width: "100%" }}
                  onClick={() => buy(p.players)}
                  disabled={loadingPlayers !== null || !emailOk}
                  title={!emailOk ? "Fix the email first (or clear it)." : undefined}
                >
                  {loadingPlayers === p.players ? "Creating…" : "Buy"}
                </button>

                <p style={{ marginTop: 10, marginBottom: 0, color: "var(--dim)", fontFamily: "var(--sans)", fontSize: 12 }}>
                  Includes: auto-created game room, host PIN, and a purchase code.
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ marginTop: 18, color: "var(--dim)", fontFamily: "var(--sans)", fontSize: 12 }}>
          Prices are placeholders. The narration is not.
        </footer>
      </div>
    </main>
  );
}
