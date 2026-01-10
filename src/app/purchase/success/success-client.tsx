"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SuccessClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const sessionId = sp?.get("session_id") || sp?.get("sessionId") || "";

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
          max-width: 900px;
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
          max-width: 70ch;
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
        .meta {
          margin-top: 14px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(255, 255, 255, 0.74);
          font-size: 13px;
          line-height: 1.45;
          font-family: ${theme.mono};
        }
        .muted {
          color: ${theme.dim};
        }
        code {
          font-family: ${theme.mono};
        }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="glow" aria-hidden />
          <div className="kicker">PAYMENT CONFIRMED</div>
          <h1 className="h1">You’re in. Your case is being prepared.</h1>
          <p className="sub">
            Next step: use your purchase code on the homepage to open the host dashboard.
          </p>

          <div className="row">
            <button className="btn btnPrimary" onClick={() => router.push("/")}>
              Back to Dead Air →
            </button>
            <button className="btn" onClick={() => router.push("/pricing")}>
              Pricing
            </button>
          </div>

          <div className="meta">
            <div>
              <span className="muted">Session:</span>{" "}
              {sessionId ? sessionId : <span className="muted">(none found in URL)</span>}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Expected Stripe style redirect: <code>?session_id=...</code>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
