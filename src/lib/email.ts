import { Resend } from "resend";

export async function sendPurchaseEmail(args: {
  to: string;
  redeemCode: string;
  setupUrl: string;
  players: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY in .env.local");
  if (!from) throw new Error("Missing RESEND_FROM_EMAIL in .env.local");

  const resend = new Resend(apiKey);

  const { to, redeemCode, setupUrl, players } = args;

  const subject = `Dead Air — Your code: ${redeemCode}`;

  const html = `
  <div style="background:#07070a;padding:24px">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden">
      <div style="padding:20px 20px 16px;background:linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.28));color:rgba(255,255,255,0.92);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;font-weight:800">
          Dead Air
        </div>

        <h1 style="margin:10px 0 0;font-size:20px;letter-spacing:0.2px">
          Your game is ready.
        </h1>

        <p style="margin:10px 0 0;opacity:0.78;line-height:1.6;font-size:14px">
          ${players} players. Host-paced. Audio-first.<br/>
          No eliminations. Only consequences.
        </p>
      </div>

      <div style="padding:18px 20px;background:rgba(0,0,0,0.35);color:rgba(255,255,255,0.92);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
        <p style="margin:0 0 8px;font-size:13px;opacity:0.78">
          Purchase code (save this):
        </p>

        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="padding:12px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.35);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:16px;letter-spacing:0.5px">
            ${redeemCode}
          </div>
        </div>

        <div style="margin-top:14px;padding:14px;border:1px solid rgba(255,255,255,0.10);border-radius:14px;background:rgba(255,255,255,0.04)">
          <p style="margin:0 0 8px;font-size:13px;opacity:0.85">
            Next step (do this first):
          </p>

          <a href="${setupUrl}"
             style="display:inline-block;padding:10px 12px;border-radius:12px;border:1px solid rgba(177,29,42,0.55);background:linear-gradient(180deg, rgba(177,29,42,0.24), rgba(177,29,42,0.12));color:rgba(255,255,255,0.92);text-decoration:none;font-weight:900;text-transform:uppercase;letter-spacing:0.6px;font-size:12px">
            Open Host Setup
          </a>

          <p style="margin:10px 0 0;font-size:12px;opacity:0.7;line-height:1.6">
            The setup link creates your players and prepares the rounds.<br/>
            The dashboard comes later. It will still be there. Unfortunately.
          </p>
        </div>

        <p style="margin:14px 0 0;font-size:12px;opacity:0.7;line-height:1.6">
          Lost the link? Go to <span style="font-family:ui-monospace,Menlo,Consolas,monospace">/start</span> and enter the purchase code.
        </p>
      </div>

      <div style="padding:14px 20px;background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.60);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:11px;line-height:1.6">
        If you didn’t buy this, someone you know did. That tracks.
      </div>
    </div>
  </div>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  return result;
}
