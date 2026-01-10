// app/host/access/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeCode(input: string) {
  return (input ?? "").trim().toUpperCase();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const codeRaw = url.searchParams.get("code") || "";
  const code = normalizeCode(codeRaw);

  if (!code) {
    return NextResponse.redirect(new URL("/#host", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.redirect(new URL("/#host", origin));
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Find purchase by purchase code
  const { data: purchase, error: pErr } = await admin
    .from("purchases")
    .select("game_id")
    .eq("code", code)
    .maybeSingle();

  if (pErr || !purchase?.game_id) {
    return NextResponse.redirect(new URL("/#host?err=invalid_code", origin));
  }

  // Find game + host pin
  const { data: game, error: gErr } = await admin
    .from("games")
    .select("id, host_pin")
    .eq("id", purchase.game_id)
    .maybeSingle();

  if (gErr || !game?.id || !game?.host_pin) {
    return NextResponse.redirect(new URL("/#host?err=missing_game", origin));
  }

  // Redirect host into the dashboard
  return NextResponse.redirect(
    new URL(`/host/${game.id}?pin=${encodeURIComponent(game.host_pin)}`, origin)
  );
}
