"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HostAccessClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const code = (sp?.get("code") || "").trim();

  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "error">("loading");

  const theme = useMemo(() => {
    return {
      bg: `radial-gradient(900px 520px at 15% 10%, rgba(177,29,42,0.18), transparent 60%),
           radial-gradient(900px 520px at 85% 0%, rgba(210,180,140,0.12), transparent 60%),
           linear-gradient(180deg, #0b0d10, #07080a)`,
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr(null);
      setPhase("loading");

      if (!code) {
        setPhase("error");
        setErr("Missing purchase code. Go back and enter your code.");
        return;
      }

      try {
        const res = await fetch("/api/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {}

        if (!res.ok) throw new Error(json?.error || `Redeem failed (HTTP ${res.status}).`);

        const gameId = String(json?.gameId || "").trim();
        const hostPin = String(json?.hostPin || "").trim();

        if (!gameId || !hostPin) throw new Error("Redeem returned missing gameId/hostPin.");

        if (cancelled) return;
        router.replace(`/host/${encodeURIComponent(gameId)}?pin=${encodeURIComponent(hostPin)}`);
      } catch (e: any) {
        if (cancelled) return;
        setPhase("error");
        setErr(e?.message ?? "Something went wrong.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

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
        * { box-sizing: border-box; }
        .wrap { max-width: 820px; margin: 0 auto; padding: 22px 0 72px; }
        .card {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, rgba(16,18,22,0.86), rgba(16,18,22,0.52));
          box-shadow: ${theme.shadow};
          padding: 18px;
        }
        .kicker {
          font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          color: rgba(212,175,55,0.92); font-family: ${theme.mono};
        }
        .h1 { margin: 10px 0 0; font-size: 30px; font-family: ${theme.serif}; color: rgba(255,255,255,0.96); }
        .sub { margin: 12px 0 0; color: ${theme.muted}; line-height: 1.55; font-size: 14px; }
        .pill {
          margin-top: 14px; display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.16);
          color: rgba(255,255,255,0.82); font-size: 12px; font-family: ${theme.mono};
        }
        .err {
          margin-top: 14px; padding: 10px 12px; border-radius: 12px;
          border: 1px solid rgba(177,29,42,0.35); background: rgba(177,29,42,0.12);
          color: rgba(255,255,255,0.9); font-size: 13px; line-height: 1.45;
        }
        .btnRow { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; }
        .btn {
          border-radius: 12px; padding: 10px 12px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.18);
          color: rgba(255,255,255,0.9);
          cursor: pointer;
          font-weight: 900;
          letter-spacing: 0.2px;
        }
        .btn:hover { border-color: rgba(255,255,255,0.2); background: rgba(0,0,0,0.24); }
      `}</style>

      <div className="wrap">
        <div className="card">
          <div className="kicker">HOST ACCESS</div>
          <div className="h1">Opening your dashboard…</div>
          <div className="sub">
            Redeeming code: <span style={{ fontFamily: theme.mono }}>{code || "(none)"}</span>
          </div>

          {phase === "loading" ? <div className="pill">⏳ Checking code…</div> : null}

          {phase === "error" ? (
            <>
              <div className="err">{err}</div>
              <div className="btnRow">
                <button className="btn" onClick={() => router.push("/")}>Back to home</button>
                <button className="btn" onClick={() => router.push("/pricing")}>Pricing</button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
