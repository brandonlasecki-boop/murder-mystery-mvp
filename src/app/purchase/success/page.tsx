"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PurchaseSuccessPage() {
  const sp = useSearchParams();
  const code = sp.get("code") ?? "";
  const gameId = sp.get("gameId") ?? "";
  const pin = sp.get("pin") ?? "";

  const setupUrl = gameId && pin ? `/setup/${gameId}?pin=${pin}` : "";
  const hostUrl = gameId && pin ? `/host/${gameId}?pin=${pin}` : "";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied.");
    } catch {
      // ignore
    }
  }

  return (
    <main className="deadair-page">
      <div className="deadair-wrap">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h1 className="deadair-title">Purchase Complete</h1>
            <p className="deadair-sub">You now officially own a bad idea.</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="deadair-btn deadair-btnGhost" href="/">
              Home
            </Link>
            <Link className="deadair-btn deadair-btnGhost" href="/reviews">
              Reviews
            </Link>
          </div>
        </header>

        <section style={{ marginTop: 18 }}>
          <div className="deadair-card">
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              Save this purchase code. If you lose everything else, this still gets you in.
            </p>

            <div
              style={{
                marginTop: 12,
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.25)",
                color: "var(--ink)",
                fontFamily: "var(--mono)",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span>{code || "Missing code"}</span>
              {code && (
                <button className="deadair-btn deadair-btnGhost" onClick={() => copy(code)}>
                  Copy
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <Link className="deadair-btn deadair-btnPrimary" href="/start">
                Start with code
              </Link>

              {setupUrl && (
                <a className="deadair-btn deadair-btnGhost" href={setupUrl}>
                  Host setup link
                </a>
              )}

              {hostUrl && (
                <a className="deadair-btn deadair-btnGhost" href={hostUrl}>
                  Host dashboard
                </a>
              )}
            </div>

            <p style={{ marginTop: 12, marginBottom: 0, color: "var(--dim)", fontFamily: "var(--sans)", fontSize: 12, lineHeight: 1.6 }}>
              The host setup link is the fastest path.
              <br />
              The purchase code is the “I lost the link” path.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
