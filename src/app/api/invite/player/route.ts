import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { headers } from "next/headers";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function getBaseUrl() {
  // Prefer explicit public URL if you set it (best for production)
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");

  // Vercel preview/prod
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  // Local dev / fallback: App Router headers() is async
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

// tiny helper (avoid HTML injection in name)
function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const gameId = String(body?.gameId ?? "");
    const playerId = String(body?.playerId ?? "");
    const emailRaw = body?.email ? String(body.email) : "";

    if (!gameId || !playerId) {
      return NextResponse.json({ error: "Missing gameId or playerId" }, { status: 400 });
    }

    const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = requireEnv("RESEND_API_KEY");

    // In dev you can use onboarding@resend.dev.
    // In production, set RESEND_FROM_EMAIL to a verified domain sender.
    const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Load player and ensure belongs to game
    const { data: player, error: pErr } = await supabaseAdmin
      .from("players")
      .select("id, game_id, name, code, invite_email, intake_complete")
      .eq("id", playerId)
      .single();

    if (pErr || !player) {
      return NextResponse.json({ error: pErr?.message ?? "Player not found" }, { status: 404 });
    }

    if (player.game_id !== gameId) {
      return NextResponse.json({ error: "Player does not belong to this game" }, { status: 403 });
    }

    // Determine recipient email:
    const email = (emailRaw || player.invite_email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "No email on file for this player" }, { status: 400 });
    }

    // If host supplied a new email, store it
    if (emailRaw && emailRaw.trim() && emailRaw.trim() !== (player.invite_email ?? "").trim()) {
      const { error: uErr } = await supabaseAdmin
        .from("players")
        .update({ invite_email: email })
        .eq("id", playerId);

      if (uErr) {
        return NextResponse.json({ error: uErr.message }, { status: 500 });
      }
    }

    const baseUrl = await getBaseUrl();
    const intakeUrl = `${baseUrl}/intake/p/${encodeURIComponent(player.code)}`;

    const resend = new Resend(RESEND_API_KEY);

    const subject = `Your Dead Air intake form (${player.name})`;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #111;">
        <h2 style="margin:0 0 10px 0;">Dead Air — Intake Form</h2>
        <p style="margin:0 0 14px 0;">
          Hi ${escapeHtml(player.name ?? "there")} — you’ve been invited to complete your intake.
        </p>
        <p style="margin:0 0 14px 0;">
          This takes ~2 minutes. Your answers personalize narration and private prompts.
        </p>
        <p style="margin:0 0 18px 0;">
          <a href="${intakeUrl}" style="display:inline-block; padding:10px 14px; background:#111; color:#fff; text-decoration:none; border-radius:10px;">
            Open intake form
          </a>
        </p>
        <p style="margin:0; font-size:12px; color:#555;">
          If the button doesn’t work, paste this link into your browser:<br/>
          <span style="word-break:break-all;">${intakeUrl}</span>
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      email,
      messageId: data?.id ?? null,
      intakeUrl,
    });
  } catch (e: any) {
    console.error("[invite/player] error:", e);
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
