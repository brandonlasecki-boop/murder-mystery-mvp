"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";
import { defaultNarration, defaultPrivatePrompt, roundTitle } from "@/lib/content";

const DEFAULT_PLAYERS = ["Brandon", "Kristen", "Adam", "Heidi", "Tim", "Katie"];
const ROUND_NUMBERS = [1, 2, 3, 4];

export default function CreateGame() {
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [hostPin, setHostPin] = useState<string | null>(null);
  const [codes, setCodes] = useState<{ name: string; code: string }[]>([]);

  async function onCreate() {
    setLoading(true);
    try {
      // 1) Create game
      const pin = nanoid(8);

      const { data: game, error: gErr } = await supabase
        .from("games")
        .insert({ host_pin: pin })
        .select("id, host_pin")
        .single();

      if (gErr || !game) throw gErr ?? new Error("Failed to create game");

      // 2) Create players
      const playerRows = DEFAULT_PLAYERS.map((name) => ({
        game_id: game.id,
        name,
        code: nanoid(7),
      }));

      const { data: players, error: pErr } = await supabase
        .from("players")
        .insert(playerRows)
        .select("id, name, code, game_id");

      if (pErr || !players) throw pErr ?? new Error("Failed to create players");

      // 3) Seed rounds
      const roundRows = ROUND_NUMBERS.map((n) => ({
        game_id: game.id,
        round_number: n,
        title: roundTitle(n),
        narration_text: defaultNarration(n),
      }));

      const { error: rErr } = await supabase.from("rounds").insert(roundRows);
      if (rErr) throw rErr;

      // 4) Seed private prompts
      const prcRows = (players as any[]).flatMap((pl: any) =>
        ROUND_NUMBERS.map((n) => ({
          game_id: game.id,
          player_id: pl.id,
          round_number: n,
          private_text: defaultPrivatePrompt(n, pl.name),
        }))
      );

      const { error: prcErr } = await supabase.from("player_round_content").insert(prcRows);
      if (prcErr) throw prcErr;

      setGameId(game.id);
      setHostPin(pin);
      setCodes((players as any[]).map((p: any) => ({ name: p.name, code: p.code })));
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to create game.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h2>Create Game Room</h2>
      <p>Creates a game + 6 player codes + 4 rounds with placeholder content.</p>

      <button onClick={onCreate} disabled={loading}>
        {loading ? "Creating..." : "Create Game Room"}
      </button>

      {gameId && hostPin && (
        <>
          <hr style={{ margin: "24px 0" }} />

          <h3>Host Dashboard</h3>
          <p>
            Open this link:
            <br />
            <a href={`/host/${gameId}?pin=${hostPin}`}>
              /host/{gameId}?pin={hostPin}
            </a>
          </p>

          <h3>Player Codes</h3>
          <ul>
            {codes.map((c) => (
              <li key={c.code}>
                <b>{c.name}</b>: {c.code} — <a href={`/p/${c.code}`}>player page</a>
              </li>
            ))}
          </ul>

          <p style={{ marginTop: 16 }}>
            Player code entry page: <a href="/join">/join</a>
          </p>
        </>
      )}
    </main>
  );
}
