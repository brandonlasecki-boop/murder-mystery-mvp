"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

type Game = {
  id: string;
  host_pin: string;
  player_count: number | null; // /create stores it
  status: string | null;
};

type Row = {
  name: string;
  contact: string; // placeholder only (not saved yet)
};

export default function SetupGame() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = (params.gameId as string) || "";
  const pin = searchParams.get("pin") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [game, setGame] = useState<Game | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function desiredPlayerCount(g: Game | null) {
    const n = g?.player_count ?? 6;
    return n > 0 ? n : 6;
  }

  const styles = useMemo(() => {
    const bg = "#07080a";
    const text = "rgba(255,255,255,0.92)";
    const muted = "rgba(255,255,255,0.72)";
    const dim = "rgba(255,255,255,0.56)";
    const border = "rgba(255,255,255,0.12)";
    const panel = "rgba(255,255,255,0.06)";
    const panel2 = "rgba(0,0,0,0.24)";
    const accent = "#b11d2a";
    const gold = "rgba(210,180,140,0.95)";
    const goldBorder = "rgba(210,180,140,0.22)";

    const sans =
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    const mono =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    const serif =
      'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';

    return {
      page: {
        minHeight: "100vh",
        color: text,
        background: `
          radial-gradient(900px 520px at 15% 10%, rgba(177,29,42,0.18), transparent 60%),
          radial-gradient(900px 520px at 85% 20%, rgba(210,180,140,0.12), transparent 60%),
          radial-gradient(900px 520px at 50% 100%, rgba(255,255,255,0.06), transparent 55%),
          ${bg}
        `,
        padding: "28px 16px 64px",
        fontFamily: serif,
        position: "relative",
        overflow: "hidden",
      } as const,

      // subtle vignette overlay
      vignette: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(1200px circle at 50% 30%, rgba(0,0,0,0.0), rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.82) 100%)",
      } as const,

      wrap: { maxWidth: 980, margin: "0 auto", position: "relative" } as const,

      topCard: {
        border: `1px solid ${border}`,
        background: panel,
        borderRadius: 18,
        padding: 18,
        boxShadow:
          "0 18px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      } as const,

      titleRow: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      } as const,

      brand: {
        display: "grid",
        gap: 6,
      } as const,

      deadAir: {
        margin: 0,
        fontSize: 40,
        letterSpacing: "2px",
        lineHeight: 1,
        textTransform: "uppercase",
        fontWeight: 900,
      } as const,

      tagline: {
        margin: 0,
        fontFamily: sans,
        color: accent,
        letterSpacing: "2px",
        textTransform: "uppercase",
        fontSize: 12,
      } as const,

      headline: {
        margin: "12px 0 0",
        fontSize: 22,
        letterSpacing: "0.4px",
        lineHeight: 1.15,
      } as const,

      sub: {
        margin: "10px 0 0",
        color: muted,
        fontSize: 13,
        fontFamily: sans,
        lineHeight: 1.55,
      } as const,

      metaPills: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "flex-end",
      } as const,

      pill: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: "rgba(0,0,0,0.18)",
        color: muted,
        fontFamily: sans,
        fontSize: 12,
      } as const,

      dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: accent,
        boxShadow: "0 0 18px rgba(177,29,42,0.55)",
      } as const,

      hr: {
        height: 1,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        margin: "16px 0",
      } as const,

      instructions: {
        border: `1px solid ${goldBorder}`,
        background: "linear-gradient(180deg, rgba(210,180,140,0.14), rgba(0,0,0,0.18))",
        borderRadius: 16,
        padding: 14,
        color: "rgba(255,255,255,0.90)",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1.6,
      } as const,

      instructionsTitle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 8,
      } as const,

      hintPill: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${goldBorder}`,
        background: "rgba(210,180,140,0.10)",
        color: gold,
        fontFamily: sans,
        fontSize: 12,
      } as const,

      fileGrid: {
        display: "grid",
        gap: 12,
        marginTop: 14,
      } as const,

      fileCard: {
        border: `1px solid ${border}`,
        background: panel2,
        borderRadius: 18,
        padding: 14,
        boxShadow: "0 16px 45px rgba(0,0,0,0.35)",
      } as const,

      fileTop: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      } as const,

      fileLabel: {
        margin: 0,
        fontFamily: sans,
        fontSize: 12,
        color: "rgba(255,255,255,0.82)",
        letterSpacing: "1.8px",
        textTransform: "uppercase",
      } as const,

      fileRightHint: {
        fontFamily: sans,
        fontSize: 12,
        color: dim,
      } as const,

      fileSep: {
        height: 1,
        margin: "10px 0 12px",
        background:
          "linear-gradient(90deg, rgba(177,29,42,0.0), rgba(177,29,42,0.35), rgba(177,29,42,0.0))",
      } as const,

      row: {
        display: "grid",
        gridTemplateColumns: "1.2fr 0.9fr",
        gap: 10,
      } as const,

      label: {
        fontFamily: sans,
        fontSize: 12,
        color: dim,
        marginBottom: 6,
      } as const,

      input: {
        width: "100%",
        padding: "11px 12px",
        borderRadius: 14,
        border: `1px solid ${border}`,
        background: "rgba(0,0,0,0.26)",
        color: text,
        fontFamily: sans,
        fontSize: 14,
        outline: "none",
      } as const,

      helper: {
        fontFamily: sans,
        fontSize: 12,
        color: dim,
        marginTop: 8,
        lineHeight: 1.5,
      } as const,

      error: {
        border: `1px solid rgba(177,29,42,0.50)`,
        background: "rgba(177,29,42,0.14)",
        borderRadius: 16,
        padding: 12,
        color: "rgba(255,255,255,0.92)",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1.5,
        marginTop: 14,
      } as const,

      bottomBar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.10)",
      } as const,

      btnRow: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      } as const,

      btn: {
        appearance: "none",
        border: `1px solid ${border}`,
        background: "rgba(255,255,255,0.06)",
        color: text,
        padding: "11px 14px",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      } as const,

      btnPrimary: {
        border: `1px solid rgba(177,29,42,0.55)`,
        background: "linear-gradient(180deg, rgba(177,29,42,0.26), rgba(177,29,42,0.12))",
      } as const,

      btnDisabled: { opacity: 0.45, cursor: "not-allowed" } as const,

      footerMeta: { fontFamily: sans, fontSize: 12, color: muted } as const,
      mono: { fontFamily: mono } as const,
    };
  }, []);

  useEffect(() => {
    async function load() {
      if (!gameId) return;
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("games")
        .select("id,host_pin,player_count,status")
        .eq("id", gameId);

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      if (!data || data.length === 0) {
        setErrorMsg("Game not found.");
        setLoading(false);
        return;
      }

      const g = data[0] as Game;

      if (!pin || pin !== g.host_pin) {
        setErrorMsg("Wrong or missing host PIN.");
        setLoading(false);
        return;
      }

      // If setup already completed, go to host
      if (g.status && g.status !== "setup") {
        router.replace(`/host/${gameId}?pin=${pin}`);
        return;
      }

      setGame(g);

      const n = desiredPlayerCount(g);
      setRows(Array.from({ length: n }, () => ({ name: "", contact: "" })));

      setLoading(false);
    }

    load();
  }, [gameId, pin, router]);

  async function onContinue() {
    if (!game || saving) return;

    const n = desiredPlayerCount(game);

    // Validate names
    const trimmed = rows.slice(0, n).map((r) => ({
      name: r.name.trim(),
      contact: r.contact.trim(),
    }));

    const missingIdx = trimmed.findIndex((r) => !r.name);
    if (missingIdx !== -1) {
      setErrorMsg(`Player ${missingIdx + 1} needs a name.`);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // Prevent duplicate setup
    const { data: existingPlayers, error: epErr } = await supabase
      .from("players")
      .select("id")
      .eq("game_id", gameId);

    if (epErr) {
      setErrorMsg(epErr.message);
      setSaving(false);
      return;
    }

    if ((existingPlayers?.length ?? 0) > 0) {
      // Already set up — move forward
      await supabase.from("games").update({ status: "collecting_intakes" }).eq("id", gameId);
      setSaving(false);
      router.push(`/host/${gameId}?pin=${pin}`);
      return;
    }

    const playersToInsert = trimmed.map((r) => ({
      game_id: gameId,
      name: r.name,
      code: nanoid(7),
      intake_complete: false,
      // contact is NOT saved yet (future feature)
    }));

    const { error: pErr } = await supabase.from("players").insert(playersToInsert);
    if (pErr) {
      setErrorMsg(pErr.message);
      setSaving(false);
      return;
    }

    // Create rounds if missing (avoid NOT NULL)
    const { data: existingRounds, error: erErr } = await supabase
      .from("rounds")
      .select("round_number")
      .eq("game_id", gameId);

    if (erErr) {
      setErrorMsg(erErr.message);
      setSaving(false);
      return;
    }

    if (!existingRounds || existingRounds.length === 0) {
      const roundsToInsert = [1, 2, 3, 4].map((num) => ({
        game_id: gameId,
        round_number: num,
        title: `Round ${num}`,
        narration_text: "", // NOT NULL in DB
      }));

      const { error: rErr } = await supabase.from("rounds").insert(roundsToInsert);
      if (rErr) {
        setErrorMsg(rErr.message);
        setSaving(false);
        return;
      }
    }

    // Advance game state
    const { error: sErr } = await supabase
      .from("games")
      .update({ status: "collecting_intakes" })
      .eq("id", gameId);

    if (sErr) {
      setErrorMsg(sErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(`/host/${gameId}?pin=${pin}`);
  }

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;

  if (!game) {
    return (
      <main style={styles.page}>
        <div style={styles.vignette} />
        <div style={styles.wrap}>
          <div style={styles.topCard}>
            <h2 style={{ marginTop: 0 }}>Setup unavailable</h2>
            <p style={styles.sub}>{errorMsg ?? "Game not found or invalid PIN."}</p>
          </div>
        </div>
      </main>
    );
  }

  const n = desiredPlayerCount(game);

  return (
    <main style={styles.page}>
      <div style={styles.vignette} />
      <div style={styles.wrap}>
        <div style={styles.topCard}>
          <div style={styles.titleRow}>
            <div style={styles.brand}>
              <h1 style={styles.deadAir}>DEAD AIR</h1>
              <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
              <div>
                <h2 style={styles.headline}>Assemble the Guest List</h2>
                <p style={styles.sub}>
                  You selected <b>{n}</b> players for this case.
                  <br />
                  <b>Names are required.</b> You can change them later before intake begins.
                </p>
              </div>
            </div>

            <div style={styles.metaPills}>
              <span style={styles.pill}>
                <span style={styles.dot} /> Phase: <b>Setup</b>
              </span>
              <span style={styles.pill}>
                Case file: <span style={styles.mono}>{gameId}</span>
              </span>
            </div>
          </div>

          <div style={styles.hr} />

          <div style={styles.instructions}>
            <div style={styles.instructionsTitle}>
              <b>Instructions</b>
              <span style={styles.hintPill}>Names first. Chaos later.</span>
            </div>
            1) Enter each player’s <b>name</b> (required). <br />
            2) Contact is <b>optional</b> — used later if you want automated invites. <br />
            3) If you know your guests well enough, you can fill intakes for them later using Host Intake.
          </div>

          <div style={styles.fileGrid}>
            {rows.slice(0, n).map((r, idx) => (
              <div key={idx} style={styles.fileCard}>
                <div style={styles.fileTop}>
                  <p style={styles.fileLabel}>CASE FILE #{String(idx + 1).padStart(2, "0")}</p>
                  <span style={styles.fileRightHint}>Name required • Contact optional</span>
                </div>

                <div style={styles.fileSep} />

                <div style={styles.row}>
                  <div>
                    <div style={styles.label}>Name *</div>
                    <input
                      style={styles.input}
                      value={r.name}
                      placeholder="e.g. Brandon"
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], name: v };
                          return copy;
                        });
                      }}
                    />
                    <div style={styles.helper}>
                      This is what they’ll see on their intake and in your host dashboard.
                      (Yes, you can rename them later if you typo. We’re not monsters.)
                    </div>
                  </div>

                  <div>
                    <div style={styles.label}>Email (optional)</div>
                    <input
                      style={styles.input}
                      value={r.contact}
                      placeholder="Optional — for future invites"
                      onChange={(e) => {
                        const v = e.target.value;
                        setRows((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], contact: v };
                          return copy;
                        });
                      }}
                    />
                    <div style={styles.helper}>
                      Leave blank if you’ll be filling this person’s intake yourself.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {errorMsg && <div style={styles.error}>{errorMsg}</div>}

          <div style={styles.bottomBar}>
            <div style={styles.btnRow}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnPrimary,
                  ...(saving ? styles.btnDisabled : {}),
                }}
                disabled={saving}
                onClick={onContinue}
              >
                {saving ? "Saving…" : "Continue to Host Dashboard"}
              </button>
            </div>

            <div style={styles.footerMeta}>
              PIN verified · Game ID: <span style={styles.mono}>{gameId}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
