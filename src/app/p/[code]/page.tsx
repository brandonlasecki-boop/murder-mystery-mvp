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

function safeHash(s: string) {
  // lightweight non-crypto hash for change detection
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export default function PlayerPage() {
  const params = useParams();
  const code = (params.code as string) || "";

  const [loading, setLoading] = useState(true); // true only on initial load
  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [content, setContent] = useState<RoundContent | null>(null);

  // ✅ narration hidden by default
  const [showNarration, setShowNarration] = useState(false);

  // ✅ “NEW briefing” pulse when round/content changes
  const [newBriefing, setNewBriefing] = useState(false);

  // ✅ panic hide (quick conceal on screen)
  const [panicHidden, setPanicHidden] = useState(false);

  // status helper (client-side)
  const [lastCheckedTs, setLastCheckedTs] = useState<number | null>(null);

  // refs to avoid expensive polling behavior + detect changes
  const playerIdRef = useRef<string>("");
  const gameIdRef = useRef<string>("");
  const lastRoundRef = useRef<number>(-1);
  const lastPrivateHashRef = useRef<string>("");
  const initialLoadedRef = useRef(false);
  const newBriefingTimerRef = useRef<number | null>(null);

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
        border: `1px solid rgba(177,29,42,0.40)`,
        background: "rgba(177,29,42,0.14)",
        color: "rgba(255,255,255,0.92)",
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
        position: "relative",
        overflow: "hidden",
      } as const,

      // overlay when panicHidden = true
      panicOverlay: {
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(7,8,10,0.78), rgba(0,0,0,0.84))",
        borderRadius: 16,
        border: `1px solid rgba(255,255,255,0.10)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      } as const,

      panicOverlayInner: {
        width: "100%",
        borderRadius: 14,
        border: `1px solid rgba(210,180,140,0.22)`,
        background: "rgba(0,0,0,0.25)",
        padding: 14,
        boxShadow: "0 18px 55px rgba(0,0,0,0.55)",
        textAlign: "center",
        fontFamily: sans,
      } as const,

      panicTitle: {
        margin: 0,
        fontWeight: 900,
        letterSpacing: "0.2px",
        color: "rgba(255,255,255,0.94)",
        fontSize: 14,
      } as const,

      panicSub: {
        margin: "8px 0 0",
        color: "rgba(255,255,255,0.72)",
        fontSize: 13,
        lineHeight: 1.5,
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
        lineHeight: 1.6,
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

      // NEW badge
      newPill: {
        border: `1px solid rgba(212,175,55,0.35)`,
        background: "rgba(212,175,55,0.14)",
        color: "rgba(255,255,255,0.92)",
      } as const,

      // small “last checked”
      lastChecked: {
        marginTop: 10,
        color: "rgba(255,255,255,0.62)",
        fontSize: 12,
        fontFamily: sans,
        lineHeight: 1.4,
      } as const,

      // sticky panic (mobile-friendly)
      stickyBar: {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "12px 16px",
        background:
          "linear-gradient(180deg, rgba(7,8,10,0.0), rgba(7,8,10,0.82) 35%, rgba(7,8,10,0.92))",
        pointerEvents: "none",
        zIndex: 50,
      } as const,

      stickyInner: {
        maxWidth: 940,
        margin: "0 auto",
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        pointerEvents: "auto",
      } as const,
    };
  }, []);

  function getShowNarrationKey() {
    return `mm:player:${code}:showNarration`;
  }

  function clearNewBriefingTimer() {
    if (newBriefingTimerRef.current) {
      window.clearTimeout(newBriefingTimerRef.current);
      newBriefingTimerRef.current = null;
    }
  }

  function triggerNewBriefing() {
    setNewBriefing(true);
    clearNewBriefingTimer();
    newBriefingTimerRef.current = window.setTimeout(() => {
      setNewBriefing(false);
      newBriefingTimerRef.current = null;
    }, 1800);
  }

  async function loadPlayerAndGameOnce() {
    if (!code) return;

    // 1) player by code
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
    playerIdRef.current = p.id;
    gameIdRef.current = p.game_id;

    // 2) game
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
    setLoading(false);
  }

  async function refreshGameStatusOnly() {
    const gid = gameIdRef.current;
    if (!gid) return null;

    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("id,current_round,story_generated")
      .eq("id", gid)
      .single();

    if (gErr || !g) return null;

    setGame(g);
    return g as Game;
  }

  async function loadRoundContent(gameRow: Game) {
    const pid = playerIdRef.current;
    if (!pid) return;

    if (!gameRow.story_generated) {
      setContent(null);
      return;
    }

    const currentRound = gameRow.current_round ?? 0;
    if (currentRound === 0) {
      setContent(null);
      return;
    }

    // narration
    const { data: rr, error: rrErr } = await supabase
      .from("rounds")
      .select("narration_text")
      .eq("game_id", gameRow.id)
      .eq("round_number", currentRound)
      .single<RoundRow>();

    // private prompt
    const { data: pr, error: prErr } = await supabase
      .from("player_round_content")
      .select("private_text")
      .eq("game_id", gameRow.id)
      .eq("player_id", pid)
      .eq("round_number", currentRound)
      .single<PlayerRoundRow>();

    if (rrErr || prErr || !rr || !pr) {
      setContent(null);
      return;
    }

    const narration_text = rr.narration_text ?? null;
    const private_text = pr.private_text ?? null;

    // detect private prompt changes (for NEW badge)
    const newHash = safeHash(`${currentRound}::${private_text ?? ""}`);
    const prevHash = lastPrivateHashRef.current;

    setContent({ narration_text, private_text });

    if (prevHash && prevHash !== newHash) {
      triggerNewBriefing();
      // if panic is ON, keep it ON (don’t reveal automatically)
    }

    lastPrivateHashRef.current = newHash;
  }

  // initial: restore narration preference, load player/game
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(getShowNarrationKey());
      if (v === "1") setShowNarration(true);
      else setShowNarration(false);
    } catch {
      setShowNarration(false);
    }

    setPanicHidden(false);
    setNewBriefing(false);
    lastRoundRef.current = -1;
    lastPrivateHashRef.current = "";
    initialLoadedRef.current = false;
    playerIdRef.current = "";
    gameIdRef.current = "";

    (async () => {
      setLoading(true);
      await loadPlayerAndGameOnce();
      initialLoadedRef.current = true;
    })();

    return () => {
      clearNewBriefingTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // persist narration preference
  useEffect(() => {
    try {
      window.localStorage.setItem(getShowNarrationKey(), showNarration ? "1" : "0");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNarration]);

  // polling: cheap mode (game only), then content only when needed
  useEffect(() => {
    if (!code) return;

    let stopped = false;

    async function tick() {
      if (stopped) return;

      // don’t spam in background tabs
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      // must have loaded player/game once
      if (!initialLoadedRef.current || !playerIdRef.current || !gameIdRef.current) return;

      const g = await refreshGameStatusOnly();
      setLastCheckedTs(Date.now());

      if (!g) return;

      const currentRound = g.current_round ?? 0;
      const prevRound = lastRoundRef.current;

      // first time or round changed
      if (prevRound === -1 || currentRound !== prevRound) {
        if (prevRound !== -1) {
          triggerNewBriefing(); // round advanced (or changed)
          // keep narration hidden by default on any round change
          setShowNarration(false);
        }
        lastRoundRef.current = currentRound;
        await loadRoundContent(g);
        return;
      }

      // same round:
      // If we have no content yet but game is playable, try loading.
      // If content exists, do nothing (keeps reads low).
      const hasPrivate = !!content?.private_text;
      if (g.story_generated && currentRound > 0 && !hasPrivate) {
        await loadRoundContent(g);
      }
    }

    // run once immediately after initial load
    const kickoff = window.setTimeout(() => {
      tick().catch(() => {});
    }, 0);

    const interval = window.setInterval(() => {
      tick().catch(() => {});
    }, 2500);

    return () => {
      stopped = true;
      window.clearTimeout(kickoff);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, content?.private_text]);

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
                <span style={{ ...styles.pill, ...styles.goldHint }}>Fetching signal</span>
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
              If you were sent a screenshot of a link… yes, that can be a problem. Ask the host for the actual URL.
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Waiting for story generation (case not ready)
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
                  Hello, <b>{player.name}</b>. The host is preparing the case.
                  <br />
                  Your private briefing will appear automatically when it goes live.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={{ ...styles.pill, ...styles.goldHint }}>Status: Stand by</span>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{player.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <p style={styles.sub}>Keep this page open. No refresh needed.</p>

            {lastCheckedTs ? (
              <div style={styles.lastChecked}>
                Last checked:{" "}
                <span style={styles.mono}>
                  {new Date(lastCheckedTs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ) : null}
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
                  When Round 1 begins, your private briefing will appear here.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={{ ...styles.pill, ...styles.goldHint }}>Status: Waiting</span>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{player.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <p style={styles.sub}>Pro tip: don’t close this tab. You’ll update quietly when it’s time.</p>

            {lastCheckedTs ? (
              <div style={styles.lastChecked}>
                Last checked:{" "}
                <span style={styles.mono}>
                  {new Date(lastCheckedTs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  // Content missing (round started, but private prompt not released)
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
                  Hello, <b>{player.name}</b>. Your private briefing hasn’t been released yet.
                  <br />
                  Hold position. It will appear automatically.
                </p>
              </div>

              <div style={styles.pills}>
                <span style={{ ...styles.pill, ...styles.goldHint }}>Awaiting briefing</span>
                <span style={styles.pill}>
                  Code: <span style={styles.mono}>{player.code}</span>
                </span>
              </div>
            </div>

            <div style={styles.hr} />
            <p style={styles.sub}>No refresh needed. You’re not missing anything. Yet.</p>

            {lastCheckedTs ? (
              <div style={styles.lastChecked}>
                Last checked:{" "}
                <span style={styles.mono}>
                  {new Date(lastCheckedTs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ) : null}
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

              {newBriefing ? (
                <span style={{ ...styles.pill, ...styles.newPill }}>NEW BRIEFING</span>
              ) : null}

              <button
                type="button"
                style={styles.panicBtn}
                onClick={() => setPanicHidden((v) => !v)}
                aria-label={panicHidden ? "Reveal briefing" : "Panic hide briefing"}
                title={panicHidden ? "Reveal briefing" : "Panic hide (conceal on screen)"}
              >
                {panicHidden ? "Reveal" : "Panic hide"}
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
              <pre style={styles.pre}>{content.private_text}</pre>

              {panicHidden ? (
                <div style={styles.panicOverlay} role="button" onClick={() => setPanicHidden(false)} aria-label="Reveal briefing">
                  <div style={styles.panicOverlayInner}>
                    <p style={styles.panicTitle}>Briefing concealed</p>
                    <p style={styles.panicSub}>
                      Tap to reveal.
                      <br />
                      (If someone is behind you — you did the right thing.)
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {showNarration ? (
              <>
                <div style={styles.hr} />
                <div style={styles.narrationHeader}>
                  <p style={styles.narrationTitle}>Narration (text)</p>
                  <span style={styles.narrationSmall}>Starts action when it finishes</span>
                </div>
                <div style={styles.narrationBox}>
                  <pre style={styles.pre}>
                    {content.narration_text ?? "(Narration not loaded yet)"}
                  </pre>
                </div>
              </>
            ) : null}

            {lastCheckedTs ? (
              <div style={styles.lastChecked}>
                Last checked:{" "}
                <span style={styles.mono}>
                  {new Date(lastCheckedTs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ) : null}

            <p style={styles.footerHint}>
              Keep this open. The host controls pacing — your screen updates quietly when rounds advance.
              <br />
              When narration ends, that’s your cue.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky panic button (helps on mobile when scrolling) */}
      <div style={styles.stickyBar} aria-hidden={false}>
        <div style={styles.stickyInner}>
          <button
            type="button"
            style={styles.panicBtn}
            onClick={() => setPanicHidden((v) => !v)}
            aria-label={panicHidden ? "Reveal briefing" : "Panic hide briefing"}
            title={panicHidden ? "Reveal briefing" : "Panic hide (conceal on screen)"}
          >
            {panicHidden ? "Reveal" : "Panic hide"}
          </button>
        </div>
      </div>
    </main>
  );
}
