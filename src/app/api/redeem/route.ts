import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalized = code.trim().toUpperCase();

    // We join purchases -> games to fetch host_pin for direct access
    const { data, error } = await supabase
      .from("purchases")
      .select("status, game:game_id ( id, host_pin )")
      .eq("redeem_code", normalized)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || !data.game) return NextResponse.json({ error: "Code not found" }, { status: 404 });
    if (data.status !== "paid") return NextResponse.json({ error: "Code not active" }, { status: 403 });

    const gameId = (data.game as any).id as string;
    const hostPin = (data.game as any).host_pin as string;

    return NextResponse.json({ gameId, hostPin });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
