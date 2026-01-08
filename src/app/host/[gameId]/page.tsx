"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  host_pin: string;
  current_round: number | null;
  story_generated: boolean;
};

type Player = {
  id: string;
  name: string;
  code: string;
  intake_complete: boolean;
};

type Round = {
  round_number: number;
  title: string | null;
  narration_text: string | null;
  narration_audio_url?: string | null;
  narration_audio_url_part_b?: string | null;
};

export default function Host() {
  const params = useParams();
  const searchParams = useSearchParams();

  const gameId = (params.gameId as string) || "";
  const pin = searchParams.get("pin") || "";

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "http://localhost:3000";
    return window.location.origin;
  }, []);

  const styles = useMemo(() => {
    const bg = "#0b0d12";
    const panel = "rgba(255,255,255,0.06)";
    const border = "rgba(255,255,255,0.10)";
    const text = "rgba(255,255,255,0.92)";
    const muted = "rgba(255,255,255,0.72)";
    const dim = "rgba(255,255,255,0.56)";
    const accent = "#b11d2a"; // blood red
    const parchment = "rgba(210,180,140,0.16)";
    const mono =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    const sans =
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';

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
      wrap: {
        maxWidth: 1040,
        margin: "0 auto",
      } as const,

      headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 14,
      } as const,
      h1: {
        margin: 0,
        fontSize: 28,
        letterSpacing: "0.4px",
        lineHeight: 1.1,
      } as const,
      sub: {
        margin: "8px 0 0",
        color: muted,
        fontSize: 13,
        fontFamily: sans,
      } as const,

      badgeRow: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
      } as const,
      badge: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: panel,
        color: muted,
        fontSize: 12,
        fontFamily: sans,
      } as const,
      dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: accent,
        boxShadow: `0 0 18px rgba(177,29,42,0.55)`,
      } as const,
      mono: { fontFamily: mono } as const,

      card: {
        background: panel,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      } as const,
      cardTitle: {
        margin: 0,
        fontSize: 15,
        letterSpacing: "0.2px",
        fontFamily: sans,
      } as const,
      note: {
        margin: "10px 0 0",
        color: muted,
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: sans,
      } as const,
      hr: {
        height: 1,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        margin: "14px 0",
      } as const,

      btnRow: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 10,
      } as const,

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
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      } as const,
      btnPrimary: {
        border: `1px solid rgba(177,29,42,0.50)`,
        background: "rgba(177,29,42,0.18)",
      } as const,
      btnGhost: {
        background: "rgba(0,0,0,0.18)",
      } as const,
      btnDisabled: {
        opacity: 0.45,
        cursor: "not-allowed",
      } as const,

      sectionTitle: {
        margin: "18px 0 10px",
        fontSize: 16,
        letterSpacing: "0.2px",
        fontFamily: sans,
      } as const,

      pre: {
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: 1.5,
        fontFamily: sans,
        fontSize: 13,
        color: "rgba(255,255,255,0.88)",
      } as const,
      preBox: {
        background: "rgba(0,0,0,0.22)",
        border: `1px solid rgba(255,255,255,0.10)`,
        padding: 12,
        borderRadius: 14,
      } as const,

      playerList: {
        margin: 0,
        padding: 0,
        listStyle: "none",
      } as const,
      playerItem: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        alignItems: "flex-start",
        flexWrap: "wrap",
      } as const,
      playerLeft: { minWidth: 280 } as const,
      playerNameRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        fontFamily: sans,
        fontSize: 14,
      } as const,
      pillOk: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
        color: muted,
        fontFamily: sans,
        fontSize: 12,
      } as const,
      pillPrivate: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(210,180,140,0.25)",
        background: parchment,
        color: "rgba(255,255,255,0.85)",
        fontFamily: sans,
        fontSize: 12,
      } as const,
      link: {
        color: "rgba(255,255,255,0.90)",
        textDecoration: "underline",
        textUnderlineOffset: 3,
        fontFamily: sans,
        fontSize: 12,
      } as const,
      small: {
        color: dim,
        fontSize: 12,
        fontFamily: sans,
        marginTop: 6,
        lineHeight: 1.4,
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
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1400);
  }

  async function copyToClipboard(text: string, msg = "Copied") {
    try {
      await navigator.clipboard.writeText(text);
      showToast(msg);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  async function load() {
    if (!gameId) return;
    setLoading(true);

    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("id,host_pin,current_round,story_generated")
      .eq("id", gameId)
      .single();

    if (gErr || !g) {
      setGame(null);
      setPlayers([]);
      setRounds([]);
      setLoading(false);
      return;
    }

    const { data: ps } = await supabase
      .from("players")
      .select("id,name,code,intake_complete")
      .eq("game_id", gameId)
      .order("created_at");

    const { data: rs } = await supabase
      .from("rounds")
      .select("round_number,title,narration_text,narration_audio_url,narration_audio_url_part_b")
      .eq("game_id", gameId)
      .order("round_number");

    setGame(g);
    setPlayers(ps ?? []);
    setRounds(rs ?? []);
    setLoading(false);
  }

  async function setRound(nextRound: number) {
    if (!game) return;

    if (!pin || pin !== game.host_pin) {
      alert("Wrong or missing host PIN. Use the host link that includes ?pin=...");
      return;
    }

    if (!game.story_generated) {
      alert(
        "Almost there — finish all intake forms, then upload narration + private prompts. Once that’s done, mark the game as ready and you can start Round 1."
      );
      return;
    }

    const { error } = await supabase
      .from("games")
      .update({ current_round: nextRound })
      .eq("id", gameId);

    if (error) alert(error.message);
    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;

  if (!game) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Game not found</h2>
            <p style={styles.note}>
              I looked for gameId: <b>{gameId}</b>
            </p>
            <p style={styles.note}>
              Make sure you are using the host link created on <code>/create</code>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const currentRound = game.current_round ?? 0;
  const currentRoundRow = rounds.find((r) => r.round_number === currentRound);

  const totalPlayers = players.length;
  const intakeDone = players.filter((p) => p.intake_complete).length;
  const allIntakesComplete = totalPlayers > 0 && intakeDone === totalPlayers;

  const hostIntakeLink = `${origin}/intake/host/${gameId}?pin=${pin}`;
  const playerIntakeLink = (code: string) => `${origin}/intake/p/${code}`;
  const playerJoinLink = (code: string) => `${origin}/p/${code}`;

  const roundsToShow = [0, 1, 2, 3, 4];

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.h1}>Host Dashboard</h1>
            <p style={styles.sub}>
              Case file: <span style={styles.mono}>{game.id}</span>
            </p>
          </div>

          <div style={styles.badgeRow}>
            <span style={styles.badge}>
              <span style={styles.dot} />
              Round: <b>{currentRound}</b>
            </span>
            <span style={styles.badge}>
              Intake: <b>{intakeDone}</b>/<b>{totalPlayers}</b>
            </span>
            <span style={styles.badge}>
              PIN: <b>{pin ? "✅ detected" : "❌ missing"}</b>
            </span>
          </div>
        </div>

        {/* Status card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Status</h3>

          {!allIntakesComplete ? (
            <p style={styles.note}>
              Waiting on intake forms: <b>{intakeDone}</b> / <b>{totalPlayers}</b> complete.
              <br />
              Send players their intake links below, or fill them yourself using the host intake page.
            </p>
          ) : !game.story_generated ? (
            <p style={styles.note}>
              All intake forms are complete.
              <br />
              Next step: upload the narration + private prompts, then mark the game as ready to start.
            </p>
          ) : (
            <p style={styles.note}>
              Story is ready. You can start Round 1 whenever you want.
            </p>
          )}

          {!allIntakesComplete && (
            <div style={styles.btnRow}>
              <button
                style={{ ...styles.btn, ...styles.btnGhost }}
                onClick={() => copyToClipboard(hostIntakeLink, "Copied host intake link")}
              >
                Copy host intake link
              </button>
              <span style={{ ...styles.sub, margin: 0 }}>
                (Host fills on behalf of players)
              </span>
            </div>
          )}

          <div style={styles.hr} />

          <div style={styles.btnRow}>
            {roundsToShow.map((r) => {
              const disabled = !game.story_generated;
              const isCurrent = r === currentRound;
              return (
                <button
                  key={r}
                  onClick={() => setRound(r)}
                  disabled={disabled}
                  style={{
                    ...styles.btn,
                    ...(isCurrent ? styles.btnPrimary : {}),
                    ...(disabled ? styles.btnDisabled : {}),
                  }}
                  title={
                    disabled ? "Finish intakes and upload content first" : `Set current round to ${r}`
                  }
                >
                  Set Round {r}
                </button>
              );
            })}
          </div>

          {!game.story_generated && (
            <p style={{ ...styles.small, marginTop: 10 }}>
              Rounds will unlock once the story is ready to play.
            </p>
          )}
        </div>

        {/* Narration */}
        <h3 style={styles.sectionTitle}>Narration for Current Round</h3>
        <div style={styles.card}>
          {currentRound === 0 ? (
            <p style={styles.note}>Pre-game. Set Round 1 to begin.</p>
          ) : (
            <>
              {currentRoundRow?.narration_audio_url ? (
                <>
                  <div style={styles.pillOk}>
                    <span style={styles.dot} />
                    Audio ready
                  </div>
                  <audio
                    controls
                    src={currentRoundRow.narration_audio_url ?? undefined}
                    style={{ width: "100%", marginTop: 10 }}
                  />

                  {currentRound === 4 && currentRoundRow?.narration_audio_url_part_b ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ ...styles.pillPrivate, marginBottom: 8 }}>
                        Round 4 Reveal — Part B
                      </div>
                      <audio
                        controls
                        src={currentRoundRow.narration_audio_url_part_b ?? undefined}
                        style={{ width: "100%" }}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={styles.note}>No audio URL stored for this round yet.</p>
              )}

              <div style={styles.hr} />

              <div style={{ ...styles.small, marginTop: 0 }}>
                Narration text (reference)
              </div>
              <div style={{ ...styles.preBox, marginTop: 10 }}>
                <pre style={styles.pre}>
                  {currentRoundRow?.narration_text ?? "(No narration stored yet)"}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Players */}
        <h3 style={styles.sectionTitle}>Players</h3>
        <div style={styles.card}>
          <ul style={styles.playerList}>
            {players.map((p) => (
              <li key={p.id} style={styles.playerItem}>
                <div style={styles.playerLeft}>
                  <div style={styles.playerNameRow}>
                    <b>{p.name}</b>
                    <span style={styles.pillOk}>
                      code: <span style={styles.mono}>{p.code}</span>
                    </span>
                    <span style={styles.pillPrivate}>
                      intake: {p.intake_complete ? "✅ complete" : "⏳ pending"}
                    </span>
                    <a href={`/p/${p.code}`} style={styles.link}>
                      open player view
                    </a>
                  </div>

                  <div style={styles.small}>
                    Intake link: <span style={styles.mono}>{playerIntakeLink(p.code)}</span>
                    <br />
                    Join link: <span style={styles.mono}>{playerJoinLink(p.code)}</span>
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button
                    style={{ ...styles.btn, ...styles.btnGhost }}
                    onClick={() =>
                      copyToClipboard(playerIntakeLink(p.code), `Copied ${p.name}'s intake link`)
                    }
                  >
                    Copy intake link
                  </button>

                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={() =>
                      copyToClipboard(playerJoinLink(p.code), `Copied ${p.name}'s join link`)
                    }
                  >
                    Copy join link
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </main>
  );
}
