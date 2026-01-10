import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function safeJson(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const gameId = typeof body?.gameId === "string" ? body.gameId : null;

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    const supabaseUrl = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Fetch all players for the game
    const { data: players, error: pErr } = await supabase
      .from("players")
      .select("id, name, code, intake_complete, intake_json, player_index, intake_mode, intake_status, invite_email, invite_phone, created_at")
      .eq("game_id", gameId)
      .order("player_index", { ascending: true });

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ error: "No players found for this game" }, { status: 404 });
    }

    const total = players.length;
    const complete = players.filter((p) => p.intake_complete).length;

    // Not ready yet: return counts for debugging/UX
    if (complete < total) {
      return NextResponse.json({ ok: true, ready: false, total, complete });
    }

    // 2) Prevent duplicate notifications
    // If row already exists due to race, insert will fail with unique violation
    const { error: nErr } = await supabase.from("admin_notifications").insert({
      game_id: gameId,
      type: "intakes_complete",
    });

    // Unique violation means someone already sent it; treat as OK
    if (nErr && (nErr as any)?.code !== "23505") {
      return NextResponse.json({ error: nErr.message }, { status: 500 });
    }

    // If duplicate, exit gracefully
    if (nErr && (nErr as any)?.code === "23505") {
      return NextResponse.json({ ok: true, ready: true, alreadyNotified: true, total, complete });
    }

    // 3) Send admin email with all intake data
    const resendKey = mustEnv("RESEND_API_KEY");
    const from = mustEnv("RESEND_FROM_EMAIL");
    const adminTo = mustEnv("ADMIN_NOTIFY_EMAIL");

    const resend = new Resend(resendKey);

    const subject = `Dead Air — Intakes complete (${complete}/${total}) — Game ${gameId.slice(0, 8)}`;

    const intakeSummary = players.map((p) => ({
      name: p.name,
      code: p.code,
      player_index: p.player_index,
      intake_complete: p.intake_complete,
      intake_mode: p.intake_mode,
      intake_status: p.intake_status,
      invite_email: p.invite_email,
      invite_phone: p.invite_phone,
      intake_json: p.intake_json,
    }));

    const jsonText = safeJson(intakeSummary);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const hostLinkHint = `${baseUrl}/host/${gameId}`;

    await resend.emails.send({
      from,
      to: adminTo,
      subject,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.55">
          <h2 style="margin:0 0 10px">Intakes complete</h2>
          <p style="margin:0 0 6px"><b>Game:</b> ${gameId}</p>
          <p style="margin:0 0 14px"><b>Players:</b> ${complete}/${total}</p>
          <p style="margin:0 0 14px;color:#555">
            Next step: generate the story with OpenAI using the intake payload below.
          </p>

          <p style="margin:0 0 6px"><b>Host link (for reference):</b></p>
          <p style="margin:0 0 14px"><a href="${hostLinkHint}">${hostLinkHint}</a></p>

          <p style="margin:0 0 6px"><b>Intake payload:</b></p>
          <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:10px;border:1px solid #eee;font-size:12px">${jsonText}</pre>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, ready: true, total, complete, notified: true });
  } catch (e: any) {
    console.error("[after-submit] error:", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
