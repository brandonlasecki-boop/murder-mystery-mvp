"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  host_pin: string;
};

type Player = {
  id: string;
  name: string;
  code: string;
  invite_email?: string | null;
  invite_phone?: string | null;
};

export default function GuestListEditor() {
  const params = useParams();
  const searchParams = useSearchParams();

  const gameId = (params.gameId as string) || "";
  const pin = searchParams.get("pin") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const styles = useMemo(() => {
    const bg = "#0b0d12";
    const panel = "rgba(255,255,255,0.06)";
    const border = "rgba(255,255,255,0.10)";
    const text = "rgba(255,255,255,0.92)";
    const muted = "rgba(255,255,255,0.72)";
    const dim = "rgba(255,255,255,0.56)";
    const accent = "#b11d2a";
    const sans =
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    const mono =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

    return {
      page: {
        minHeight: "100vh",
        color: text,
        background: `
          radial-gradient(900px 520px at 15% 10%, rgba(177,29,42,0.16), transparent 60%),
          radial-gradient(900px 520px at 85% 0%, rgba(210,180,140,0.10), transparent 60%),
          radial-gradient(900px 520px at 50% 100%, rgba(255,255,255,0.06), transparent 55%),
          ${bg}
        `,
        padding: "28px 16px 64px",
        fontFamily:
          'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      } as const,
      wrap: { maxWidth: 900, margin: "0 auto" } as const,
      card: {
        background: panel,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      } as const,
      h1: { margin: 0, fontSize: 28, letterSpacing: "0.4px", lineHeight: 1.1 } as const,
      sub: { margin: "8px 0 0", color: muted, fontSize: 13, fontFamily: sans, lineHeight: 1.45 } as const,
      hr: {
        height: 1,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        margin: "14px 0",
      } as const,
      block: {
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.10)`,
        background: "rgba(0,0,0,0.16)",
      } as const,
      row: { display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 10 } as const,
      label: { fontFamily: sans, fontSize: 12, color: dim, marginBottom: 6 } as const,
      input: {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: "rgba(0,0,0,0.22)",
        color: text,
        fontFamily: sans,
        fontSize: 14,
        outline: "none",
      } as const,
      btnRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, alignItems: "center" } as const,
      btn: {
        appearance: "none",
        border: `1px solid ${border}`,
        background: "rgba(255,255,255,0.05)",
        color: text,
        padding: "10px 12px",
        borderRadius: 12,
        cursor: "pointer",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1,
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      } as const,
      btnPrimary: {
        border: `1px solid rgba(177,29,42,0.50)`,
        background: "rgba(177,29,42,0.18)",
      } as const,
      btnGhost: { background: "rgba(0,0,0,0.18)" } as const,
      btnDisabled: { opacity: 0.45, cursor: "not-allowed" } as const,
      error: {
        border: `1px solid rgba(177,29,42,0.45)`,
        background: "rgba(177,29,42,0.14)",
        borderRadius: 14,
        padding: 12,
        color: "rgba(255,255,255,0.90)",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1.4,
        marginTop: 12,
      } as const,
      toast: {
        position: "fixed",
        left: "50%",
        bottom: 18,
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.68)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.92)",
        padding: "10px 12px",
        borderRadius: 12,
        fontFamily: sans,
        fontSize: 13,
        maxWidth: 520,
        boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
      } as const,
      mono: { fontFamily: mono } as const,
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1400);
  }

  useEffect(() => {
    async function load() {
      if (!gameId) return;
      setLoading(true);
      setErrorMsg(null);

      const { data: g, error: gErr } = await supabase
        .from("games")
        .select("id,host_pin")
        .eq("id", gameId)
        .single();

      if (gErr || !g) {
        setErrorMsg(gErr?.message ?? "Game not found.");
        setLoading(false);
        return;
      }

      if (!pin || pin !== g.host_pin) {
        setErrorMsg("Wrong or missing host PIN.");
        setLoading(false);
        return;
      }

      const { data: ps, error: pErr } = await supabase
        .from("players")
        .select("id,name,code,invite_email,invite_phone")
        .eq("game_id", gameId)
        .order("created_at");

      if (pErr) {
        setErrorMsg(pErr.message);
        setLoading(false);
        return;
      }

      setGame(g);
      setPlayers((ps ?? []) as Player[]);
      setLoading(false);
    }

    load();
  }, [gameId, pin]);

  async function onSave() {
    if (!game) return;

    // names required
    const missing = players.findIndex((p) => !p.name.trim());
    if (missing !== -1) {
      setErrorMsg(`Player ${missing + 1} needs a name.`);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // Update each player (simple + reliable; fine for 6–12)
    for (const p of players) {
      const { error } = await supabase
        .from("players")
        .update({
          name: p.name.trim(),
          // If these columns don't exist in your DB, remove these two lines.
          invite_email: p.invite_email ?? null,
          invite_phone: p.invite_phone ?? null,
        })
        .eq("id", p.id);

      if (error) {
        setErrorMsg(error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    showToast("Saved");
  }

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;

  if (!game) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Guest list unavailable</h2>
            <p style={styles.sub}>{errorMsg ?? "Game not found or invalid PIN."}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Edit Guest List</h1>
          <p style={styles.sub}>
            Update player names before intake begins.
            <br />
            Game: <span style={styles.mono}>{gameId}</span>
          </p>

          <div style={styles.hr} />

          {players.map((p, idx) => (
            <div key={p.id} style={styles.block}>
              <p style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui", color: "rgba(255,255,255,0.86)", fontSize: 13 }}>
                Player {idx + 1} • code: <span style={styles.mono}>{p.code}</span>
              </p>

              <div style={{ ...styles.row, marginTop: 10 }}>
                <div>
                  <div style={styles.label}>Name *</div>
                  <input
                    style={styles.input}
                    value={p.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPlayers((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: v } : x)));
                    }}
                  />
                </div>

                <div>
                  <div style={styles.label}>Invite (optional)</div>
                  <input
                    style={styles.input}
                    value={(p.invite_email || p.invite_phone) ?? ""}
                    placeholder="Optional — add later"
                    disabled
                  />
                </div>
              </div>
            </div>
          ))}

          {errorMsg && <div style={styles.error}>{errorMsg}</div>}

          <div style={styles.btnRow}>
            <button
              onClick={onSave}
              disabled={saving}
              style={{ ...styles.btn, ...styles.btnPrimary, ...(saving ? styles.btnDisabled : {}) }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>

            <a href={`/host/${gameId}?pin=${pin}`} style={{ ...styles.btn, ...styles.btnGhost }}>
              Back to Host
            </a>

            <a href={`/intake/host/${gameId}?pin=${pin}`} style={{ ...styles.btn, ...styles.btnGhost }}>
              Go to Host Intake
            </a>
          </div>
        </div>

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </main>
  );
}
