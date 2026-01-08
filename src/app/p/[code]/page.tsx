"use client";

import { useEffect, useMemo, useState } from "react";
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

  const [loading, setLoading] = useState(true); // only true for initial load
  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [content, setContent] = useState<RoundContent | null>(null);

  const [showNarration, setShowNarration] = useState(true);

  const styles = useMemo(() => {
    const bg = "#0b0d12";
    const panel = "rgba(255,255,255,0.06)";
    const panelBorder = "rgba(255,255,255,0.10)";
    const text = "rgba(255,255,255,0.92)";
    const muted = "rgba(255,255,255,0.70)";
    const dim = "rgba(255,255,255,0.55)";
    const accent = "#b11d2a"; // blood red
    const accent2 = "#d2b48c"; // parchment tan
    const ink = "rgba(15,10,6,0.92)";

    return {
      page: {
        minHeight: "100vh",
        color: text,
        background: `
          radial-gradient(800px 400px at 20% 10%, rgba(177,29,42,0.14), transparent 60%),
          radial-gradient(900px 500px at 80% 0%, rgba(210,180,140,0.10), transparent 60%),
          radial-gradient(900px 500px at 50% 100%, rgba(255,255,255,0.06), transparent 55%),
          ${bg}
        `,
        padding: "28px 16px 60px",
        fontFamily:
          'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      } as const,
      wrap: {
        maxWidth: 820,
        margin: "0 auto",
      } as const,
      topBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 18,
      } as const,
      brand: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
      } as const,
      titleRow: {
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        flexWrap: "wrap",
      } as const,
      h1: {
        fontSize: 26,
        letterSpacing: "0.3px",
        margin: 0,
        lineHeight: 1.1,
      } as const,
      badge: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${panelBorder}`,
        background: panel,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 12,
        color: muted,
      } as const,
      dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: accent,
        boxShadow: `0 0 18px rgba(177,29,42,0.5)`,
      } as const,
      subtitle: {
        margin: 0,
        color: muted,
        fontSize: 14,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      } as const,
      card: {
        background: panel,
        border: `1px solid ${panelBorder}`,
        borderRadius: 16,
        padding: 18,
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
      } as const,
      cardHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      } as const,
      cardTitle: {
        margin: 0,
        fontSize: 16,
        letterSpacing: "0.2px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      } as const,
      small: {
        color: dim,
        fontSize: 12,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      } as const,
      split: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 14,
        marginTop: 14,
      } as const,
      pillBtn: {
        appearance: "none",
        border: `1px solid ${panelBorder}`,
        background: "rgba(255,255,255,0.04)",
        color: muted,
        padding: "8px 10px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      } as const,
      pre: {
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        lineHeight: 1.5,
      } as const,
      narrationBox: {
        padding: 14,
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.10)`,
        background: "rgba(255,255,255,0.03)",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        color: "rgba(255,255,255,0.86)",
        fontSize: 14,
      } as const,
      privateBox: {
        padding: 16,
        borderRadius: 14,
        border: `1px solid rgba(210,180,140,0.35)`,
        background: `linear-gradient(180deg, rgba(210,180,140,0.18), rgba(255,255,255,0.04))`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        color: "rgba(255,255,255,0.92)",
        fontSize: 14,
      } as const,
      privateLabel: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid rgba(177,29,42,0.35)`,
        background: "rgba(177,29,42,0.12)",
        color: "rgba(255,255,255,0.90)",
        fontSize: 12,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        marginBottom: 10,
      } as const,
      footerHint: {
        marginTop: 14,
        color: dim,
        fontSize: 12,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      } as const,
      subtleRule: {
        height: 1,
        background:
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
        margin: "14px 0",
      } as const,
      mono: {
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      } as const,
      // Small “case file” tag
      caseTag: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 12,
        border: `1px solid ${panelBorder}`,
        background: "rgba(0,0,0,0.18)",
        color: muted,
        fontSize: 12,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      } as const,
      tagAccent: {
        width: 10,
        height: 10,
        borderRadius: 2,
        background: accent2,
        boxShadow: "0 0 0 2px rgba(0,0,0,0.25)",
      } as const,
      // Responsive tweak
      gridTwo: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 14,
      } as const,
      // We’ll switch to two columns on wider screens via inline @media alternative (simple approach: just keep single column for MVP)
      dimText: {
        color: dim,
      } as const,
      strong: {
        color: text,
        fontWeight: 700,
      } as const,
    };
  }, []);

  async function load() {
    if (!code) return;

    // Don’t re-show loading spinner on polling refreshes.
    // Keep UX calm and silent.
    // Only the first call starts with loading=true.
    setLoading((prev) => prev);

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
    setGame(g);

    // 3) Stop if story not generated
    if (!g.story_generated) {
      setContent(null);
      setLoading(false);
      return;
    }

    // 4) Pre-game
    const currentRound = g.current_round ?? 0;
    if (currentRound === 0) {
      setContent(null);
      setLoading(false);
      return;
    }

    // 5) Load narration from rounds table
    const { data: rr, error: rrErr } = await supabase
      .from("rounds")
      .select("narration_text")
      .eq("game_id", g.id)
      .eq("round_number", currentRound)
      .single<RoundRow>();

    // 6) Load private prompt from player_round_content table
    const { data: pr, error: prErr } = await supabase
      .from("player_round_content")
      .select("private_text")
      .eq("game_id", g.id)
      .eq("player_id", p.id)
      .eq("round_number", currentRound)
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

  // ---------- UI states ----------

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={{ ...styles.cardTitle, margin: 0 }}>Opening the case…</h2>
              <span style={styles.caseTag}>
                <span style={styles.tagAccent} />
                Loading
              </span>
            </div>
            <p style={{ margin: 0, color: styles.dimText.color as any }}>
              Pulling your file from the archives.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={{ ...styles.cardTitle, margin: 0 }}>Player not found</h2>
              <span style={styles.caseTag}>
                <span style={styles.tagAccent} />
                Invalid code
              </span>
            </div>
            <p style={{ marginTop: 8, marginBottom: 0, color: styles.dimText.color as any }}>
              That player code doesn’t exist. Double-check the link you were given.
            </p>
            <div style={styles.subtleRule} />
            <p style={{ margin: 0, ...styles.small }}>
              Code: <span style={styles.mono}>{code || "(missing)"}</span>
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Waiting for story generation
  if (!game?.story_generated) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.topBar}>
            <div style={styles.brand}>
              <div style={styles.titleRow}>
                <h1 style={styles.h1}>Case File</h1>
                <span style={styles.badge}>
                  <span style={styles.dot} />
                  Waiting
                </span>
              </div>
              <p style={styles.subtitle}>
                Hi <span style={styles.strong}>{player.name}</span>. The host is finalizing the story.
              </p>
            </div>
            <span style={styles.caseTag}>
              <span style={styles.tagAccent} />
              Player
            </span>
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.cardTitle, marginTop: 0 }}>Stand by…</h2>
            <p style={{ marginTop: 8, marginBottom: 0, color: styles.dimText.color as any }}>
              Your instructions will appear automatically when the host releases the case.
            </p>
            <p style={styles.footerHint}>Keep this page open. It updates quietly.</p>
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
        <div style={styles.wrap}>
          <div style={styles.topBar}>
            <div style={styles.brand}>
              <div style={styles.titleRow}>
                <h1 style={styles.h1}>Case File</h1>
                <span style={styles.badge}>
                  <span style={styles.dot} />
                  Pre-game
                </span>
              </div>
              <p style={styles.subtitle}>
                Hi <span style={styles.strong}>{player.name}</span>. The game hasn’t started yet.
              </p>
            </div>
            <span style={styles.caseTag}>
              <span style={styles.tagAccent} />
              Code: <span style={styles.mono}>{player.code}</span>
            </span>
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.cardTitle, marginTop: 0 }}>Get ready</h2>
            <p style={{ marginTop: 8, marginBottom: 0, color: styles.dimText.color as any }}>
              The host will unlock Round 1 shortly. When it happens, your instructions will appear here.
            </p>
            <p style={styles.footerHint}>Tip: turn up your volume — narration is audio-first.</p>
          </div>
        </div>
      </main>
    );
  }

  // Content missing (or private text missing)
  if (!content || !content.private_text) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.topBar}>
            <div style={styles.brand}>
              <div style={styles.titleRow}>
                <h1 style={styles.h1}>Round {currentRound}</h1>
                <span style={styles.badge}>
                  <span style={styles.dot} />
                  Awaiting briefing
                </span>
              </div>
              <p style={styles.subtitle}>
                Hi <span style={styles.strong}>{player.name}</span>. Your round instructions haven’t been released yet.
              </p>
            </div>
            <span style={styles.caseTag}>
              <span style={styles.tagAccent} />
              Code: <span style={styles.mono}>{player.code}</span>
            </span>
          </div>

          <div style={styles.card}>
            <h2 style={{ ...styles.cardTitle, marginTop: 0 }}>Hold.</h2>
            <p style={{ marginTop: 8, marginBottom: 0, color: styles.dimText.color as any }}>
              Your briefing will appear automatically once it’s ready.
            </p>
            <p style={styles.footerHint}>No refresh needed.</p>
          </div>
        </div>
      </main>
    );
  }

  // Normal game view
  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.topBar}>
          <div style={styles.brand}>
            <div style={styles.titleRow}>
              <h1 style={styles.h1}>Round {currentRound}</h1>
              <span style={styles.badge}>
                <span style={styles.dot} />
                Live
              </span>
            </div>
            <p style={styles.subtitle}>
              Agent <span style={styles.strong}>{player.name}</span>, your instructions are in.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              style={styles.pillBtn}
              onClick={() => setShowNarration((v) => !v)}
              aria-label={showNarration ? "Hide narration text" : "Show narration text"}
              title={showNarration ? "Hide narration text" : "Show narration text"}
            >
              {showNarration ? "Hide Narration" : "Show Narration"}
            </button>

            <span style={styles.caseTag}>
              <span style={styles.tagAccent} />
              Code: <span style={styles.mono}>{player.code}</span>
            </span>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={{ ...styles.cardTitle, margin: 0 }}>Your briefing</h2>
            <span style={styles.privateLabel}>PRIVATE — do not share</span>
          </div>

          <div style={styles.privateBox}>
            <pre style={styles.pre}>{content.private_text}</pre>
          </div>

          {showNarration && (
            <>
              <div style={styles.subtleRule} />
              <div style={styles.cardHeader}>
                <h3 style={{ ...styles.cardTitle, margin: 0 }}>Narration (text)</h3>
                <span style={styles.small}>Audio plays on the host screen</span>
              </div>
              <div style={styles.narrationBox}>
                <pre style={styles.pre}>
                  {content.narration_text ?? "(Narration not loaded yet)"}
                </pre>
              </div>
            </>
          )}

          <p style={styles.footerHint}>
            Keep this open. The host controls pacing — your screen updates quietly when rounds advance.
          </p>
        </div>
      </div>
    </main>
  );
}
