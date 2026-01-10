"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export default function CreateGame() {
  const [loading, setLoading] = useState(false);
  const [playerCount, setPlayerCount] = useState<number>(6);

  const [gameId, setGameId] = useState<string | null>(null);
  const [hostPin, setHostPin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onCreate() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const pin = nanoid(8);

      // Create ONLY the game.
      // Requires games.host_pin and games.player_count columns.
      // status is optional — if your table doesn't have it, remove that field.
      const { data: game, error: gErr } = await supabase
        .from("games")
        .insert({
          host_pin: pin,
          player_count: playerCount,
          status: "setup",
          current_round: 0,
          story_generated: false,
        })
        .select("id, host_pin, player_count")
        .single();

      if (gErr || !game) throw gErr ?? new Error("Failed to create game");

      setGameId(game.id);
      setHostPin(game.host_pin);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Failed to create game.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h2>Create Game</h2>
      <p>
        Choose the number of players. This creates the game and gives you the host Setup link.
        <br />
        Players and story content are created later during Setup / Intake.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Player count:
          <select
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            style={{ padding: "6px 8px" }}
            disabled={loading}
          >
            {Array.from({ length: 7 }, (_, i) => i + 6).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button onClick={onCreate} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Creating..." : "Create Game"}
        </button>
      </div>

      {errorMsg && (
        <div style={{ marginTop: 14, color: "crimson" }}>
          {errorMsg}
        </div>
      )}

      {gameId && hostPin && (
        <>
          <hr style={{ margin: "24px 0" }} />

          <h3>Host Setup Link (send this to host)</h3>
          <p>
            <a href={`/setup/${gameId}?pin=${hostPin}`}>
              /setup/{gameId}?pin={hostPin}
            </a>
          </p>

          <h3>Host Dashboard Link</h3>
          <p>
            <a href={`/host/${gameId}?pin=${hostPin}`}>
              /host/{gameId}?pin={hostPin}
            </a>
          </p>

          <p style={{ marginTop: 16, opacity: 0.8 }}>
            Note: Players will be created on the Setup page.
          </p>
        </>
      )}
    </main>
  );
}
