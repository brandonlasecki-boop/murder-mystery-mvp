"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RadioValue = string;

type IntakeJson = {
  group_role?: RadioValue; // Leader | Mediator | Joker | Observer | Wildcard | Other: ...
  conflict_style?: RadioValue; // Defensive | Quiet | Emotional | Logical | Deflects with humor | Other: ...
  presence?: RadioValue; // In control | Harmless | Intense | Hard to read | Confident | Other: ...

  associated_hobby?: string;
  comfort_habit?: string;
  joke_trait?: RadioValue; // Overprepare | Wing it | Overthink | Forget details | Get competitive | Stay chill | Other: ...
  night_vibe?: RadioValue; // Loud music | Quiet background | Food smells | Outside air | Screens | Chaos | Other: ...

  boundaries?: string[]; // multi
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

// ✅ Type guard fixes the TS narrowing
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

export default function PlayerIntakePage() {
  const params = useParams();
  const code = (params.code as string) || "";

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any>(null);

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

  const [saving, setSaving] = useState(false);

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
    setLoading(false);
  }

  async function save() {
    if (!player) return;

    // Require the 3 personality radios
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
        .eq("id", player.id);

      if (error) throw error;

      await load();
      alert("Saved ✅");
    } catch (e: any) {
      alert(e?.message ?? "Failed to save intake");
    } finally {
      setSaving(false);
    }
  }

  function toggleBoundary(val: string) {
    setBoundaries((prev) => (prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const theme = useMemo(() => {
    // Noir / detective palette: charcoal + gold + deep crimson + paper
    // Inspired by common noir + gold and burgundy-gold palettes. :contentReference[oaicite:1]{index=1}
    return {
      bg: "radial-gradient(1200px circle at 20% 10%, rgba(117,29,47,0.35), transparent 55%), radial-gradient(900px circle at 85% 30%, rgba(212,175,55,0.12), transparent 55%), linear-gradient(180deg, #0b0d10, #07080a)",
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
      inputBg: "rgba(255,255,255,0.06)",
      inputBorder: "rgba(212,175,55,0.22)",
    };
  }, []);

  if (!code) return <main style={{ padding: 16 }}>Missing player code.</main>;
  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;
  if (!player) return <main style={{ padding: 16 }}>Player not found.</main>;

  return (
    <main style={{ minHeight: "100vh", background: theme.bg, padding: 18 }}>
      <div style={{ maxWidth: 860, margin: "24px auto" }}>
        <header
          style={{
            padding: 16,
            borderRadius: 14,
            background: theme.panel,
            border: `1px solid ${theme.panelBorder}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: theme.gold, letterSpacing: 2, fontSize: 12, textTransform: "uppercase" }}>
                Confidential Intake
              </div>
              <h1 style={{ margin: "6px 0 0 0", color: theme.cream, fontSize: 28 }}>
                The Case File
              </h1>
              <p style={{ margin: "8px 0 0 0", color: theme.muted }}>
                Hi <b style={{ color: theme.cream }}>{player.name}</b>. Your answers shape your private prompts and the
                narrator’s tone.
              </p>
            </div>

            <div
              style={{
                alignSelf: "center",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${theme.panelBorder}`,
                color: theme.faint,
                fontSize: 12,
              }}
              title="Your player code"
            >
              CODE: <span style={{ color: theme.cream, fontWeight: 700 }}>{player.code}</span>
            </div>
          </div>
        </header>

        <div
          style={{
            marginTop: 14,
            padding: 16,
            borderRadius: 14,
            background: theme.paper,
            border: `1px solid ${theme.paperBorder}`,
            boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
            color: theme.ink,
          }}
        >
          <Section title="Group Personality" subtitle="Pick ONE per row.">
            <RadioRow
              label="In group settings, you tend to be…"
              name="group_role"
              value={groupRole}
              options={[...ROLE_OPTIONS]}
              onChange={setGroupRole}
              otherValue={groupRoleOther}
              onOtherChange={setGroupRoleOther}
            />

            <RadioRow
              label="When tension rises, you usually…"
              name="conflict_style"
              value={conflictStyle}
              options={[...CONFLICT_OPTIONS]}
              onChange={setConflictStyle}
              otherValue={conflictOther}
              onOtherChange={setConflictOther}
            />

            <RadioRow
              label="Your presence usually feels…"
              name="presence"
              value={presence}
              options={[...PRESENCE_OPTIONS]}
              onChange={setPresence}
              otherValue={presenceOther}
              onOtherChange={setPresenceOther}
            />
          </Section>

          <Divider />

          <Section title="Fun / Flavor" subtitle="Short answers are best (mad-libs layer).">
            <TextField
              label="Hobby people associate with you"
              value={associatedHobby}
              onChange={setAssociatedHobby}
              placeholder="e.g. baking, golf, gaming, hiking…"
            />
            <TextField
              label="Comfort habit when stressed"
              value={comfortHabit}
              onChange={setComfortHabit}
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
                    <span style={{ fontWeight: 600 }}>{b}</span>
                  </label>
                ))}
              </div>

              <TextField
                label="Other boundary (optional)"
                value={boundariesOther}
                onChange={setBoundariesOther}
                placeholder="Anything else to avoid…"
              />
            </div>
          </Section>

          <Divider />

          <Section title="Anything else we should know?" subtitle="Optional. This helps us keep things fun and safe.">
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
                placeholder="Inside jokes to avoid, comfort level, anything helpful…"
              />
            </label>
          </Section>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.25)",
                background: saving ? "rgba(0,0,0,0.12)" : theme.burgundy,
                color: "#fff",
                fontWeight: 800,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 10px 24px rgba(117,29,47,0.25)",
              }}
            >
              {saving ? "Sealing Case File…" : "Save & Seal (marks complete ✅)"}
            </button>

            <a
              href={`/p/${player.code}`}
              style={{
                alignSelf: "center",
                color: theme.ink,
                fontWeight: 800,
                textDecoration: "underline",
              }}
            >
              Go to Player View →
            </a>
          </div>
        </div>

        <p style={{ marginTop: 12, color: theme.faint, fontSize: 12, textAlign: "center" }}>
          Your answers are used to personalize narration and private prompts. No future rounds are shown early.
        </p>
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
        <h2 style={{ margin: 0, fontSize: 20, letterSpacing: 0.3 }}>{props.title}</h2>
        {props.subtitle ? <div style={{ opacity: 0.8, fontWeight: 700 }}>{props.subtitle}</div> : null}
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
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 800 }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
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
