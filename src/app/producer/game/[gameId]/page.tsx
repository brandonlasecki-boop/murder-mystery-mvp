"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function clean(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function safe(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return "{}";
  }
}

export default function ProducerGamePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const gameId = (params.gameId as string) || "";
  const key = searchParams.get("key") || "";

  // ✅ Change this to any secret you want (and don’t share it)
  const PRODUCER_KEY = "letmein";

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const authed = key === PRODUCER_KEY;

  async function load() {
    if (!gameId || !authed) return;
    setLoading(true);

    const { data: g, error: gErr } = await supabase
      .from("games")
      .select("id, current_round, story_generated, created_at")
      .eq("id", gameId)
      .single();

    if (gErr || !g) {
      setGame(null);
      setPlayers([]);
      setLoading(false);
      return;
    }

    const { data: ps, error: pErr } = await supabase
      .from("players")
      .select("id,name,code,intake_complete,intake_json,created_at")
      .eq("game_id", gameId)
      .order("created_at");

    if (pErr) {
      setGame(g);
      setPlayers([]);
      setLoading(false);
      return;
    }

    setGame(g);
    setPlayers(ps ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, authed]);

  const intakeTotal = players.length;
  const intakeCompleted = players.filter((p) => !!p.intake_complete).length;

  const exportPackage = useMemo(() => {
    const pack = {
      gameId,
      roundCount: 4, // change if needed
      rules: [
        "Do not reveal future rounds.",
        "Narration is audio-first (ElevenLabs cadence).",
        "Each round needs: narration_text + each player's private_text.",
        "Use intake_json fields to personalize.",
      ],
      players: players.map((p) => ({
        name: p.name,
        code: p.code,
        intake_complete: !!p.intake_complete,
        intake: p.intake_json ?? {},
      })),
    };
    return pack;
  }, [gameId, players]);

  async function copyToClipboard() {
    const text =
      `MURDER MYSTERY INTAKE EXPORT\n` +
      `Game ID: ${gameId}\n` +
      `Players: ${intakeCompleted}/${intakeTotal} complete\n\n` +
      `=== COPY THIS JSON INTO CHATGPT ===\n` +
      safe(exportPackage);

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (!gameId) return <main style={{ padding: 16 }}>Missing gameId.</main>;

  if (!authed) {
    return (
      <main style={{ padding: 16, maxWidth: 900, margin: "40px auto" }}>
        <h2>Producer Access</h2>
        <p>Missing or invalid key.</p>
        <p>
          Add <code>?key=...</code> to the URL.
        </p>
        <p>
          Example: <code>/producer/game/{gameId}?key=letmein</code>
        </p>
      </main>
    );
  }

  if (loading) return <main style={{ padding: 16 }}>Loading…</main>;

  if (!game) {
    return (
      <main style={{ padding: 16, maxWidth: 900, margin: "40px auto" }}>
        <h2>Game not found</h2>
        <p>gameId: {gameId}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 1100, margin: "40px auto" }}>
      <h2>Producer Export</h2>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <p style={{ margin: 0 }}>
          <b>Game ID:</b> {gameId}
        </p>
        <p style={{ margin: "6px 0 0 0" }}>
          <b>Intake completion:</b> {intakeCompleted}/{intakeTotal}
        </p>
        <p style={{ margin: "6px 0 0 0" }}>
          <b>Story generated:</b> {game.story_generated ? "✅ true" : "❌ false"}
        </p>

        <button
          onClick={copyToClipboard}
          style={{ marginTop: 10, padding: "10px 12px" }}
          disabled={intakeTotal === 0}
        >
          {copied ? "Copied ✅" : "Copy Intake Export for ChatGPT"}
        </button>
      </div>

      <h3 style={{ marginTop: 16 }}>Preview</h3>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#f6f6f6",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #eee",
        }}
      >
        {safe(exportPackage)}
      </pre>

      <h3>Players</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            <b>{p.name}</b> — code: {p.code} — intake: {p.intake_complete ? "✅" : "❌"}
          </li>
        ))}
      </ul>
    </main>
  );
}
