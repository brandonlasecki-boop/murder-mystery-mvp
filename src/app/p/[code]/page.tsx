"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  name: string;
  code: string;
  game_id: string;
};

type Game = {
  id: string;
  current_round: number | null;
  story_generated: boolean;
};

type RoundRow = {
  narration_text: string | null;
};

type PlayerRoundRow = {
  private_text: string | null;
};

type RoundContent = {
  narration_text: string | null;
  private_text: string | null;
};

export default function PlayerPage() {
  const params = useParams();
  const code = (params.code as string) || "";

  const [loading, setLoading] = useState(true); // only for initial load
  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [content, setContent] = useState<RoundContent | null>(null);

  // ✅ Narration hidden by default
  const [showNarration, setShowNarration] = useState(false);

  // ✅ Panic hide (strong): never renders the real text while hidden
  const [panicHidden, setPanicHidden] = useState(false);

  // track last round to reset narration + panic when round advances
  const lastRoundRef = useRef<number | null>(null);

  const styles = useMemo(() => {
    const bg = "#07080a";
    const panel = "rgba(255,255,255,0.06)";
    const panel2 = "rgba(0,0,0,0.24)";
    const border = "rgba(255,255,255,0.12)";
    const text = "rgba(255,255,255,0.92)";
    const muted = "rgba(255,255,255,0.72)";
    const dim = "rgba(255,255,255,0.56)";
    const accent = "#b11d2a"; // red
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

      vignette: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(1200px circle at 50% 30%, rgba(0,0,0,0.0), rgba(0,0,0,0.58) 70%, rgba(0,0,0,0.86) 100%)",
      } as const,

      wrap: { maxWidth: 940, margin: "0 auto", position: "relative" } as const,

      topCard: {
        border: `1px solid ${border}`,
        background: panel,
        borderRadius: 18,
        padding: 18,
        boxShadow:
          "0 18px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      } as const,

      headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 14,
        flexWrap: "wrap",
      } as const,

      brand: { display: "grid", gap: 6 } as const,
      deadAir: {
        margin: 0,
        fontSize: 34,
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

      title: {
        margin: 0,
        fontSize: 22,
        letterSpacing: "0.4px",
        lineHeight: 1.1,
      } as const,

      sub: {
        color: muted,
        fontSize: 13,
        fontFamily: sans,
        lineHeight: 1.55,
      } as const,
      subSpaced: { marginTop: 10 } as const,

      pills: {
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

      onAir: {
        border: `1px solid rgba(177,29,42,0.45)`,
        background: "rgba(177,29,42,0.14)",
        color: "rgba(255,255,255,0.92)",
      } as const,

      dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: accent,
        boxShadow: "0 0 18px rgba(177,29,42,0.55)",
      } as const,

      goldHint: {
        border: `1px solid ${goldBorder}`,
        background: "rgba(210,180,140,0.10)",
        color: gold,
      } as const,

      mono: { fontFamily: mono } as const,

      hr: {
        height: 1,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        margin: "16px 0",
      } as const,

      dossier: {
        marginTop: 14,
        border: `1px solid ${border}`,
        background: panel2,
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 18px 55px rgba(0,0,0,0.45)",
      } as const,

      dossierTop: {
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      } as const,

      dossierTitle: {
        margin: 0,
        fontFamily: sans,
        fontSize: 13,
        color: "rgba(255,255,255,0.82)",
        letterSpacing: "1.8px",
        textTransform: "uppercase",
      } as const,

      toggleBtn: {
        appearance: "none",
        border: `1px solid ${border}`,
        background: "rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.88)",
        padding: "10px 12px",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      } as const,

      panicBtn: {
        appearance: "none",
        border: "1px solid rgba(210,180,140,0.25)",
        background: "rgba(210,180,140,0.10)",
        color: "rgba(210,180,140,0.95)",
        padding: "10px 12px",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: sans,
        fontSize: 13,
        lineHeight: 1,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      } as const,

      privateLabel: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid rgba(177,29,42,0.45)`,
        background: "rgba(177,29,42,0.14)",
        color: "rgba(255,255,255,0.92)",
        fontFamily: sans,
        fontSize: 12,
        marginTop: 10,
      } as const,

      privateBox: {
        marginTop: 10,
        padding: 16,
        borderRadius: 16,
        border: `1px solid rgba(210,180,140,0.30)`,
        background:
          "linear-gradient(180deg, rgba(210,180,140,0.16), rgba(0,0,0,0.18))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        fontFamily: sans,
        color: "rgba(255,255,255,0.94)",
        fontSize: 14,
        position: "relative", // ✅ for panic overlay
        overflow: "hidden",
      } as const,

      // ✅ Redaction/Decoy
      redactedWrap: {
        display: "grid",
        gap: 10,
        paddingTop: 2,
        paddingBottom: 2,
      } as const,

      redactedLine: {
        height: 14,
        borderRadius: 999,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      } as const,

      // ✅ Stronger panic overlay (near-opaque; hides EVERYTHING)
      panicOverlayStrong: {
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(7,8,10,0.96), rgba(0,0,0,0.98))",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        zIndex: 3,
        cursor: "pointer",
      } as const,

      panicOverlayInner: {
        textAlign: "center",
        maxWidth: 520,
      } as const,

      panicTitle: {
        margin: 0,
        fontFamily: sans,
        fontWeight: 900,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.92)",
        fontSize: 13,
      } as const,

      panicSub: {
        margin: "10px 0 0",
        fontFamily: sans,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1.5,
        fontSize: 13,
      } as const,

      narrationHeader: {
        marginTop: 14,
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      } as const,

      narrationTitle: {
        margin: 0,
        fontFamily: sans,
        fontSize: 13,
        color: "rgba(255,255,255,0.82)",
        letterSpacing: "1.8px",
        textTransform: "uppercase",
      } as const,

      narrationSmall: {
        fontFamily: sans,
        fontSize: 12,
        color: "rgba(255,255,255,0.62)",
      } as const,

      narrationBox: {
        marginTop: 10,
        padding: 14,
        borderRadius: 16,
        border: `1px solid rgba(255,255,255,0.10)`,
        background: "rgba(255,255,255,0.04)",
        fontFamily: sans,
        color: "rgba(255,255,255,0.86)",
        fontSize: 14,
      } as const,

      pre: {
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: 1.55,
      } as const,

      footerHint: {
        marginTop: 14,
        color: dim,
        fontSize: 12,
        fontFamily: sans,
        lineHeight: 1.5,
      } as const,

      errorBox: {
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

      hintLine: {
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
        fontFamily: sans,
        color: "rgba(255,255,255,0.72)",
        lineHeight: 1.5,
        fontSize: 13,
      } as const,
    };
  }, []);

  async function load() {
    if (!code) return;

    // 1) Load player by code
    const { data: p, error: pErr } = await supabase
      .from("players")
      .select("id,name,code,game_id")
      .eq("code", code)
      .single();

    if (pErr || !p) {
      setPlayer(null);
      setGame(null);
      setContent(null);
      setLoading(false);
      return;
    }
    setPlayer(p);

    // 2) Load game
    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("id,current_round,story_generated")
      .eq("id", p.game_id)
      .single();

    if (gErr || !g) {
      setGame(null);
      setContent(null);
      setLoading(false);
      return;
    }

    // ✅ Detect round changes (reset narration + panic)
    const nextRound = g.current_round ?? 0;
    if (lastRoundRef.current === null) lastRoundRef.current = nextRound;
    if (lastRoundRef.current !== nextRound) {
      lastRoundRef.current = nextRound;
      setShowNarration(false); // hide by default each round
      setPanicHidden(false); // never carry panic into next round
    }

    setGame(g);

    // 3) Stop if story not generated
    if (!g.story_generated) {
      setContent(null);
      setLoading(false);
      return;
    }

    // 4) Pre-game
    if (nextRound === 0) {
      setContent(null);
      setLoading(false);
      return;
    }

    // 5) Load narration
    const { data: rr, error: rrErr } = await supabase
      .from("rounds")
      .select("narration_text")
      .eq("game_id", g.id)
      .eq("round_number", nextRound)
      .single<RoundRow>();

    // 6) Load private prompt
    const { data: pr, error: prErr } = await supabase
      .from("player_round_content")
      .select("private_text")
      .eq("game_id", g.id)
      .eq("player_id", p.id)
      .eq("round_number", nextRound)
      .single<PlayerRoundRow>();

    if (rrErr || prErr || !rr || !pr) {
      setContent(null);
      setLoading(false);
      return;
    }

    setContent({
      narration_text: rr.narration_text ?? null,
      private_text: pr.private_text ?? null,
    });

    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ✅ Keyboard shortcut for panic (P)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "p") {
        setPanicHidden((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---------- UI states ----------

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.vignette} />
        <div style={styles.wrap}>
          <div style={styles.topCard}>
            <div style={styles.headerRow}>
              <div style={styles.brand}>
                <h1 style={styles.deadAir}>DEAD AIR</h1>
                <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
                <h2 style={styles.title}>Opening your file…</h2>
                <p style={{ ...styles.sub, ...styles.subSpaced }}>
                  Pulling your briefing from the archives.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={{ ...styles.pill, ...styles.goldHint }}>
                  Fetching signal
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main style={styles.page}>
        <div style={styles.vignette} />
        <div style={styles.wrap}>
          <div style={styles.topCard}>
            <div style={styles.headerRow}>
              <div style={styles.brand}>
                <h1 style={styles.deadAir}>DEAD AIR</h1>
                <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
                <h2 style={styles.title}>Signal lost</h2>
                <p style={{ ...styles.sub, ...styles.subSpaced }}>
                  That player code doesn’t exist. Double-check the link.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{code || "(missing)"}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <div style={styles.errorBox}>
              If you were sent a screenshot of a link… yes, that can be a
              problem. Ask the host for the actual URL.
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Waiting for story generation (“case not ready”)
  if (!game?.story_generated) {
    return (
      <main style={styles.page}>
        <div style={styles.vignette} />
        <div style={styles.wrap}>
          <div style={styles.topCard}>
            <div style={styles.headerRow}>
              <div style={styles.brand}>
                <h1 style={styles.deadAir}>DEAD AIR</h1>
                <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
                <h2 style={styles.title}>Case not ready</h2>
                <p style={{ ...styles.sub, ...styles.subSpaced }}>
                  Hello, <b>{player.name}</b>. The case hasn’t been released.
                  <br />
                  Your private prompts will appear automatically once the host
                  begins.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={styles.pill}>
                  <span style={styles.dot} />
                  Status: Waiting
                </span>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{player.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <p style={styles.sub}>
              Keep this page open. No refresh needed.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const currentRound = game.current_round ?? 0;

  // Pre-game
  if (currentRound === 0) {
    return (
      <main style={styles.page}>
        <div style={styles.vignette} />
        <div style={styles.wrap}>
          <div style={styles.topCard}>
            <div style={styles.headerRow}>
              <div style={styles.brand}>
                <h1 style={styles.deadAir}>DEAD AIR</h1>
                <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
                <h2 style={styles.title}>Pre-game</h2>
                <p style={{ ...styles.sub, ...styles.subSpaced }}>
                  Hello, <b>{player.name}</b>. The case hasn’t started yet.
                  <br />
                  When Round 1 begins, your private instructions will appear
                  here.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={styles.pill}>
                  <span style={styles.dot} />
                  Status: Waiting
                </span>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{player.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <p style={styles.sub}>
              Pro tip: don’t close this tab. The host controls pacing — you’ll
              update quietly when rounds advance.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Content missing
  if (!content || !content.private_text) {
    return (
      <main style={styles.page}>
        <div style={styles.vignette} />
        <div style={styles.wrap}>
          <div style={styles.topCard}>
            <div style={styles.headerRow}>
              <div style={styles.brand}>
                <h1 style={styles.deadAir}>DEAD AIR</h1>
                <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
                <h2 style={styles.title}>Round {currentRound}</h2>
                <p style={{ ...styles.sub, ...styles.subSpaced }}>
                  Hello, <b>{player.name}</b>. Your briefing hasn’t been
                  released yet.
                  <br />
                  Hold position. It will appear automatically.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={{ ...styles.pill, ...styles.goldHint }}>
                  Awaiting briefing
                </span>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{player.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <p style={styles.sub}>No refresh needed. You’re not missing anything. Yet.</p>
          </div>
        </div>
      </main>
    );
  }

  // Normal game view
  return (
    <main style={styles.page}>
      <div style={styles.vignette} />
      <div style={styles.wrap}>
        <div style={styles.topCard}>
          <div style={styles.headerRow}>
            <div style={styles.brand}>
              <h1 style={styles.deadAir}>DEAD AIR</h1>
              <p style={styles.tagline}>THE NARRATION IS LIVE.</p>
              <h2 style={styles.title}>Round {currentRound}</h2>
              <p style={{ ...styles.sub, ...styles.subSpaced }}>
                Agent <b>{player.name}</b>, your instructions are in.
              </p>
            </div>

            <div style={styles.pills}>
              <span style={{ ...styles.pill, ...styles.onAir }}>
                <span style={styles.dot} />
                ON AIR
              </span>

              <button
                type="button"
                style={styles.panicBtn}
                onClick={() => setPanicHidden(true)}
                aria-label="Panic hide"
                title="Panic hide (shortcut: P)"
              >
                Panic hide
              </button>

              <button
                type="button"
                style={styles.toggleBtn}
                onClick={() => setShowNarration((v) => !v)}
                aria-label={showNarration ? "Hide narration text" : "Show narration text"}
                title={showNarration ? "Hide narration text" : "Show narration text"}
              >
                {showNarration ? "Hide narration" : "Show narration"}
              </button>

              <span style={styles.pill}>
                Code: <span style={styles.mono}>{player.code}</span>
              </span>
            </div>
          </div>

          <div style={styles.dossier}>
            <div style={styles.dossierTop}>
              <p style={styles.dossierTitle}>Your briefing</p>
              <span style={styles.privateLabel}>PRIVATE — do not share</span>
            </div>

            <div style={styles.privateBox}>
              {panicHidden ? (
                <>
                  {/* ✅ Decoy: redacted lines */}
                  <div style={styles.redactedWrap} aria-hidden>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.redactedLine,
                          width: `${86 - (i % 5) * 10}%`,
                          opacity: 0.52 + (i % 3) * 0.12,
                        }}
                      />
                    ))}
                  </div>

                  {/* ✅ Strong overlay: real text is NOT rendered at all */}
                  <div
                    style={styles.panicOverlayStrong}
                    role="button"
                    onClick={() => setPanicHidden(false)}
                    aria-label="Reveal briefing"
                    title="Tap to reveal (shortcut: P)"
                  >
                    <div style={styles.panicOverlayInner}>
                      <p style={styles.panicTitle}>Briefing concealed</p>
                      <p style={styles.panicSub}>
                        Tap to reveal.
                        <br />
                        (Shortcut: press <b>P</b>.)
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <pre style={styles.pre}>{content.private_text}</pre>
              )}
            </div>

            {/* ✅ Better timing guidance: act when narration finishes (host audio) */}
            <div style={styles.hintLine}>
              Don’t act immediately. Wait until the host finishes narration — then execute your instructions.
            </div>

            {showNarration ? (
              <>
                <div style={styles.hr} />
                <div style={styles.narrationHeader}>
                  <p style={styles.narrationTitle}>Narration (text)</p>
                  <span style={styles.narrationSmall}>
                    Reference only — host audio controls timing
                  </span>
                </div>
                <div style={styles.narrationBox}>
                  <pre style={styles.pre}>
                    {content.narration_text ?? "(Narration not loaded yet)"}
                  </pre>
                </div>
              </>
            ) : null}

            <p style={styles.footerHint}>
              Keep this open. The host controls pacing — your screen updates quietly when rounds advance.
              <br />
              And yes, it’s supposed to feel a little dramatic.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
