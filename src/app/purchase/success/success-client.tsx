"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function maskPin(pin: string) {
  const p = (pin ?? "").trim();
  if (!p) return "";
  if (p.length <= 2) return "••";
  return `${p.slice(0, 1)}••••${p.slice(-1)}`;
}

export default function SuccessClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const code = (sp?.get("code") || "").trim();
  const gameId = (sp?.get("gameId") || "").trim();
  const pin = (sp?.get("pin") || "").trim();

  // In case you later switch to Stripe session_id redirects
  const sessionId = (sp?.get("session_id") || sp?.get("sessionId") || "").trim();

  const [copied, setCopied] = useState<string | null>(null);

  const theme = useMemo(() => {
    return {
      bg: `radial-gradient(900px 520px at 15% 10%, rgba(177,29,42,0.18), transparent 60%),
           radial-gradient(900px 520px at 85% 0%, rgba(210,180,140,0.12), transparent 60%),
           linear-gradient(180deg, #0b0d10, #07080a)`,
      gold: "#d4af37",
      cream: "rgba(255,255,255,0.92)",
      muted: "rgba(255,255,255,0.72)",
      dim: "rgba(255,255,255,0.56)",
      shadow: "0 18px 65px rgba(0,0,0,0.55)",
      sans: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      mono:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    };
  }, []);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied("Copy failed");
      setTimeout(() => setCopied(null), 1200);
    }
  }

  function openHost() {
    if (!gameId || !pin) {
      router.push("/"); // fallback: use purchase code entry on landing
      return;
    }
    router.push(`/host/${encodeURIComponent(gameId)}?pin=${encodeURIComponent(pin)}`);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.cream,
        fontFamily: theme.sans,
        padding: 18,
      }}
    >
      <style jsx>{`
        * {
          box-sizing: border-box;
        }
        .wrap {
          max-width: 980px;
          margin: 0 auto;
          padding: 22px 0 72px;
        }
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(16, 18, 22, 0.86), rgba(16, 18, 22, 0.52));
          box-shadow: ${theme.shadow};
          padding: 18px;
          overflow: hidden;
          position: relative;
        }
        .glow {
          position: absolute;
          inset: -120px -120px auto -120px;
          height: 260px;
          background: radial-gradient(
            520px 240px at 30% 40%,
            rgba(212, 175, 55, 0.18),
            transparent 60%
          );
          pointer-events: none;
        }
        .kicker {
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(212, 175, 55, 0.92);
          font-family: ${theme.mono};
        }
        .h1 {
          margin: 10px 0 0;
          font-size: 36px;
          letter-spacing: -0.4px;
          line-height: 1.08;
          font-family: ${theme.serif};
          color: rgba(255, 255, 255, 0.96);
        }
        .sub {
          margin: 12px 0 0;
          color: ${theme.muted};
          line-height: 1.55;
          font-size: 15px;
          max-width: 78ch;
        }
        .row {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .btn {
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-weight: 900;
          font-family: ${theme.sans};
          letter-spacing: 0.2px;
        }
        .btn:hover {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.24);
        }
        .btnPrimary {
          border: 1px solid rgba(212, 175, 55, 0.26);
          background: rgba(177, 29, 42, 0.78);
          box-shadow: 0 16px 45px rgba(177, 29, 42, 0.22);
        }
        .btnPrimary:hover {
          background: rgba(177, 29, 42, 0.9);
        }
        .grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        .panel {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          padding: 14px;
        }
        .label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.76);
          font-family: ${theme.mono};
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
        .value {
          margin-top: 8px;
          font-family: ${theme.mono};
          font-size: 13px;
          color: rgba(255, 255, 255, 0.92);
          overflow-wrap: anywhere;
        }
        .muted {
          margin-top: 8px;
          color: ${theme.dim};
          font-size: 12px;
          line-height: 1.45;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.14);
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
          font-family: ${theme.mono};
        }
        .warn {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(177, 29, 42, 0.35);
          background: rgba(177, 29, 42, 0.12);
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          line-height: 1.45;
        }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="glow" aria-hidden />
          <div className="kicker">PURCHASE COMPLETE</div>
          <h1 className="h1">You’re in. Don’t lose your code.</h1>
          <p className="sub">
            This is your handoff screen. Copy your purchase code, then open your host dashboard.
          </p>

          <div className="row">
            <button className="btn btnPrimary" onClick={openHost}>
              Open host dashboard →
            </button>
            <button className="btn" onClick={() => router.push("/")}>
              Home
            </button>
            <button className="btn" onClick={() => router.push("/pricing")}>
              Pricing
            </button>

            {copied ? <span className="pill">✅ {copied}</span> : null}
          </div>

          <div className="grid">
            <div className="panel">
              <div className="label">Purchase code</div>
              <div className="value">{code || "(missing)"}</div>
              <div className="row">
                <button className="btn" onClick={() => copy(code || "", "Code copied")} disabled={!code}>
                  Copy code
                </button>
              </div>
              <div className="muted">You can also paste this on the homepage under “Host access”.</div>
            </div>

            <div className="panel">
              <div className="label">Game info</div>
              <div className="value">gameId: {gameId || "(missing)"}</div>
              <div className="value">pin: {pin ? maskPin(pin) : "(missing)"}</div>
              <div className="row">
                <button
                  className="btn"
                  onClick={() =>
                    copy(
                      gameId && pin ? `/host/${gameId}?pin=${pin}` : "",
                      "Host link copied"
                    )
                  }
                  disabled={!gameId || !pin}
                >
                  Copy host link
                </button>
              </div>
              <div className="muted">If you’re sending this to yourself, copy the host link.</div>
            </div>
          </div>

          {!code || !gameId || !pin ? (
            <div className="warn">
              Missing data in the URL. That’s okay for now — go home and use your purchase code entry.
              <br />
              <span style={{ color: "rgba(255,255,255,0.7)" }}>
                (If you’re coming from mock purchase, the API should send code/gameId/pin.)
              </span>
              {sessionId ? (
                <>
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>
                    Stripe session detected: {sessionId}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
