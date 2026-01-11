"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const WELCOME_AUDIO_URL = "/audio/host-briefing.mp3";

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
  invite_email?: string | null;
  invite_phone?: string | null;
  intake_mode?: string | null;
};

type Round = {
  round_number: number;
  title: string | null;
  narration_text: string | null;
  narration_audio_url?: string | null;
  narration_audio_url_part_b?: string | null;
};

function fmtTime(sec: number) {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Cinematic, theme-matching audio controls (B)
 * - Play/Pause
 * - Restart
 * - -10s / +10s
 * - Progress bar (click-to-seek)
 * - Timecode
 * - Optional "Dim room" overlay while playing
 */
function AudioConsole(props: {
  title: string;
  subtitle?: string;
  src?: string | null;
  hintRight?: string;
  compact?: boolean;
  dimEnabled: boolean;
  onToggleDim: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const { title, subtitle, src, hintRight, compact, dimEnabled, onToggleDim, onPlayingChange } = props;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setTime({ current: 0, duration: 0 });
    setReady(false);

    const el = audioRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      // ignore
    }
  }, [src]);

  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  function syncFromEl(el: HTMLAudioElement) {
    const d = el.duration || 0;
    const c = el.currentTime || 0;
    setTime({ current: c, duration: d });
    setProgress(d > 0 ? c / d : 0);
  }

  async function toggle() {
    const el = audioRef.current;
    if (!el || !src) return;
    try {
      if (el.paused) await el.play();
      else el.pause();
    } catch {
      // ignore
    }
  }

  async function restart() {
    const el = audioRef.current;
    if (!el || !src) return;
    try {
      el.currentTime = 0;
      await el.play();
    } catch {
      // ignore
    }
  }

  function jump(delta: number) {
    const el = audioRef.current;
    if (!el || !src) return;
    const d = el.duration || 0;
    const next = Math.max(0, Math.min(d || Number.MAX_SAFE_INTEGER, (el.currentTime || 0) + delta));
    el.currentTime = next;
    syncFromEl(el);
  }

  function seekFromClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !src) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = rect.width > 0 ? x / rect.width : 0;
    const d = el.duration || 0;
    if (!d) return;

    el.currentTime = Math.max(0, Math.min(d, d * pct));
    syncFromEl(el);
  }

  const disabled = !src;

  return (
    <div className={`acWrap ${compact ? "acCompact" : ""} ${disabled ? "acDisabled" : ""}`}>
      <div className="acHeader">
        <div className="acHeaderLeft">
          <div className="acTitle">{title}</div>
          {subtitle ? <div className="acSub">{subtitle}</div> : null}
        </div>

        <div className="acHeaderRight">
          <div className={`acLive ${playing ? "acLiveOn" : ""}`}>
            <span className={`acDot ${playing ? "acDotPulse" : ""}`} />
            LIVE
          </div>

          {hintRight ? <div className="acHint">{hintRight}</div> : null}

          <button
            className={`deadair-btn deadair-btnGhost acDimBtn ${dimEnabled ? "acDimOn" : ""}`}
            onClick={onToggleDim}
            type="button"
            title={dimEnabled ? "Turn off dim mode" : "Dim the room while narration plays"}
          >
            {dimEnabled ? "Dim: On" : "Dim room"}
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          setReady(true);
          syncFromEl(e.currentTarget);
        }}
        onTimeUpdate={(e) => syncFromEl(e.currentTarget)}
        style={{ display: "none" }}
      />

      <div className="acControls">
        <button
          className="deadair-btn deadair-btnPrimary acPlayBtn"
          onClick={toggle}
          disabled={disabled}
          title={disabled ? "No audio URL stored yet" : playing ? "Pause narration" : "Play narration"}
        >
          {playing ? "Pause" : "Play"}
        </button>

        <button
          className="deadair-btn deadair-btnGhost"
          onClick={() => jump(-10)}
          disabled={disabled || !ready}
          title="Replay 10 seconds"
        >
          ↺ 10s
        </button>

        <button
          className="deadair-btn deadair-btnGhost"
          onClick={() => jump(10)}
          disabled={disabled || !ready}
          title="Skip ahead 10 seconds"
        >
          10s ↻
        </button>

        <button
          className="deadair-btn deadair-btnGhost"
          onClick={restart}
          disabled={disabled}
          title="Restart narration"
        >
          Restart
        </button>
      </div>

      <div className="acBarWrap" onClick={seekFromClick} role="button" aria-label="Seek narration">
        <div className="acBarOuter">
          <div className="acBarInner" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      <div className="acTimeRow">
        <span className="acTime">{fmtTime(time.current)}</span>
        <span className="acTime">{fmtTime(time.duration)}</span>
      </div>
    </div>
  );
}

export default function Host() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = (params.gameId as string) || "";
  const pin = searchParams.get("pin") || "";

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Host briefing audio (custom controls)
  const briefingRef = useRef<HTMLAudioElement | null>(null);
  const [briefingPlaying, setBriefingPlaying] = useState(false);
  const [briefingProgress, setBriefingProgress] = useState(0);
  const [briefingTime, setBriefingTime] = useState({ current: 0, duration: 0 });
  const [briefingListened, setBriefingListened] = useState(false);

  // Round start confirm modal
  const [confirmRound, setConfirmRound] = useState<number | null>(null);

  // Narration text toggle (hidden by default)
  const [showNarrationText, setShowNarrationText] = useState(false);

  // ✅ Dim room toggle (user-controlled) + whether any narration is playing
  const [dimRoomEnabled, setDimRoomEnabled] = useState(false);
  const [narrationPlaying, setNarrationPlaying] = useState(false);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "http://localhost:3000";
    return window.location.origin;
  }, []);

  // ✅ hooks must remain unconditional. Safe values even when game is null.
  const storyReady = !!game?.story_generated;
  const currentRound = game?.current_round ?? 0;

  const sortedPlayers = useMemo(() => {
    const copy = [...players];
    copy.sort((a, b) => {
      const ai = a.intake_complete ? 1 : 0;
      const bi = b.intake_complete ? 1 : 0;
      if (ai !== bi) return ai - bi; // pending first
      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [players]);

  const currentRoundRow = useMemo(() => {
    return rounds.find((r) => r.round_number === currentRound);
  }, [rounds, currentRound]);

  const totalPlayers = players.length;
  const intakeDone = players.filter((p) => p.intake_complete).length;
  const allIntakesComplete = totalPlayers > 0 && intakeDone === totalPlayers;

  const playerIntakeLink = (code: string) => `${origin}/intake/p/${code}`;
  const playerJoinLink = (code: string) => `${origin}/p/${code}`;

  const roundsToShow = [0, 1, 2, 3, 4];

  const stepCollectActive = !allIntakesComplete;
  const stepProcessingActive = allIntakesComplete && !storyReady;
  const stepReadyActive = storyReady;

  // Reset narration text toggle when round changes (reduces clutter)
  useEffect(() => {
    setShowNarrationText(false);
    setNarrationPlaying(false);
  }, [currentRound]);

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

  useEffect(() => {
    try {
      if (!gameId) return;
      const key = `mm:${gameId}:briefing_listened`;
      const v = window.localStorage.getItem(key);
      setBriefingListened(v === "1");
    } catch {
      // ignore
    }
  }, [gameId]);

  function markBriefingListened() {
    try {
      const key = `mm:${gameId}:briefing_listened`;
      window.localStorage.setItem(key, "1");
    } catch {}
    setBriefingListened(true);
    showToast("Briefing marked complete");
  }

  async function load() {
    if (!gameId) return;
    setLoading(true);
    setErrorMsg(null);

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
      setErrorMsg(gErr?.message ?? "Game not found.");
      return;
    }

    if (!pin || pin !== g.host_pin) {
      setGame(null);
      setPlayers([]);
      setRounds([]);
      setLoading(false);
      setErrorMsg("Wrong or missing host PIN. Use the host link that includes ?pin=...");
      return;
    }

    const { data: ps, error: pErr } = await supabase
      .from("players")
      .select("id,name,code,intake_complete,invite_email,invite_phone,intake_mode")
      .eq("game_id", gameId)
      .order("created_at");

    if (pErr) {
      setGame(null);
      setPlayers([]);
      setRounds([]);
      setLoading(false);
      setErrorMsg(pErr.message);
      return;
    }

    if ((ps?.length ?? 0) === 0) {
      setLoading(false);
      router.replace(`/setup/${gameId}?pin=${pin}`);
      return;
    }

    const { data: rs, error: rErr } = await supabase
      .from("rounds")
      .select("round_number,title,narration_text,narration_audio_url,narration_audio_url_part_b")
      .eq("game_id", gameId)
      .order("round_number");

    if (rErr) {
      setGame(null);
      setPlayers([]);
      setRounds([]);
      setLoading(false);
      setErrorMsg(rErr.message);
      return;
    }

    setGame(g as Game);
    setPlayers((ps ?? []) as Player[]);
    setRounds((rs ?? []) as Round[]);
    setLoading(false);
  }

  async function setRound(nextRound: number) {
    if (!game) return;

    if (!pin || pin !== game.host_pin) {
      alert("Wrong or missing host PIN. Use the host link that includes ?pin=...");
      return;
    }

    if (nextRound > 0 && !game.story_generated) {
      alert("Locked until your case is ready.");
      return;
    }

    const { error } = await supabase.from("games").update({ current_round: nextRound }).eq("id", gameId);
    if (error) alert(error.message);
    await load();
  }

  function requestStartRound(nextRound: number) {
    if (nextRound === 0) {
      const el = briefingRef.current;
      if (el && !el.paused) el.pause();
      setConfirmRound(null);
      setRound(0);
      return;
    }

    if (!storyReady) {
      alert("Locked until your case is ready.");
      return;
    }

    setConfirmRound(nextRound);
  }

  function openHostIntake() {
    router.push(`/intake/host/${gameId}?pin=${encodeURIComponent(pin)}`);
  }

  function roundButtonLabel(r: number) {
    if (r === 0) return "Back to Setup";
    return `Start Round ${r}`;
  }

  function roundButtonTitle(r: number) {
    if (r === 0) return "Return to setup mode";
    if (!storyReady) return "Locked until your case is ready";
    return `Start Round ${r}`;
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;

  if (!game) {
    return (
      <main className="deadair-page">
        <div className="deadair-wrap">
          <div className="deadair-card">
            <h2 className="deadair-title" style={{ fontSize: 22 }}>
              Host access blocked
            </h2>
            <p className="deadair-sub">{errorMsg ?? "Game not found or you don’t have access."}</p>
            <p className="deadair-sub">
              Make sure you’re using the host link that includes <code>?pin=...</code>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const dimActive = currentRound > 0 && dimRoomEnabled && narrationPlaying;

  return (
    <main className={`deadair-page ${dimActive ? "dimActive" : ""}`}>
      <style jsx>{`
        /* ✅ mobile-friendly base */
        :global(.deadair-wrap) {
          max-width: 1100px;
        }
        :global(.deadair-btn) {
          min-height: 44px;
        }
        :global(.deadair-btnPrimary),
        :global(.deadair-btnGhost),
        :global(.deadair-btnDisabled) {
          min-height: 44px;
        }

        /* ✅ Dim room overlay (only when enabled + narration playing) */
        .dimOverlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(
              900px 520px at 50% 10%,
              rgba(177, 29, 42, 0.18),
              transparent 60%
            ),
            rgba(0, 0, 0, 0.72);
          z-index: 15;
          pointer-events: none;
          opacity: 0;
          transition: opacity 240ms ease;
        }
        :global(.dimActive) .dimOverlay {
          opacity: 1;
        }

        /* ensure content sits above overlay */
        .contentAboveDim {
          position: relative;
          z-index: 20;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .hr {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
          margin: 14px 0;
        }
        .btnRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-top: 10px;
        }
        .sectionTitle {
          margin: 18px 0 10px;
          font-size: 16px;
          letter-spacing: 0.2px;
          font-family: var(--sans);
          color: rgba(255, 255, 255, 0.92);
        }
        .mono {
          font-family: var(--mono);
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .small {
          color: var(--dim);
          font-size: 12px;
          font-family: var(--sans);
          margin-top: 8px;
          line-height: 1.4;
        }

        /* header status rail */
        .headerStatus {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
          text-align: right;
          max-width: 520px;
        }
        .statusBadges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .statusActions {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .statusActions :global(.deadair-btn) {
          padding: 6px 10px;
          font-size: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--panel);
          color: var(--muted);
          font-size: 12px;
          font-family: var(--sans);
          white-space: nowrap;
        }

        /* briefing console (setup) */
        .briefingWrap {
          border: 1px solid rgba(210, 180, 140, 0.26);
          background: linear-gradient(180deg, rgba(210, 180, 140, 0.14), rgba(0, 0, 0, 0.14));
          border-radius: 16px;
          padding: 12px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .briefingTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .hintPill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--sans);
          font-size: 12px;
          color: rgba(210, 180, 140, 0.95);
          border: 1px solid rgba(210, 180, 140, 0.3);
          background: rgba(210, 180, 140, 0.1);
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .progressOuter {
          margin-top: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          overflow: hidden;
        }
        .progressInner {
          height: 100%;
          background: rgba(177, 29, 42, 0.78);
          width: 0%;
        }
        .timeRow {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-family: var(--sans);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        /* timeline */
        .timelineRow {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .timelinePill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(255, 255, 255, 0.82);
          font-family: var(--sans);
          font-size: 12px;
          white-space: nowrap;
        }
        .timelineActive {
          border: 1px solid rgba(212, 175, 55, 0.28);
          background: rgba(212, 175, 55, 0.12);
        }

        /* narration pre */
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.5;
          font-family: var(--sans);
          font-size: 13px;
          color: rgba(255, 255, 255, 0.88);
        }
        .preBox {
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 14px;
        }

        /* players */
        ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .playerItem {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .playerLeft {
          min-width: 280px;
          flex: 1 1 auto;
        }
        .playerNameRow {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          font-family: var(--sans);
          font-size: 14px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.18);
          color: var(--muted);
          font-family: var(--sans);
          font-size: 12px;
          max-width: 100%;
        }
        .pillPrivate {
          border: 1px solid rgba(210, 180, 140, 0.25);
          background: rgba(210, 180, 140, 0.16);
          color: rgba(255, 255, 255, 0.86);
        }

        /* accordion (Players in rounds 1-4) */
        details.acc {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          padding: 10px 12px;
        }
        summary.accSummary {
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 44px;
          font-family: var(--sans);
          color: rgba(255, 255, 255, 0.92);
          font-weight: 900;
        }
        summary.accSummary::-webkit-details-marker {
          display: none;
        }
        .accMeta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          white-space: nowrap;
        }
        .chev {
          opacity: 0.75;
          font-family: var(--mono);
        }
        .accBody {
          margin-top: 10px;
        }

        /* modal */
        .modalOverlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
        }
        .modalCard {
          width: 100%;
          max-width: 520px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(14, 16, 20, 0.92);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          color: rgba(255, 255, 255, 0.92);
          padding: 14px;
          backdrop-filter: blur(10px);
        }
        .modalTitle {
          margin: 0;
          font-family: var(--sans);
          font-size: 14px;
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }
        .modalBody {
          margin: 10px 0 0;
          font-family: var(--sans);
          color: rgba(255, 255, 255, 0.78);
          line-height: 1.45;
        }
        .modalBtnRow {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        /* toast */
        .toast {
          position: fixed;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.92);
          padding: 10px 12px;
          border-radius: 12px;
          font-family: var(--sans);
          font-size: 13px;
          max-width: 520px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
          z-index: 60;
        }

        /* ✅ Cinematic Audio Console (Rounds 1–4) */
        .acWrap {
          border-radius: 18px;
          padding: 14px;
          border: 1px solid rgba(212, 175, 55, 0.24);
          background: linear-gradient(180deg, rgba(16, 18, 22, 0.62), rgba(0, 0, 0, 0.22));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 18px 60px rgba(0, 0, 0, 0.55);
          position: relative;
          overflow: hidden;
        }
        .acWrap:before {
          content: "";
          position: absolute;
          inset: -120px -120px auto -120px;
          height: 240px;
          background: radial-gradient(520px 240px at 30% 40%, rgba(212, 175, 55, 0.16), transparent 60%);
          pointer-events: none;
          opacity: 0.9;
        }
        .acCompact {
          padding: 12px;
        }
        .acDisabled {
          opacity: 0.72;
        }

        .acHeader {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: start;
        }
        .acHeaderLeft {
          min-width: 0;
        }
        .acHeaderRight {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .acTitle {
          font-family: var(--sans);
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
          letter-spacing: 0.2px;
          font-size: 14px;
          line-height: 1.25;
        }
        .acSub {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.72);
          font-family: var(--sans);
          font-size: 12px;
          line-height: 1.35;
          max-width: 72ch;
        }
        .acHint {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.18);
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .acLive {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: rgba(212, 175, 55, 0.95);
          border: 1px solid rgba(212, 175, 55, 0.34);
          background: rgba(212, 175, 55, 0.12);
          padding: 6px 10px;
          border-radius: 999px;
          user-select: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .acDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(177, 29, 42, 0.95);
          box-shadow: 0 0 0 3px rgba(177, 29, 42, 0.14);
        }
        .acDotPulse {
          animation: acPulse 1.15s ease-in-out infinite;
        }
        @keyframes acPulse {
          0% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.35);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.85;
          }
        }

        .acDimBtn {
          white-space: nowrap;
        }
        .acDimOn {
          border-color: rgba(212, 175, 55, 0.34) !important;
          background: rgba(212, 175, 55, 0.12) !important;
        }

        .acControls {
          position: relative;
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1fr;
          gap: 10px;
          align-items: center;
        }
        .acPlayBtn {
          font-size: 14px;
          letter-spacing: 0.2px;
        }

        .acBarWrap {
          position: relative;
          margin-top: 12px;
          cursor: pointer;
          user-select: none;
        }
        .acBarOuter {
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.14);
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .acBarInner {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, rgba(177, 29, 42, 0.90), rgba(212, 175, 55, 0.40));
        }
        .acTimeRow {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--mono);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.72);
          gap: 18px;
        }
        .acTime {
          font-variant-numeric: tabular-nums;
          min-width: 54px;
        }

        /* ✅ MOBILE */
        @media (max-width: 900px) {
          .row {
            margin-bottom: 10px;
          }
          .headerStatus {
            width: 100%;
            align-items: flex-start;
            text-align: left;
            max-width: none;
            gap: 10px;
          }
          .statusBadges {
            justify-content: flex-start;
            width: 100%;
          }
          .statusActions {
            justify-content: flex-start;
            width: 100%;
            gap: 10px;
          }
          .statusActions :global(.deadair-btn) {
            width: 100%;
            padding: 10px 12px;
            font-size: 13px;
          }

          .timelineRow {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .timelinePill {
            width: 100%;
            justify-content: space-between;
          }

          .btnRow {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            align-items: stretch;
          }
          .btnRow :global(.deadair-btn) {
            width: 100%;
          }

          .briefingTop {
            align-items: flex-start;
          }
          .hintPill {
            width: 100%;
            justify-content: center;
          }

          .playerItem {
            padding: 12px 0;
            gap: 10px;
          }
          .playerLeft {
            min-width: unset;
            width: 100%;
          }
          .playerNameRow {
            align-items: flex-start;
          }
          .playerItem .btnRow {
            grid-template-columns: 1fr;
          }
          .playerNameRow :global(.deadair-btn) {
            width: 100%;
          }

          summary.accSummary {
            flex-wrap: wrap;
            align-items: flex-start;
          }
          .accMeta {
            width: 100%;
            justify-content: space-between;
          }

          .acHeader {
            grid-template-columns: 1fr;
          }
          .acHeaderRight {
            justify-content: flex-start;
          }

          .acControls {
            grid-template-columns: 1fr 1fr;
          }
          .acControls :global(.deadair-btn) {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .btnRow {
            grid-template-columns: 1fr;
          }
          .acControls {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Dim overlay lives here so it covers the whole page but doesn't block clicks */}
      <div className="dimOverlay" aria-hidden />

      <div className="deadair-wrap contentAboveDim">
        {/* Header */}
        <div className="row">
          <div>
            <h1 className="deadair-title">Dead Air</h1>
            <p className="deadair-sub" style={{ letterSpacing: "0.3px" }}>
              THE NARRATION IS LIVE <span style={{ opacity: 0.6 }}>·</span> Case file:{" "}
              <span className="mono">{game.id}</span>
            </p>
          </div>

          <div className="headerStatus">
            <div className="statusBadges">
              <span className="badge">
                Phase: <b>{currentRound === 0 ? "Setup" : `Round ${currentRound}`}</b>
              </span>

              <span className="badge">
                Intake: <b>{intakeDone}</b>/<b>{totalPlayers}</b>
              </span>

              <span className="badge">
                PIN: <b>{pin ? "✓" : "✕"}</b>
              </span>
            </div>

            <div className="statusActions">
              {currentRound === 0 ? (
                <button className="deadair-btn deadair-btnPrimary" onClick={openHostIntake}>
                  Open Host Intake
                </button>
              ) : null}

              <button className="deadair-btn deadair-btnGhost" onClick={load}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Status (Setup only) */}
        {currentRound === 0 ? (
          <div className="deadair-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "baseline",
              }}
            >
              <h3 style={{ margin: 0, fontFamily: "var(--sans)", fontSize: 15, letterSpacing: "0.2px" }}>
                Status
              </h3>
              <div className="small">
                If you know your guests well enough, you can fill their intakes yourself. If not… they can do it.
              </div>
            </div>

            <div className="timelineRow">
              <span className={`timelinePill ${stepCollectActive ? "timelineActive" : ""}`}>
                🧾 Collect Intakes{" "}
                <span style={{ opacity: 0.8 }}>
                  ({intakeDone}/{totalPlayers})
                </span>
              </span>
              <span className={`timelinePill ${stepProcessingActive ? "timelineActive" : ""}`}>
                🕯️ Processing <span style={{ opacity: 0.8 }}>(24–48 hrs)</span>
              </span>
              <span className={`timelinePill ${stepReadyActive ? "timelineActive" : ""}`}>🩸 Ready to Play</span>
            </div>

            {/* Host Briefing (Setup only) */}
            <div style={{ marginTop: 12 }}>
              <div className="briefingWrap">
                <div className="briefingTop">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="deadair-chip">🎧 Host Briefing</span>
                    <span className="deadair-sub" style={{ margin: 0 }}>
                      Listen first — it prevents “why is nothing working” energy.
                    </span>
                  </div>
                  <span className="hintPill">{briefingListened ? "✅ listened" : "📌 play me first"}</span>
                </div>

                <audio
                  ref={briefingRef}
                  src={WELCOME_AUDIO_URL}
                  preload="metadata"
                  onPlay={() => setBriefingPlaying(true)}
                  onPause={() => setBriefingPlaying(false)}
                  onEnded={() => {
                    setBriefingPlaying(false);
                    markBriefingListened();
                  }}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    const d = el.duration || 0;
                    const c = el.currentTime || 0;
                    setBriefingTime({ current: c, duration: d });
                    setBriefingProgress(d > 0 ? c / d : 0);
                  }}
                  style={{ display: "none" }}
                />

                <div className="btnRow">
                  <button
                    className="deadair-btn deadair-btnPrimary"
                    onClick={() => {
                      const el = briefingRef.current;
                      if (!el) return;
                      if (el.paused) el.play();
                      else el.pause();
                    }}
                  >
                    {briefingPlaying ? "Pause briefing" : "Play briefing"}
                  </button>

                  <button
                    className="deadair-btn deadair-btnGhost"
                    onClick={() => {
                      const el = briefingRef.current;
                      if (!el) return;
                      el.currentTime = 0;
                      el.pause();
                    }}
                  >
                    Restart
                  </button>

                  {!briefingListened && (
                    <button
                      className="deadair-btn"
                      style={{ borderColor: "rgba(212,175,55,0.30)", background: "rgba(212,175,55,0.12)" }}
                      onClick={markBriefingListened}
                    >
                      Mark listened
                    </button>
                  )}

                  <span className="small" style={{ marginTop: 0 }}>
                    Finish intakes → we process (24–48 hrs) → email when ready → access for 6 months.
                  </span>
                </div>

                <div className="progressOuter">
                  <div className="progressInner" style={{ width: `${Math.round(briefingProgress * 100)}%` }} />
                </div>

                <div className="timeRow">
                  <span>{fmtTime(briefingTime.current)}</span>
                  <span>{fmtTime(briefingTime.duration)}</span>
                </div>
              </div>
            </div>

            <div className="hr" />

            {!allIntakesComplete ? (
              <p className="deadair-sub" style={{ marginTop: 10 }}>
                Waiting on intake forms: <b>{intakeDone}</b> / <b>{totalPlayers}</b> complete.
                <br />
                Send players their links below, or fill them yourself using <b>Open Host Intake</b>.
              </p>
            ) : !storyReady ? (
              <p className="deadair-sub" style={{ marginTop: 10 }}>
                All intake forms are complete.
                <br />
                We’ve been notified and will begin processing your case. Please allow <b>24–48 hours</b>.
                <br />
                You’ll receive an email when it’s ready. (No, you can’t “just peek” at the ending.)
              </p>
            ) : (
              <p className="deadair-sub" style={{ marginTop: 10 }}>
                Story is ready. You can start Round 1 whenever you want.
              </p>
            )}

            <div className="hr" />

            <div className="btnRow">
              {roundsToShow.map((r) => {
                const isCurrent = r === currentRound;
                const disabled = r > 0 && !storyReady;

                return (
                  <button
                    key={r}
                    onClick={() => requestStartRound(r)}
                    disabled={disabled}
                    className={[
                      "deadair-btn",
                      isCurrent ? "deadair-btnPrimary" : "",
                      disabled ? "deadair-btnDisabled" : "",
                    ].join(" ")}
                    title={roundButtonTitle(r)}
                  >
                    {roundButtonLabel(r)}
                  </button>
                );
              })}
            </div>

            {!storyReady && (
              <p className="small" style={{ marginTop: 10 }}>
                Rounds 1–4 unlock once your case is ready.
              </p>
            )}
          </div>
        ) : (
          <div className="deadair-card">
            <div className="btnRow" style={{ marginTop: 0 }}>
              {roundsToShow.map((r) => {
                const isCurrent = r === currentRound;
                const disabled = r > 0 && !storyReady;

                return (
                  <button
                    key={r}
                    onClick={() => requestStartRound(r)}
                    disabled={disabled}
                    className={[
                      "deadair-btn",
                      isCurrent ? "deadair-btnPrimary" : "",
                      disabled ? "deadair-btnDisabled" : "",
                    ].join(" ")}
                    title={roundButtonTitle(r)}
                  >
                    {roundButtonLabel(r)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Narration */}
        <h3 className="sectionTitle">Narration for Current Phase</h3>
        <div className="deadair-card">
          {currentRound === 0 ? (
            <p className="deadair-sub">Setup mode. Start Round 1 when your case is ready.</p>
          ) : (
            <>
              {currentRoundRow?.narration_audio_url ? (
                <>
                  <AudioConsole
                    title={`Round ${currentRound} Narration`}
                    subtitle={currentRoundRow?.title ?? undefined}
                    src={currentRoundRow.narration_audio_url}
                    hintRight={currentRound === 4 ? "Part A" : undefined}
                    dimEnabled={dimRoomEnabled}
                    onToggleDim={() => setDimRoomEnabled((v) => !v)}
                    onPlayingChange={(p) => setNarrationPlaying(p)}
                  />

                  {currentRound === 4 && currentRoundRow?.narration_audio_url_part_b ? (
                    <div style={{ marginTop: 12 }}>
                      <AudioConsole
                        title="Reveal — Part B"
                        subtitle="Play after final accusations."
                        src={currentRoundRow.narration_audio_url_part_b}
                        hintRight="Part B"
                        compact
                        dimEnabled={dimRoomEnabled}
                        onToggleDim={() => setDimRoomEnabled((v) => !v)}
                        onPlayingChange={(p) => setNarrationPlaying(p)}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="deadair-sub">No audio URL stored for this round yet.</p>
              )}

              <div className="hr" />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div className="small" style={{ marginTop: 0 }}>
                  Narration text (reference)
                </div>

                <button
                  className="deadair-btn deadair-btnGhost"
                  onClick={() => setShowNarrationText((v) => !v)}
                  aria-expanded={showNarrationText}
                >
                  {showNarrationText ? "Hide text" : "Show text"}
                </button>
              </div>

              {showNarrationText ? (
                <div className="preBox" style={{ marginTop: 10 }}>
                  <pre>{currentRoundRow?.narration_text ?? "(No narration stored yet)"}</pre>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Players */}
        <h3 className="sectionTitle">Players</h3>

        {currentRound === 0 ? (
          <div className="deadair-card">
            <ul>
              {sortedPlayers.map((p) => (
                <li key={p.id} className="playerItem">
                  <div className="playerLeft">
                    <div className="playerNameRow">
                      <b>{p.name}</b>

                      <span className="pill">
                        code: <span className="mono">{p.code}</span>
                      </span>

                      <span className="pill pillPrivate">intake: {p.intake_complete ? "✅ complete" : "⏳ pending"}</span>

                      <button
                        className="deadair-btn deadair-btnGhost"
                        style={{ padding: "8px 10px" }}
                        onClick={() => router.push(`/p/${p.code}`)}
                        title="Open the player page"
                      >
                        👤 Open player view
                      </button>
                    </div>

                    {(p.invite_email || p.invite_phone) && (
                      <div className="small">
                        Invite:{" "}
                        <span className="mono">
                          {p.invite_email ?? ""}
                          {p.invite_email && p.invite_phone ? " • " : ""}
                          {p.invite_phone ?? ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="btnRow">
                    <button
                      className="deadair-btn deadair-btnGhost"
                      onClick={() => copyToClipboard(playerIntakeLink(p.code), `Copied ${p.name}'s intake link`)}
                    >
                      Copy intake link
                    </button>

                    <button
                      className="deadair-btn deadair-btnPrimary"
                      onClick={() => copyToClipboard(playerJoinLink(p.code), `Copied ${p.name}'s join link`)}
                    >
                      Copy join link
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <details className="acc">
            <summary className="accSummary">
              <span>Players</span>
              <span className="accMeta">
                <span>
                  Intake <b>{intakeDone}</b>/<b>{totalPlayers}</b>
                </span>
                <span className="chev">▾</span>
              </span>
            </summary>

            <div className="accBody">
              <div className="deadair-card" style={{ marginTop: 0 }}>
                <ul>
                  {sortedPlayers.map((p) => (
                    <li key={p.id} className="playerItem">
                      <div className="playerLeft">
                        <div className="playerNameRow">
                          <b>{p.name}</b>

                          <span className="pill">
                            code: <span className="mono">{p.code}</span>
                          </span>

                          <span className="pill pillPrivate">
                            intake: {p.intake_complete ? "✅ complete" : "⏳ pending"}
                          </span>

                          <button
                            className="deadair-btn deadair-btnGhost"
                            style={{ padding: "8px 10px" }}
                            onClick={() => router.push(`/p/${p.code}`)}
                            title="Open the player page"
                          >
                            👤 Open player view
                          </button>
                        </div>

                        {(p.invite_email || p.invite_phone) && (
                          <div className="small">
                            Invite:{" "}
                            <span className="mono">
                              {p.invite_email ?? ""}
                              {p.invite_email && p.invite_phone ? " • " : ""}
                              {p.invite_phone ?? ""}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="btnRow">
                        <button
                          className="deadair-btn deadair-btnGhost"
                          onClick={() => copyToClipboard(playerIntakeLink(p.code), `Copied ${p.name}'s intake link`)}
                        >
                          Copy intake link
                        </button>

                        <button
                          className="deadair-btn deadair-btnPrimary"
                          onClick={() => copyToClipboard(playerJoinLink(p.code), `Copied ${p.name}'s join link`)}
                        >
                          Copy join link
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        )}

        {toast && <div className="toast">{toast}</div>}

        {/* Confirm modal */}
        {confirmRound !== null && (
          <div className="modalOverlay" onClick={() => setConfirmRound(null)} role="dialog" aria-modal="true">
            <div className="modalCard" onClick={(e) => e.stopPropagation()}>
              <h4 className="modalTitle">Start Round {confirmRound}?</h4>
              <p className="modalBody">
                Starting a round pushes new instructions to every player.
                <br />
                Make sure everyone’s ready (and ideally not “missing in action”).
              </p>

              <div className="modalBtnRow">
                <button className="deadair-btn deadair-btnGhost" onClick={() => setConfirmRound(null)}>
                  Cancel
                </button>

                <button
                  className="deadair-btn deadair-btnPrimary"
                  onClick={() => {
                    const el = briefingRef.current;
                    if (el && !el.paused) el.pause();
                    const r = confirmRound;
                    setConfirmRound(null);
                    setRound(r);
                  }}
                >
                  Start Round {confirmRound}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
