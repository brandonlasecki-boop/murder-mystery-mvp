"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
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

// ✅ Type guard fixes TS narrowing
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

export default function PlayerIntakePage() {
  const params = useParams();
  const code = (params.code as string) || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [player, setPlayer] = useState<any>(null);

  // UI enhancements (parity with Host Intake)
  const [showSavedToast, setShowSavedToast] = useState<string | null>(null);
  const [requiredError, setRequiredError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const baselineRef = useRef<string>("{}");
  const [lastSavedTs, setLastSavedTs] = useState<number | null>(null);

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

      // Paper / ink
      ink,
      paperShadow,
      paperBorder: paperEdge,

      // parchment texture (no images)
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

      // Fonts
      paperFont: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      labelFont:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      sans:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    };
  }, []);

  const intakeJson: IntakeJson = useMemo(() => {
    const roleVal = groupRole === "__other__" ? setOther(groupRoleOther) : groupRole || undefined;
    const conflictVal =
      conflictStyle === "__other__" ? setOther(conflictOther) : conflictStyle || undefined;
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

  function showToast(msg: string) {
    setShowSavedToast(msg);
    window.setTimeout(() => setShowSavedToast(null), 1400);
  }

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
    if (!code) return;
    setLoading(true);

    const { data: p, error } = await supabase
      .from("players")
      .select("id,name,code,intake_json,intake_complete")
      .eq("code", code)
      .single();

    if (error || !p) {
      setPlayer(null);
      setLoading(false);
      return;
    }

    setPlayer(p);
    hydrateFromIntake((p.intake_json ?? null) as IntakeJson | null);

    // baseline for dirty tracking
    const base = stableStringify(p.intake_json ?? {});
    baselineRef.current = base;

    setLoading(false);
  }

  function toggleBoundary(val: string) {
    setBoundaries((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
  }

  // dirty computation (parity with host)
  useEffect(() => {
    const now = stableStringify(intakeJson ?? {});
    setDirty(baselineRef.current !== now);
  }, [intakeJson]);

  // Warn before leaving tab if dirty
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Keyboard shortcut: Cmd/Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, dirty, code]);

  async function save() {
    if (!player) return;

    // Require the 3 personality radios
    if (!intakeJson.group_role || !intakeJson.conflict_style || !intakeJson.presence) {
      setRequiredError("Missing required answers: complete the 3 Group Personality rows.");
      return;
    }

    setRequiredError(null);
    setSaving(true);

    try {
      // ✅ Update + fetch game_id in the same call (so we can notify server)
      const { data: updated, error } = await supabase
        .from("players")
        .update({
          intake_json: intakeJson,
          intake_complete: true,
          intake_status: "complete",
          intake_mode: "self",
        })
        .eq("id", player.id)
        .select("game_id")
        .single();

      if (error) throw error;

      // ✅ Kick off server-side check (best effort; never blocks saving)
      const gameId = (updated as any)?.game_id as string | undefined;
      if (gameId) {
        fetch("/api/intake/after-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        }).catch(() => {});
      }

      const nowTs = Date.now();
      baselineRef.current = stableStringify(intakeJson ?? {});
      setDirty(false);
      setLastSavedTs(nowTs);

      showToast("Saved ✅");

      // keep local "player" updated so UI can reflect completion
      setPlayer((prev: any) =>
        prev ? { ...prev, intake_json: intakeJson, intake_complete: true } : prev
      );
    } catch (e: any) {
      alert(e?.message ?? "Failed to save intake");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!code) return <main style={{ padding: 16 }}>Missing player code.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;
  if (!player) return <main style={{ padding: 16 }}>Player not found.</main>;

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, padding: 18 }}>
      <div style={{ maxWidth: 940, margin: "24px auto" }}>
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
                Confidential Intake
              </div>
              <h1 style={{ margin: "6px 0 0 0", fontSize: 28 }}>Your Case File</h1>

              <p style={{ margin: "8px 0 0 0", color: theme.muted, fontFamily: theme.sans, lineHeight: 1.5 }}>
                Hi <b style={{ color: theme.cream }}>{player.name}</b>. Your answers shape your private prompts and the
                narrator’s tone.
              </p>

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    fontFamily: theme.labelFont,
                    fontSize: 12,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  Status:
                </span>
                <span style={{ fontFamily: theme.sans, fontSize: 13, color: theme.muted }}>
                  <b style={{ color: theme.cream }}>{player.intake_complete ? "Complete" : "In progress"}</b>
                  {dirty ? (
                    <>
                      {" "}
                      · <span style={{ color: "rgba(255,255,255,0.92)" }}>Unsaved changes</span>
                    </>
                  ) : null}
                </span>
                {lastSavedTs ? (
                  <span style={{ fontFamily: theme.labelFont, fontSize: 11, opacity: 0.75 }}>
                    Last saved: {formatTime(lastSavedTs)} ({relativeTime(lastSavedTs)})
                  </span>
                ) : (
                  <span style={{ fontFamily: theme.labelFont, fontSize: 11, opacity: 0.65 }}>Tip: Ctrl/Cmd+S saves</span>
                )}
              </div>
            </div>

            <div
              style={{
                alignSelf: "center",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${theme.panelBorder}`,
                color: theme.faint,
                fontSize: 12,
                fontFamily: theme.labelFont,
                letterSpacing: 1.4,
              }}
              title="Your player code"
            >
              CODE: <span style={{ color: theme.cream, fontWeight: 900 }}>{player.code}</span>
            </div>
          </div>
        </header>

        {/* Paper */}
        <div
          style={{
            marginTop: 14,
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

          <div style={{ position: "relative", padding: 18, paddingLeft: 78, paddingBottom: 26, fontFamily: theme.paperFont }}>
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
              <span style={{ padding: "4px 8px", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 999, background: "rgba(255,255,255,0.30)" }}>
                Player File
              </span>
              <span>·</span>
              <span>File Type: Intake</span>
              <span>·</span>
              <span>Status: {player.intake_complete ? "Complete" : "In Progress"}</span>
              {dirty ? (
                <>
                  <span>·</span>
                  <span style={{ color: "rgba(117,29,47,0.9)" }}>Unsaved changes</span>
                </>
              ) : null}
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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
                <h2 style={{ margin: "8px 0 0 0", fontSize: 28, letterSpacing: "0.2px" }}>{player.name}</h2>
              </div>

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
                  <span style={{ textDecoration: "underline" }}>{player.code}</span>
                </div>

                {lastSavedTs ? (
                  <div style={{ marginTop: 6, fontFamily: theme.labelFont, fontSize: 11, opacity: 0.7 }}>
                    Last saved: {formatTime(lastSavedTs)} ({relativeTime(lastSavedTs)})
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontFamily: theme.labelFont, fontSize: 11, opacity: 0.7 }}>
                    Tip: Ctrl/Cmd+S saves
                  </div>
                )}
              </div>
            </div>

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
                label="In group settings, you tend to be…"
                name="group_role"
                value={groupRole}
                options={[...ROLE_OPTIONS]}
                onChange={setGroupRole}
                otherValue={groupRoleOther}
                onOtherChange={setGroupRoleOther}
                paperFont={theme.paperFont}
              />

              <RadioRow
                label="When tension rises, you usually…"
                name="conflict_style"
                value={conflictStyle}
                options={[...CONFLICT_OPTIONS]}
                onChange={setConflictStyle}
                otherValue={conflictOther}
                onOtherChange={setConflictOther}
                paperFont={theme.paperFont}
              />

              <RadioRow
                label="Your presence usually feels…"
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
              <TextField
                label="Hobby people associate with you"
                value={associatedHobby}
                onChange={setAssociatedHobby}
                paperFont={theme.paperFont}
                placeholder="e.g. baking, golf, gaming, hiking…"
              />
              <TextField
                label="Comfort habit when stressed"
                value={comfortHabit}
                onChange={setComfortHabit}
                paperFont={theme.paperFont}
                placeholder="e.g. refills drink, checks phone, paces…"
              />

              <RadioRow
                label="People joke that you usually…"
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

                <TextField
                  label="Other boundary (optional)"
                  value={boundariesOther}
                  onChange={setBoundariesOther}
                  paperFont={theme.paperFont}
                  placeholder="Anything else to avoid…"
                />
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
                  placeholder="Inside jokes to avoid, comfort level, anything helpful…"
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
                title="Saves answers and marks you complete"
              >
                {saving ? "Saving…" : "Save Intake (marks complete ✅)"}
              </button>

              <div style={{ marginLeft: "auto", fontFamily: theme.labelFont, fontSize: 12, opacity: 0.75 }}>
                {dirty ? "● Draft not saved" : "✓ File up to date"}
              </div>
            </div>

            <div style={{ marginTop: 10, fontFamily: theme.sans, fontSize: 12, opacity: 0.75 }}>
              Required to save: complete the 3 Group Personality rows. Shortcut: <b>Ctrl/Cmd+S</b>
            </div>
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

        <p style={{ marginTop: 12, color: theme.faint, fontSize: 12, textAlign: "center", fontFamily: theme.sans }}>
          Your answers personalize narration and private prompts. You won’t see future rounds early.
        </p>
      </div>
    </main>
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
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  paperFont: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8, fontFamily: props.paperFont }}>
      <div style={{ fontWeight: 900 }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
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
