"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RadioValue = string;

type IntakeJson = {
  group_role?: RadioValue;
  conflict_style?: RadioValue;
  presence?: RadioValue;

  associated_hobby?: string;
  comfort_habit?: string;
  joke_trait?: RadioValue;
  night_vibe?: RadioValue;

  boundaries?: string[];
  boundaries_other?: string;

  other_notes?: string;
};

const ROLE_OPTIONS = ["Leader", "Mediator", "Joker", "Observer", "Wildcard"] as const;
const CONFLICT_OPTIONS = ["Defensive", "Quiet", "Emotional", "Logical", "Deflects with humor"] as const;
const PRESENCE_OPTIONS = ["In control", "Harmless", "Intense", "Hard to read", "Confident"] as const;

const JOKE_TRAIT_OPTIONS = ["Overprepare", "Wing it", "Overthink", "Forget details", "Get competitive", "Stay chill"] as const;

const NIGHT_VIBE_OPTIONS = ["Loud music", "Quiet background", "Food smells", "Outside air", "Screens", "Chaos"] as const;

const BOUNDARY_OPTIONS = ["Family", "Health", "Money", "Work", "Relationships", "Substance use"] as const;

function cleanText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function isOther(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("Other:");
}

function otherText(v?: string) {
  if (!isOther(v)) return "";
  return v.slice("Other:".length).trim();
}

function setOther(txt: string) {
  const t = cleanText(txt);
  return t ? `Other: ${t}` : "Other:";
}

function stableStringify(obj: any) {
  try {
    return JSON.stringify(obj ?? {});
  } catch {
    return "{}";
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function HostIntakePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = (params.gameId as string) || "";
  const pin = searchParams.get("pin") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  // UI state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "complete">("pending");
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showSavedToast, setShowSavedToast] = useState<string | null>(null);
  const [requiredError, setRequiredError] = useState<string | null>(null);

  // per-player "last saved" timestamps (client-only)
  const [lastSavedMap, setLastSavedMap] = useState<Record<string, number>>({});

  // ✅ invite state (client-only)
  const [inviteSendingMap, setInviteSendingMap] = useState<Record<string, boolean>>({});
  const [inviteSentMap, setInviteSentMap] = useState<Record<string, number>>({});
  const [inviteErrMap, setInviteErrMap] = useState<Record<string, string | null>>({});

  // dirty tracking
  const baselineRef = useRef<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  // intake state
  const [groupRole, setGroupRole] = useState<string>("");
  const [groupRoleOther, setGroupRoleOther] = useState<string>("");

  const [conflictStyle, setConflictStyle] = useState<string>("");
  const [conflictOther, setConflictOther] = useState<string>("");

  const [presence, setPresence] = useState<string>("");
  const [presenceOther, setPresenceOther] = useState<string>("");

  const [associatedHobby, setAssociatedHobby] = useState<string>("");
  const [comfortHabit, setComfortHabit] = useState<string>("");

  const [jokeTrait, setJokeTrait] = useState<string>("");
  const [jokeOther, setJokeOther] = useState<string>("");

  const [nightVibe, setNightVibe] = useState<string>("");
  const [nightOther, setNightOther] = useState<string>("");

  const [boundaries, setBoundaries] = useState<string[]>([]);
  const [boundariesOther, setBoundariesOther] = useState<string>("");

  const [otherNotes, setOtherNotes] = useState<string>("");

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId),
    [players, selectedPlayerId]
  );

  const theme = useMemo(() => {
    const ink = "#1b1b1b";
    const paperEdge = "rgba(90, 62, 26, 0.36)";
    const paperShadow = "0 18px 55px rgba(0,0,0,0.38)";

    return {
      bg: "radial-gradient(1200px circle at 18% 12%, rgba(117,29,47,0.35), transparent 55%), radial-gradient(900px circle at 85% 30%, rgba(212,175,55,0.12), transparent 55%), linear-gradient(180deg, #0b0d10, #07080a)",
      panel: "rgba(16,18,22,0.76)",
      panelBorder: "rgba(212,175,55,0.20)",
      cream: "#f7f0df",
      gold: "#d4af37",
      burgundy: "#751d2f",
      muted: "rgba(255,255,255,0.72)",
      faint: "rgba(255,255,255,0.55)",

      ink,
      paperShadow,
      paperBorder: paperEdge,

      paper: `
        radial-gradient(1200px 500px at 20% 0%, rgba(255,255,255,0.55), transparent 60%),
        radial-gradient(900px 500px at 85% 30%, rgba(90,62,26,0.10), transparent 55%),
        radial-gradient(700px 700px at 10% 95%, rgba(117,29,47,0.06), transparent 55%),
        linear-gradient(180deg, #f6edd8, #eadbbf)
      `,
      paperNoise: `
        repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0.015),
          rgba(0,0,0,0.015) 1px,
          transparent 1px,
          transparent 3px
        )
      `,
      inkBlots: `
        radial-gradient(22px 18px at 18% 24%, rgba(27,27,27,0.10), transparent 60%),
        radial-gradient(18px 16px at 82% 32%, rgba(27,27,27,0.08), transparent 62%),
        radial-gradient(26px 22px at 72% 78%, rgba(27,27,27,0.06), transparent 60%),
        radial-gradient(32px 28px at 28% 86%, rgba(27,27,27,0.05), transparent 62%)
      `,

      paperFont: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      labelFont:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      sans:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    };
  }, []);

  const intakeJson: IntakeJson = useMemo(() => {
    const roleVal = groupRole === "__other__" ? setOther(groupRoleOther) : groupRole || undefined;
    const conflictVal = conflictStyle === "__other__" ? setOther(conflictOther) : conflictStyle || undefined;
    const presenceVal = presence === "__other__" ? setOther(presenceOther) : presence || undefined;

    const jokeVal = jokeTrait === "__other__" ? setOther(jokeOther) : jokeTrait || undefined;
    const nightVal = nightVibe === "__other__" ? setOther(nightOther) : nightVibe || undefined;

    const b = boundaries.slice();

    return {
      group_role: roleVal,
      conflict_style: conflictVal,
      presence: presenceVal,
      associated_hobby: cleanText(associatedHobby) || undefined,
      comfort_habit: cleanText(comfortHabit) || undefined,
      joke_trait: jokeVal,
      night_vibe: nightVal,
      boundaries: b.length ? b : undefined,
      boundaries_other: cleanText(boundariesOther) || undefined,
      other_notes: cleanText(otherNotes) || undefined,
    };
  }, [
    groupRole,
    groupRoleOther,
    conflictStyle,
    conflictOther,
    presence,
    presenceOther,
    associatedHobby,
    comfortHabit,
    jokeTrait,
    jokeOther,
    nightVibe,
    nightOther,
    boundaries,
    boundariesOther,
    otherNotes,
  ]);

  function hydrateFromIntake(ij: IntakeJson | null) {
    const intake = ij ?? {};

    if (isOther(intake.group_role)) {
      setGroupRole("__other__");
      setGroupRoleOther(otherText(intake.group_role));
    } else {
      setGroupRole(intake.group_role ?? "");
      setGroupRoleOther("");
    }

    if (isOther(intake.conflict_style)) {
      setConflictStyle("__other__");
      setConflictOther(otherText(intake.conflict_style));
    } else {
      setConflictStyle(intake.conflict_style ?? "");
      setConflictOther("");
    }

    if (isOther(intake.presence)) {
      setPresence("__other__");
      setPresenceOther(otherText(intake.presence));
    } else {
      setPresence(intake.presence ?? "");
      setPresenceOther("");
    }

    setAssociatedHobby(intake.associated_hobby ?? "");
    setComfortHabit(intake.comfort_habit ?? "");

    if (isOther(intake.joke_trait)) {
      setJokeTrait("__other__");
      setJokeOther(otherText(intake.joke_trait));
    } else {
      setJokeTrait(intake.joke_trait ?? "");
      setJokeOther("");
    }

    if (isOther(intake.night_vibe)) {
      setNightVibe("__other__");
      setNightOther(otherText(intake.night_vibe));
    } else {
      setNightVibe(intake.night_vibe ?? "");
      setNightOther("");
    }

    setBoundaries(Array.isArray(intake.boundaries) ? intake.boundaries : []);
    setBoundariesOther(intake.boundaries_other ?? "");
    setOtherNotes(intake.other_notes ?? "");

    setRequiredError(null);
    setDirty(false);
  }

  async function load() {
    if (!gameId) return;
    setLoading(true);

    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("id,host_pin")
      .eq("id", gameId)
      .single();

    if (gErr || !g) {
      setGame(null);
      setPlayers([]);
      setLoading(false);
      return;
    }

    setGame(g);

    const { data: ps, error: pErr } = await supabase
      .from("players")
      .select("id,name,code,intake_complete,intake_json,invite_email")
      .eq("game_id", gameId)
      .order("created_at");

    if (pErr) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    const list = ps ?? [];
    setPlayers(list);

    for (const p of list) {
      if (!baselineRef.current[p.id]) {
        baselineRef.current[p.id] = stableStringify(p.intake_json ?? {});
      }
    }

    if (!selectedPlayerId) {
      const firstPending = list.find((x) => !x.intake_complete)?.id;
      const firstId = firstPending ?? list[0]?.id;
      if (firstId) {
        setSelectedPlayerId(firstId);
        const first = list.find((x) => x.id === firstId);
        hydrateFromIntake((first?.intake_json ?? null) as IntakeJson | null);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // when player changes, hydrate (with unsaved warning)
  async function safeSelectPlayer(nextId: string, opts?: { skipDirtyConfirm?: boolean }) {
    if (nextId === selectedPlayerId) return;

    const skip = opts?.skipDirtyConfirm ?? false;

    // Only warn on manual navigation, not on auto-advance
    if (!skip && dirty) {
      const ok = window.confirm("This file has unsaved notes. Discard changes and switch players?");
      if (!ok) return;
    }

    setSelectedPlayerId(nextId);
    const p = players.find((x) => x.id === nextId);
    hydrateFromIntake((p?.intake_json ?? null) as IntakeJson | null);
  }

  // Guard against accidental navigation away with unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const pinOk = !!game && !!pin && pin === game.host_pin;

  function toggleBoundary(val: string) {
    setBoundaries((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
  }

  // dirty computation
  useEffect(() => {
    if (!selectedPlayerId) return;
    const baseline = baselineRef.current[selectedPlayerId] ?? "{}";
    const now = stableStringify(intakeJson ?? {});
    const isDirty = baseline !== now;
    setDirty(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, intakeJson]);

  // Keyboard shortcut: Cmd/Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) save();
      }
      if (e.key === "Escape") {
        if (!dirty) router.push(`/host/${gameId}?pin=${encodeURIComponent(pin)}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, dirty, gameId, pin]);

  function showToast(msg: string) {
    setShowSavedToast(msg);
    window.setTimeout(() => setShowSavedToast(null), 1400);
  }

  function nextPendingPlayerId(afterId?: string) {
    const list = players.slice();
    const startIdx = Math.max(0, list.findIndex((p) => p.id === (afterId ?? selectedPlayerId)));
    for (let i = startIdx + 1; i < list.length; i++) {
      if (!list[i].intake_complete) return list[i].id;
    }
    for (let i = 0; i < list.length; i++) {
      if (!list[i].intake_complete) return list[i].id;
    }
    return "";
  }

  async function markIncomplete() {
    if (!selectedPlayer) return;
    if (!pinOk) return;

    const ok = window.confirm("Mark this player as incomplete? (Does not erase answers.)");
    if (!ok) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({ intake_complete: false, intake_status: "in_progress" })
        .eq("id", selectedPlayer.id);

      if (error) throw error;

      setPlayers((prev) => prev.map((p) => (p.id === selectedPlayer.id ? { ...p, intake_complete: false } : p)));
      showToast("Marked incomplete");
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!selectedPlayer) return;

    if (!pinOk) {
      alert("Wrong or missing host PIN. Use the link with ?pin=...");
      return;
    }

    if (!intakeJson.group_role || !intakeJson.conflict_style || !intakeJson.presence) {
      setRequiredError("Missing required answers: complete the 3 Group Personality rows.");
      return;
    }

    setRequiredError(null);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("players")
        .update({
          intake_json: intakeJson,
          intake_complete: true,
          intake_status: "complete",
          intake_mode: "host",
        })
        .eq("id", selectedPlayer.id);

      if (error) throw error;

      // best-effort: server-side post-submit hook (if you have it)
      fetch("/api/intake/after-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      }).catch(() => {});

      const nowTs = Date.now();

      setPlayers((prev) =>
        prev.map((p) => (p.id === selectedPlayer.id ? { ...p, intake_json: intakeJson, intake_complete: true } : p))
      );

      baselineRef.current[selectedPlayer.id] = stableStringify(intakeJson ?? {});
      setDirty(false);

      setLastSavedMap((prev) => ({ ...prev, [selectedPlayer.id]: nowTs }));

      showToast("Saved ✅");

      if (autoAdvance) {
        const nextId = nextPendingPlayerId(selectedPlayer.id);
        if (nextId && nextId !== selectedPlayer.id) {
          await safeSelectPlayer(nextId, { skipDirtyConfirm: true });
        }
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to save intake");
    } finally {
      setSaving(false);
    }
  }

  // ✅ SEND INTAKE EMAIL (NEW)
  async function sendIntakeInvite(player: any) {
    if (!pinOk) {
      alert("Wrong or missing host PIN.");
      return;
    }
    if (!player?.id) return;

    setInviteErrMap((prev) => ({ ...prev, [player.id]: null }));
    setInviteSendingMap((prev) => ({ ...prev, [player.id]: true }));

    try {
      let email = String(player.invite_email ?? "").trim();

      if (!email) {
        const entered = window.prompt(`No email saved for ${player.name}.\n\nEnter their email to send the intake link:`, "");
        if (!entered) {
          setInviteSendingMap((prev) => ({ ...prev, [player.id]: false }));
          return;
        }
        email = String(entered).trim();
      }

      const res = await fetch("/api/invite/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerId: player.id,
          email,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = json?.error ?? "Failed to send.";
        setInviteErrMap((prev) => ({ ...prev, [player.id]: msg }));
        alert(msg);
        return;
      }

      // reflect saved email in local UI (since API may store it)
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, invite_email: email } : p))
      );

      const now = Date.now();
      setInviteSentMap((prev) => ({ ...prev, [player.id]: now }));
      showToast("Invite sent ✅");
    } catch (e: any) {
      const msg = e?.message ?? "Invite failed.";
      setInviteErrMap((prev) => ({ ...prev, [player.id]: msg }));
      alert(msg);
    } finally {
      setInviteSendingMap((prev) => ({ ...prev, [player.id]: false }));
    }
  }

  // progress
  const intakeTotal = players.length;
  const intakeCompleted = players.filter((p) => !!p.intake_complete).length;
  const remaining = Math.max(0, intakeTotal - intakeCompleted);
  const progressPct = intakeTotal > 0 ? Math.round((intakeCompleted / intakeTotal) * 100) : 0;

  // derived list for search/filter
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      const matchesQ =
        !q ||
        String(p.name ?? "").toLowerCase().includes(q) ||
        String(p.code ?? "").toLowerCase().includes(q) ||
        String(p.invite_email ?? "").toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ? true : filter === "pending" ? !p.intake_complete : !!p.intake_complete;

      return matchesQ && matchesFilter;
    });
  }, [players, search, filter]);

  function previewChips(p: any) {
    const ij: IntakeJson = (p?.intake_json ?? {}) as any;
    const chips: string[] = [];

    const role = ij.group_role ? (isOther(ij.group_role) ? otherText(ij.group_role) : ij.group_role) : "";
    const presenceVal = ij.presence ? (isOther(ij.presence) ? otherText(ij.presence) : ij.presence) : "";
    const vibe = ij.night_vibe ? (isOther(ij.night_vibe) ? otherText(ij.night_vibe) : ij.night_vibe) : "";

    if (role) chips.push(role);
    if (presenceVal && chips.length < 2) chips.push(presenceVal);
    if (vibe && chips.length < 2) chips.push(vibe);

    return chips.slice(0, 2);
  }

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;
  if (!game) return <main style={{ padding: 16 }}>Game not found.</main>;

  if (!pinOk) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, padding: 18 }}>
        <div style={{ maxWidth: 900, margin: "40px auto", padding: 16, color: theme.cream }}>
          <h2 style={{ margin: 0 }}>Host Intake</h2>
          <p>Wrong or missing PIN.</p>
          <p>
            Make sure your URL includes <code>?pin=...</code>
          </p>
        </div>
      </main>
    );
  }

  const selectedLastSaved = selectedPlayer ? lastSavedMap[selectedPlayer.id] : undefined;

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, padding: 18 }}>
      <div style={{ maxWidth: 1180, margin: "24px auto" }}>
        {/* Header */}
        <header
          style={{
            padding: 16,
            borderRadius: 14,
            background: theme.panel,
            border: `1px solid ${theme.panelBorder}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            color: theme.cream,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: theme.gold, letterSpacing: 2, fontSize: 12, textTransform: "uppercase" }}>
                Host Control — Intake Desk
              </div>
              <h1 style={{ margin: "6px 0 0 0", fontSize: 28 }}>Intake Case Files</h1>

              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontFamily: theme.labelFont,
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: theme.muted,
                    }}
                  >
                    Progress
                  </div>
                  <div style={{ fontFamily: theme.sans, fontSize: 13, color: theme.muted }}>
                    <b style={{ color: theme.cream }}>{intakeCompleted}</b>/{intakeTotal} completed ·{" "}
                    <b style={{ color: theme.cream }}>{remaining}</b> remaining
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      background: "rgba(212,175,55,0.35)",
                      borderRight: "1px solid rgba(212,175,55,0.35)",
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ alignSelf: "center", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  if (dirty) {
                    const ok = window.confirm("You have unsaved notes. Leave anyway?");
                    if (!ok) return;
                  }
                  router.push(`/host/${gameId}?pin=${encodeURIComponent(pin)}`);
                }}
                style={{
                  color: theme.cream,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(0,0,0,0.20)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: theme.sans,
                  fontWeight: 900,
                }}
                title="Back to Host Dashboard"
              >
                ← Host Dashboard
              </button>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  fontFamily: theme.sans,
                  fontSize: 13,
                  color: theme.cream,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                title="After saving, jump to the next pending player"
              >
                <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
                After save → next pending
              </label>
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 14, marginTop: 14 }}>
          {/* Player list */}
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: theme.panel,
              border: `1px solid ${theme.panelBorder}`,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              color: theme.cream,
              height: "fit-content",
            }}
          >
            {/* Search + filter */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Players</h2>
                <div style={{ fontSize: 12, color: theme.muted }}>Select a file</div>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, or email…"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.18)",
                  color: theme.cream,
                  fontFamily: theme.sans,
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip active={filter === "pending"} onClick={() => setFilter("pending")} label="Pending" />
                <Chip active={filter === "complete"} onClick={() => setFilter("complete")} label="Complete" />
                <Chip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {filteredPlayers.map((p) => {
                const active = p.id === selectedPlayerId;
                const complete = !!p.intake_complete;
                const chips = previewChips(p);

                const sending = !!inviteSendingMap[p.id];
                const sentTs = inviteSentMap[p.id];
                const inviteErr = inviteErrMap[p.id];

                return (
                  <div
                    key={p.id}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${
                        active ? theme.gold : complete ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.12)"
                      }`,
                      background: active
                        ? "rgba(212,175,55,0.10)"
                        : complete
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.06)",
                      padding: 10,
                    }}
                  >
                    <button
                      onClick={() => safeSelectPlayer(p.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: theme.cream,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ fontWeight: 900 }}>{p.name}</div>
                        <div
                          style={{
                            fontFamily: theme.labelFont,
                            fontSize: 11,
                            opacity: 0.8,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          {complete ? "Complete" : "Pending"}
                        </div>
                      </div>

                      <div style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>
                        code: {p.code} · intake: {complete ? "✅" : "❌"}
                      </div>

                      {p.invite_email ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>
                          email: {String(p.invite_email)}
                        </div>
                      ) : (
                        <div style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>email: —</div>
                      )}

                      {chips.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {chips.map((c) => (
                            <span
                              key={c}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 999,
                                fontFamily: theme.sans,
                                fontSize: 12,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(0,0,0,0.18)",
                                color: theme.cream,
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* ✅ actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={() => sendIntakeInvite(p)}
                        disabled={sending}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.16)",
                          background: "rgba(0,0,0,0.18)",
                          color: theme.cream,
                          cursor: sending ? "not-allowed" : "pointer",
                          fontFamily: theme.sans,
                          fontWeight: 900,
                          fontSize: 13,
                          opacity: sending ? 0.7 : 1,
                        }}
                        title="Send this player the intake form link"
                      >
                        {sending ? "Sending…" : "Send intake form"}
                      </button>

                      {sentTs ? (
                        <span style={{ fontFamily: theme.labelFont, fontSize: 11, opacity: 0.75 }}>
                          Sent {formatTime(sentTs)} ({relativeTime(sentTs)})
                        </span>
                      ) : null}

                      {inviteErr ? (
                        <span style={{ fontFamily: theme.sans, fontSize: 12, color: "rgba(255,150,150,0.95)" }}>
                          {inviteErr}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {filteredPlayers.length === 0 && (
                <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", color: theme.muted }}>
                  No matches.
                </div>
              )}
            </div>
          </div>

          {/* Paper Form */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.paperBorder}`,
              boxShadow: theme.paperShadow,
              background: theme.paper,
              color: theme.ink,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* paper overlays */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.35,
                background: theme.paperNoise,
                mixBlendMode: "multiply",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.35,
                background: theme.inkBlots,
                mixBlendMode: "multiply",
              }}
            />

            {/* torn edge top */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                height: 18,
                background:
                  "linear-gradient(90deg, rgba(90,62,26,0.10), rgba(90,62,26,0.02), rgba(90,62,26,0.10))",
                opacity: 0.55,
                clipPath:
                  "polygon(0% 70%, 4% 55%, 8% 72%, 12% 50%, 16% 74%, 20% 52%, 24% 76%, 28% 54%, 32% 78%, 36% 56%, 40% 80%, 44% 58%, 48% 82%, 52% 60%, 56% 84%, 60% 62%, 64% 82%, 68% 60%, 72% 78%, 76% 58%, 80% 76%, 84% 54%, 88% 72%, 92% 52%, 96% 70%, 100% 58%, 100% 0%, 0% 0%)",
              }}
            />
            {/* torn edge bottom */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                right: 0,
                height: 18,
                background:
                  "linear-gradient(90deg, rgba(90,62,26,0.10), rgba(90,62,26,0.02), rgba(90,62,26,0.10))",
                opacity: 0.55,
                clipPath:
                  "polygon(0% 100%, 0% 42%, 4% 55%, 8% 40%, 12% 60%, 16% 38%, 20% 58%, 24% 36%, 28% 56%, 32% 34%, 36% 54%, 40% 32%, 44% 52%, 48% 30%, 52% 50%, 56% 32%, 60% 52%, 64% 34%, 68% 54%, 72% 36%, 76% 56%, 80% 38%, 84% 58%, 88% 40%, 92% 60%, 96% 42%, 100% 55%, 100% 100%)",
              }}
            />

            {/* binder holes */}
            <div aria-hidden style={{ position: "absolute", left: 18, top: 70, width: 24, height: "calc(100% - 120px)" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.18)",
                    background: "rgba(255,255,255,0.28)",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.10)",
                    marginBottom: i === 2 ? 0 : 34,
                    marginTop: i === 0 ? 8 : 0,
                  }}
                />
              ))}
            </div>

            {/* margin line */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 60,
                top: 0,
                bottom: 0,
                width: 2,
                background: "rgba(117,29,47,0.14)",
              }}
            />

            {/* Confidential stamp */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: 22,
                top: 22,
                transform: "rotate(-12deg)",
                border: "2px solid rgba(177,29,42,0.55)",
                color: "rgba(177,29,42,0.70)",
                padding: "10px 14px",
                borderRadius: 10,
                fontFamily: theme.labelFont,
                fontWeight: 900,
                letterSpacing: 2,
                textTransform: "uppercase",
                background: "rgba(255,255,255,0.20)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
                userSelect: "none",
              }}
            >
              CONFIDENTIAL
            </div>

            <div style={{ position: "relative", padding: 18, paddingLeft: 78, fontFamily: theme.paperFont }}>
              {/* classification strip */}
              <div
                style={{
                  fontFamily: theme.labelFont,
                  fontSize: 12,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  opacity: 0.75,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    padding: "4px 8px",
                    border: "1px solid rgba(0,0,0,0.18)",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.30)",
                  }}
                >
                  Host Eyes Only
                </span>
                <span>·</span>
                <span>File Type: Intake</span>
                <span>·</span>
                <span>Status: {selectedPlayer?.intake_complete ? "Complete" : "In Progress"}</span>
                {dirty ? (
                  <>
                    <span>·</span>
                    <span style={{ color: "rgba(117,29,47,0.9)" }}>Unsaved changes</span>
                  </>
                ) : null}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                <div>
                  <div
                    style={{
                      fontFamily: theme.labelFont,
                      opacity: 0.75,
                      fontWeight: 900,
                      letterSpacing: 1.6,
                      textTransform: "uppercase",
                      fontSize: 12,
                    }}
                  >
                    Case File
                  </div>
                  <h2 style={{ margin: "8px 0 0 0", fontSize: 28, letterSpacing: "0.2px" }}>
                    {selectedPlayer?.name ?? "Select a player"}
                  </h2>
                </div>

                {selectedPlayer ? (
                  <div style={{ alignSelf: "center", textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: theme.labelFont,
                        fontWeight: 900,
                        letterSpacing: 1.4,
                        textTransform: "uppercase",
                        fontSize: 12,
                        opacity: 0.75,
                      }}
                    >
                      Reference Code
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      <span style={{ textDecoration: "underline" }}>{selectedPlayer.code}</span>
                    </div>

                    {selectedLastSaved ? (
                      <div style={{ marginTop: 6, fontFamily: theme.labelFont, fontSize: 11, opacity: 0.7 }}>
                        Last saved: {formatTime(selectedLastSaved)} ({relativeTime(selectedLastSaved)})
                      </div>
                    ) : (
                      <div style={{ marginTop: 6, fontFamily: theme.labelFont, fontSize: 11, opacity: 0.7 }}>
                        Tip: Ctrl/Cmd+S saves
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {!selectedPlayer ? (
                <p style={{ marginTop: 12, fontFamily: theme.sans, opacity: 0.8 }}>
                  Select a player on the left to edit their intake.
                </p>
              ) : (
                <>
                  {requiredError ? (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "12px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(117,29,47,0.35)",
                        background: "rgba(117,29,47,0.10)",
                        color: "rgba(27,27,27,0.95)",
                        fontFamily: theme.sans,
                        fontWeight: 700,
                      }}
                    >
                      {requiredError}
                    </div>
                  ) : null}

                  <FileDivider label="Section A · Group Personality (required)" />

                  <Section title="Group Personality" subtitle="Select ONE per row.">
                    <RadioRow
                      label="In group settings, they tend to be…"
                      name="group_role"
                      value={groupRole}
                      options={[...ROLE_OPTIONS]}
                      onChange={setGroupRole}
                      otherValue={groupRoleOther}
                      onOtherChange={setGroupRoleOther}
                      paperFont={theme.paperFont}
                    />
                    <RadioRow
                      label="When tension rises, they usually…"
                      name="conflict_style"
                      value={conflictStyle}
                      options={[...CONFLICT_OPTIONS]}
                      onChange={setConflictStyle}
                      otherValue={conflictOther}
                      onOtherChange={setConflictOther}
                      paperFont={theme.paperFont}
                    />
                    <RadioRow
                      label="Their presence usually feels…"
                      name="presence"
                      value={presence}
                      options={[...PRESENCE_OPTIONS]}
                      onChange={setPresence}
                      otherValue={presenceOther}
                      onOtherChange={setPresenceOther}
                      paperFont={theme.paperFont}
                    />
                  </Section>

                  <FileDivider label="Section B · Flavor (recommended)" />

                  <Section title="Fun / Flavor" subtitle="Short answers are best.">
                    <TextField label="Hobby people associate with them" value={associatedHobby} onChange={setAssociatedHobby} paperFont={theme.paperFont} />
                    <TextField label="Comfort habit when stressed" value={comfortHabit} onChange={setComfortHabit} paperFont={theme.paperFont} />

                    <RadioRow
                      label="People joke they usually…"
                      name="joke_trait"
                      value={jokeTrait}
                      options={[...JOKE_TRAIT_OPTIONS]}
                      onChange={setJokeTrait}
                      otherValue={jokeOther}
                      onOtherChange={setJokeOther}
                      paperFont={theme.paperFont}
                    />

                    <RadioRow
                      label="Night vibe feels best with…"
                      name="night_vibe"
                      value={nightVibe}
                      options={[...NIGHT_VIBE_OPTIONS]}
                      onChange={setNightVibe}
                      otherValue={nightOther}
                      onOtherChange={setNightOther}
                      paperFont={theme.paperFont}
                    />
                  </Section>

                  <FileDivider label="Section C · Boundaries" />

                  <Section title="Boundaries" subtitle="Avoid joking about (select any).">
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                        {BOUNDARY_OPTIONS.map((b) => (
                          <label
                            key={b}
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: "1px solid rgba(0,0,0,0.18)",
                              background: "rgba(255,255,255,0.55)",
                              fontFamily: theme.paperFont,
                            }}
                          >
                            <input type="checkbox" checked={boundaries.includes(b)} onChange={() => toggleBoundary(b)} />
                            <span style={{ fontWeight: 800 }}>{b}</span>
                          </label>
                        ))}
                      </div>

                      <TextField label="Other boundary (optional)" value={boundariesOther} onChange={setBoundariesOther} paperFont={theme.paperFont} />
                    </div>
                  </Section>

                  <FileDivider label="Section D · Notes (optional)" />

                  <Section title="Anything else we should know?" subtitle="Optional.">
                    <label style={{ display: "grid", gap: 8, fontFamily: theme.paperFont }}>
                      <div style={{ fontWeight: 900 }}>Notes</div>
                      <textarea
                        value={otherNotes}
                        onChange={(e) => setOtherNotes(e.target.value)}
                        rows={4}
                        style={{
                          padding: "12px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.22)",
                          background: "rgba(255,255,255,0.65)",
                          resize: "vertical",
                          fontFamily: theme.paperFont,
                        }}
                      />
                    </label>
                  </Section>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
                    <button
                      onClick={save}
                      disabled={saving}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.25)",
                        background: saving ? "rgba(0,0,0,0.12)" : theme.burgundy,
                        color: "#fff",
                        fontWeight: 900,
                        cursor: saving ? "not-allowed" : "pointer",
                        boxShadow: "0 10px 24px rgba(117,29,47,0.25)",
                      }}
                      title="Saves answers and marks this player complete"
                    >
                      {saving ? "Saving…" : "Save Intake (marks complete ✅)"}
                    </button>

                    <button
                      onClick={markIncomplete}
                      disabled={saving}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.22)",
                        background: "rgba(255,255,255,0.55)",
                        color: "rgba(27,27,27,0.92)",
                        fontWeight: 900,
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                      title="Mark this player as incomplete (does not erase answers)"
                    >
                      Mark incomplete
                    </button>

                    <div
                      style={{
                        marginLeft: "auto",
                        fontFamily: theme.labelFont,
                        fontSize: 12,
                        opacity: 0.75,
                      }}
                    >
                      {dirty ? "● Draft not saved" : "✓ File up to date"}
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontFamily: theme.sans, fontSize: 12, opacity: 0.75 }}>
                    Required to save: complete the 3 Group Personality rows. Shortcut: <b>Ctrl/Cmd+S</b>. Escape returns to host (only if no draft).
                  </div>
                </>
              )}
            </div>

            {showSavedToast ? (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 18,
                  transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.70)",
                  border: "1px solid rgba(0,0,0,0.25)",
                  color: "#fff",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontFamily: theme.sans,
                  fontSize: 13,
                  boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
                }}
              >
                {showSavedToast}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function Chip(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 999,
        border: `1px solid ${props.active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.14)"}`,
        background: props.active ? "rgba(212,175,55,0.12)" : "rgba(0,0,0,0.18)",
        color: "rgba(255,255,255,0.90)",
        cursor: "pointer",
        fontSize: 13,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      }}
    >
      {props.label}
    </button>
  );
}

function FileDivider(props: { label: string }) {
  return (
    <div style={{ margin: "18px 0 14px" }}>
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.20), transparent)" }} />
      <div
        style={{
          marginTop: 10,
          display: "inline-flex",
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.18)",
          background: "rgba(255,255,255,0.35)",
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          opacity: 0.9,
        }}
      >
        {props.label}
      </div>
    </div>
  );
}

function Section(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 18, letterSpacing: "0.2px" }}>{props.title}</h3>
        {props.subtitle ? (
          <div
            style={{
              opacity: 0.75,
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            }}
          >
            {props.subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 14 }}>{props.children}</div>
    </section>
  );
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void; paperFont: string }) {
  return (
    <label style={{ display: "grid", gap: 8, fontFamily: props.paperFont }}>
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          padding: "12px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.22)",
          background: "rgba(255,255,255,0.65)",
          fontFamily: props.paperFont,
        }}
      />
    </label>
  );
}

function RadioRow(props: {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  otherValue: string;
  onOtherChange: (v: string) => void;
  paperFont: string;
}) {
  const isOtherSelected = props.value === "__other__";

  return (
    <div style={{ fontFamily: props.paperFont }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{props.label}</div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {props.options.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.18)",
                background: "rgba(255,255,255,0.55)",
              }}
            >
              <input type="radio" name={props.name} checked={props.value === opt} onChange={() => props.onChange(opt)} />
              <span style={{ fontWeight: 800 }}>{opt}</span>
            </label>
          ))}
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.18)",
            background: "rgba(255,255,255,0.55)",
            maxWidth: 420,
          }}
        >
          <input type="radio" name={props.name} checked={isOtherSelected} onChange={() => props.onChange("__other__")} />
          <span style={{ fontWeight: 800 }}>Other</span>
        </label>

        {isOtherSelected && (
          <input
            value={props.otherValue}
            onChange={(e) => props.onOtherChange(e.target.value)}
            placeholder="Type your own…"
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.22)",
              background: "rgba(255,255,255,0.65)",
              fontFamily: props.paperFont,
              maxWidth: 520,
            }}
          />
        )}
      </div>
    </div>
  );
}
