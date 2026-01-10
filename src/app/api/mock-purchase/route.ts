import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { sendPurchaseEmail } from "@/lib/email";

function makeRedeemCode() {
  // Example: DA-8H2KQ7
  const raw = nanoid(10).toUpperCase().replace(/[-_]/g, "");
  return `DA-${raw.slice(0, 6)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[mock-purchase] body:", body);

    const packSize = Number(body?.packSize);
    const emailRaw = body?.email;

    // Normalize email to string
    const email =
      typeof emailRaw === "string"
        ? emailRaw.trim()
        : emailRaw == null
        ? ""
        : String(emailRaw).trim();

    console.log("[mock-purchase] packSize:", packSize);
    console.log("[mock-purchase] email parsed:", email);

    if (!Number.isFinite(packSize) || packSize < 6 || packSize > 12) {
      return NextResponse.json({ error: "Invalid pack size" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.log("[mock-purchase] missing env:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
      });
      return NextResponse.json(
        { error: "Server not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Create game (same shape as your /create page)
    const hostPin = nanoid(8);

    const { data: game, error: gErr } = await supabase
      .from("games")
      .insert({
        host_pin: hostPin,
        player_count: packSize,
        status: "setup",
        current_round: 0,
        story_generated: false,
      })
      .select("id, host_pin, player_count")
      .single();

    if (gErr || !game) {
      console.log("[mock-purchase] game create error:", gErr);
      return NextResponse.json({ error: gErr?.message ?? "Failed to create game" }, { status: 500 });
    }

    console.log("[mock-purchase] game created:", game);

    // 2) Create purchase record with redeem code (retry on collision)
    let redeemCode = makeRedeemCode();

    for (let i = 0; i < 5; i++) {
      const { error: pErr } = await supabase.from("purchases").insert({
        redeem_code: redeemCode,
        pack_size: packSize,
        status: "paid",
        game_id: game.id,
        email: email || null,
      });

      if (!pErr) {
        console.log("[mock-purchase] purchase created with code:", redeemCode);
        break;
      }

      console.log("[mock-purchase] purchase insert error:", pErr);

      // 23505 = unique violation (redeem_code collision)
      if ((pErr as any)?.code === "23505") {
        redeemCode = makeRedeemCode();
        continue;
      }

      return NextResponse.json({ error: pErr.message ?? "Failed to create purchase" }, { status: 500 });
    }

    // 3) Email (best-effort; do not fail purchase if email fails)
    if (email) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const setupUrl = `${baseUrl}/setup/${game.id}?pin=${game.host_pin}`;
      const hostUrl = `${baseUrl}/host/${game.id}?pin=${game.host_pin}`;

      console.log("[mock-purchase] attempting to send email to:", email);
      console.log("[mock-purchase] from:", process.env.RESEND_FROM_EMAIL);
      console.log("[mock-purchase] setupUrl:", setupUrl);

      try {
        const result = await sendPurchaseEmail({
         to: email,
         redeemCode,
         setupUrl,
         players: packSize,
       });


        console.log("[mock-purchase] resend result:", result);
      } catch (e: any) {
        console.error("[mock-purchase] Email send failed:", e?.message ?? e);
      }
    } else {
      console.log("[mock-purchase] no email provided; skipping send");
    }

    // 4) Return payload used by /pricing -> /purchase/success
    return NextResponse.json({
      redeemCode,
      gameId: game.id,
      hostPin: game.host_pin,
      playerCount: game.player_count,
    });
  } catch (e: any) {
    console.error("[mock-purchase] handler error:", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
