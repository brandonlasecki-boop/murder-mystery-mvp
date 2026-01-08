"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

const JOKE_TRAIT_OPTIONS = [
  "Overprepare",
  "Wing it",
  "Overthink",
  "Forget details",
  "Get competitive",
  "Stay chill",
] as const;

const NIGHT_VIBE_OPTIONS = [
  "Loud music",
  "Quiet background",
  "Food smells",
  "Outside air",
  "Screens",
  "Chaos",
] as const;

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

export default function HostIntakePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const gameId = (params.gameId as string) || "";
  const pin = searchParams.get("pin") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

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
      .select("id,name,code,intake_complete,intake_json")
      .eq("game_id", gameId)
      .order("created_at");

    if (pErr) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setPlayers(ps ?? []);

    // auto-select first
    const firstId = (ps ?? [])[0]?.id;
    if (!selectedPlayerId && firstId) {
      setSelectedPlayerId(firstId);
      hydrateFromIntake(((ps ?? [])[0]?.intake_json ?? null) as IntakeJson | null);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    if (!selectedPlayer) return;
    hydrateFromIntake((selectedPlayer.intake_json ?? null) as IntakeJson | null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId]);

  const pinOk = !!game && !!pin && pin === game.host_pin;

  function toggleBoundary(val: string) {
    setBoundaries((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
  }

  async function save() {
    if (!selectedPlayer) return;

    if (!pinOk) {
      alert("Wrong or missing host PIN. Use the link with ?pin=...");
      return;
    }

    if (!intakeJson.group_role || !intakeJson.conflict_style || !intakeJson.presence) {
      alert("Please answer the 3 Group Personality questions (one per row).");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({
          intake_json: intakeJson,
          intake_complete: true,
        })
        .eq("id", selectedPlayer.id);

      if (error) throw error;

      await load();
      alert("Saved ✅");
    } catch (e: any) {
      alert(e?.message ?? "Failed to save intake");
    } finally {
      setSaving(false);
    }
  }

  const theme = useMemo(() => {
    return {
      bg: "radial-gradient(1200px circle at 18% 12%, rgba(117,29,47,0.35), transparent 55%), radial-gradient(900px circle at 85% 30%, rgba(212,175,55,0.12), transparent 55%), linear-gradient(180deg, #0b0d10, #07080a)",
      panel: "rgba(16,18,22,0.76)",
      panelBorder: "rgba(212,175,55,0.20)",
      paper: "linear-gradient(180deg, #f3ead7, #eadbbf)",
      paperBorder: "rgba(90, 62, 26, 0.35)",
      ink: "#1b1b1b",
      cream: "#f7f0df",
      gold: "#d4af37",
      burgundy: "#751d2f",
      muted: "rgba(255,255,255,0.72)",
      faint: "rgba(255,255,255,0.55)",
    };
  }, []);

  const intakeTotal = players.length;
  const intakeCompleted = players.filter((p) => !!p.intake_complete).length;

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;
  if (!game) return <main style={{ padding: 16 }}>Game not found.</main>;

  if (!pinOk) {
    return (
      <main style={{ minHeight: "100vh", background: theme.bg, padding: 18 }}>
        <div style={{ maxWidth: 900, margin: "40px auto", padding: 16, color: theme.cream }}>
          <h2>Host Intake</h2>
          <p>Wrong or missing PIN.</p>
          <p>
            Make sure your URL includes <code>?pin=...</code>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, padding: 18 }}>
      <div style={{ maxWidth: 1180, margin: "24px auto" }}>
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
              <p style={{ margin: "8px 0 0 0", color: theme.muted }}>
                {intakeCompleted}/{intakeTotal} completed · Saving marks <b>intake_complete ✅</b>
              </p>
            </div>

            <div style={{ alignSelf: "center", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`/host/${gameId}?pin=${encodeURIComponent(pin)}`}
                style={{ color: theme.cream, textDecoration: "underline", fontWeight: 800 }}
              >
                ← Back to Host Dashboard
              </a>
            </div>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, marginTop: 14 }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Players</h2>
              <div style={{ fontSize: 12, color: theme.muted }}>Select a file</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {players.map((p) => {
                const active = p.id === selectedPlayerId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    style={{
                      textAlign: "left",
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: `1px solid ${active ? theme.gold : "rgba(255,255,255,0.12)"}`,
                      background: active ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.06)",
                      color: theme.cream,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{p.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>
                      code: {p.code} · intake: {p.intake_complete ? "✅" : "❌"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: theme.paper,
              border: `1px solid ${theme.paperBorder}`,
              boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
              color: theme.ink,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ opacity: 0.7, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", fontSize: 12 }}>
                  Editing
                </div>
                <h2 style={{ margin: "6px 0 0 0" }}>{selectedPlayer?.name ?? "Select a player"}</h2>
              </div>

              {selectedPlayer ? (
                <div style={{ alignSelf: "center", fontWeight: 900 }}>
                  CODE: <span style={{ textDecoration: "underline" }}>{selectedPlayer.code}</span>
                </div>
              ) : null}
            </div>

            {!selectedPlayer ? (
              <p style={{ marginTop: 12 }}>Select a player on the left to edit their intake.</p>
            ) : (
              <>
                <Section title="Group Personality" subtitle="Pick ONE per row.">
                  <RadioRow
                    label="In group settings, they tend to be…"
                    name="group_role"
                    value={groupRole}
                    options={[...ROLE_OPTIONS]}
                    onChange={setGroupRole}
                    otherValue={groupRoleOther}
                    onOtherChange={setGroupRoleOther}
                  />
                  <RadioRow
                    label="When tension rises, they usually…"
                    name="conflict_style"
                    value={conflictStyle}
                    options={[...CONFLICT_OPTIONS]}
                    onChange={setConflictStyle}
                    otherValue={conflictOther}
                    onOtherChange={setConflictOther}
                  />
                  <RadioRow
                    label="Their presence usually feels…"
                    name="presence"
                    value={presence}
                    options={[...PRESENCE_OPTIONS]}
                    onChange={setPresence}
                    otherValue={presenceOther}
                    onOtherChange={setPresenceOther}
                  />
                </Section>

                <Divider />

                <Section title="Fun / Flavor" subtitle="Short answers are best.">
                  <TextField label="Hobby people associate with them" value={associatedHobby} onChange={setAssociatedHobby} />
                  <TextField label="Comfort habit when stressed" value={comfortHabit} onChange={setComfortHabit} />

                  <RadioRow
                    label="People joke they usually…"
                    name="joke_trait"
                    value={jokeTrait}
                    options={[...JOKE_TRAIT_OPTIONS]}
                    onChange={setJokeTrait}
                    otherValue={jokeOther}
                    onOtherChange={setJokeOther}
                  />

                  <RadioRow
                    label="Night vibe feels best with…"
                    name="night_vibe"
                    value={nightVibe}
                    options={[...NIGHT_VIBE_OPTIONS]}
                    onChange={setNightVibe}
                    otherValue={nightOther}
                    onOtherChange={setNightOther}
                  />
                </Section>

                <Divider />

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
                            border: "1px solid rgba(0,0,0,0.12)",
                            background: "rgba(255,255,255,0.55)",
                          }}
                        >
                          <input type="checkbox" checked={boundaries.includes(b)} onChange={() => toggleBoundary(b)} />
                          <span style={{ fontWeight: 700 }}>{b}</span>
                        </label>
                      ))}
                    </div>

                    <TextField label="Other boundary (optional)" value={boundariesOther} onChange={setBoundariesOther} />
                  </div>
                </Section>

                <Divider />

                <Section title="Anything else we should know?" subtitle="Optional.">
                  <label style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>Notes</div>
                    <textarea
                      value={otherNotes}
                      onChange={(e) => setOtherNotes(e.target.value)}
                      rows={4}
                      style={{
                        padding: "12px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.18)",
                        background: "rgba(255,255,255,0.65)",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </label>
                </Section>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
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
                  >
                    {saving ? "Saving…" : "Save Intake (marks complete ✅)"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(0,0,0,0.12)", margin: "16px 0" }} />;
}

function Section(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{props.title}</h3>
        {props.subtitle ? <div style={{ opacity: 0.8, fontWeight: 800 }}>{props.subtitle}</div> : null}
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 14 }}>{props.children}</div>
    </section>
  );
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 800 }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          padding: "12px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.18)",
          background: "rgba(255,255,255,0.65)",
          fontFamily: "inherit",
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
}) {
  const isOtherSelected = props.value === "__other__";

  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{props.label}</div>

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
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(255,255,255,0.55)",
              }}
            >
              <input
                type="radio"
                name={props.name}
                checked={props.value === opt}
                onChange={() => props.onChange(opt)}
              />
              <span style={{ fontWeight: 700 }}>{opt}</span>
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
            border: "1px solid rgba(0,0,0,0.12)",
            background: "rgba(255,255,255,0.55)",
            maxWidth: 420,
          }}
        >
          <input
            type="radio"
            name={props.name}
            checked={isOtherSelected}
            onChange={() => props.onChange("__other__")}
          />
          <span style={{ fontWeight: 700 }}>Other</span>
        </label>

        {isOtherSelected && (
          <input
            value={props.otherValue}
            onChange={(e) => props.onOtherChange(e.target.value)}
            placeholder="Type your own…"
            style={{
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "rgba(255,255,255,0.65)",
              fontFamily: "inherit",
              maxWidth: 520,
            }}
          />
        )}
      </div>
    </div>
  );
}
