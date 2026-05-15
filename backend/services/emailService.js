/**
 * CronAi Aethel — Email Service (Resend)
 *
 * Sends transactional emails via Resend's REST API.
 * Works natively in Cloudflare Workers (no Node.js APIs needed).
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 *
 * Required secret: RESEND_API_KEY
 * From address:    Set RESEND_FROM_EMAIL in wrangler.toml vars
 *                  Must use a verified domain on your Resend account.
 *                  Default: onboarding@resend.dev (works on free tier — Resend's own domain)
 */

const RESEND_API = 'https://api.resend.com/emails';

/**
 * Low-level send — all other functions call this.
 * Returns { id } on success, null on failure (non-fatal).
 */
async function send({ to, subject, html, text }, env) {
  const apiKey = env?.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[EmailService] RESEND_API_KEY not set — email skipped');
    return null;
  }

  const from = env?.RESEND_FROM_EMAIL || 'CronAi Aethel <onboarding@resend.dev>';

  try {
    console.log('[EmailService] Sending email to:', to, 'Subject:', subject);
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, text }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[EmailService] Resend error ${res.status}:`, err);
      return null;
    }

    const data = await res.json();
    console.log('[EmailService] Email sent successfully:', data);
    return data; // { id: 're_...' }
  } catch (err) {
    console.warn('[EmailService] Failed to send email:', err.message, err);
    return null; // always non-fatal
  }
}

/* ── Welcome Email ────────────────────────────────────────────────────────── */
/**
 * Send a welcome email after a user registers.
 * @param {{ email: string, username: string, referral_code: string }} user
 * @param {object} env — Cloudflare Worker env
 */
export async function sendWelcomeEmail(user, env) {
  const baseUrl = env?.BASE_URL || 'https://cronai-aethel-frontend.pages.dev';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:560px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d0d18 0%,#1a1428 100%);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(200,169,111,0.15);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#c8a96f;">CronAi Aethel</p>
          <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Welcome, ${user.username}.</h1>
          <p style="margin:12px 0 0;font-size:14px;color:rgba(232,232,240,0.6);">Your AI video studio is ready.</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(232,232,240,0.85);">
            You now have access to <strong style="color:#c8a96f;">8 emotional video templates</strong>, an AI pipeline powered by Gemini + DeepSeek, and cinematic rendering via Runway.
          </p>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(232,232,240,0.85);">
            Your plan: <strong style="color:#fff;">Basic</strong> — 5 videos/month. Create your first video now.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
            <tr><td align="center" style="background:linear-gradient(135deg,#c8a96f,#a07840);border-radius:10px;padding:1px;">
              <a href="${baseUrl}/create" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#1a1428,#0d0d18);border-radius:9px;text-decoration:none;font-size:14px;font-weight:700;color:#c8a96f;letter-spacing:0.04em;">
                Create Your First Video →
              </a>
            </td></tr>
          </table>

          <!-- Referral -->
          <div style="background:rgba(200,169,111,0.06);border:1px solid rgba(200,169,111,0.15);border-radius:10px;padding:20px 24px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c8a96f;font-weight:700;">Your Referral Code</p>
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#fff;letter-spacing:0.08em;font-family:monospace;">${user.referral_code}</p>
            <p style="margin:0;font-size:13px;color:rgba(232,232,240,0.55);">Share it. Earn tokens when someone signs up with your code.</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(232,232,240,0.3);">
            CronAi Aethel · <a href="${baseUrl}" style="color:rgba(200,169,111,0.5);text-decoration:none;">${baseUrl.replace('https://', '')}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Welcome to CronAi Aethel, ${user.username}!\n\nYour AI video studio is ready. Create your first video: ${baseUrl}/create\n\nYour referral code: ${user.referral_code}\n\nShare it to earn tokens when someone signs up.`;

  console.log('[EmailService] Attempting to send welcome email to:', user.email);
  return send({ to: user.email, subject: 'Your CronAi Aethel studio is ready', html, text }, env);
}

/* ── Video Ready Email ────────────────────────────────────────────────────── */
/**
 * Notify the user their video has finished processing.
 * @param {{ email: string, username: string }} user
 * @param {{ title: string, template: string, id: string, resolution: string }} video
 * @param {object} env
 */
export async function sendVideoReadyEmail(user, video, env) {
  const baseUrl = env?.BASE_URL || 'https://cronai-aethel-frontend.pages.dev';
  const videoUrl = `${baseUrl}/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:560px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d0d18 0%,#1a1428 100%);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(200,169,111,0.15);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#c8a96f;">CronAi Aethel</p>
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Your video is ready.</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">

          <!-- Video details -->
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(232,232,240,0.4);">Video</p>
            <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#fff;">${video.title}</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <span style="font-size:12px;color:rgba(200,169,111,0.8);background:rgba(200,169,111,0.08);border:1px solid rgba(200,169,111,0.2);padding:3px 10px;border-radius:99px;">${video.template}</span>
              <span style="font-size:12px;color:rgba(232,232,240,0.5);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);padding:3px 10px;border-radius:99px;">${video.resolution || 'HD'}</span>
            </div>
          </div>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(232,232,240,0.8);">
            Your cinematic video has been generated. Head to your dashboard to preview, download, or share it.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td align="center" style="background:linear-gradient(135deg,#c8a96f,#a07840);border-radius:10px;padding:1px;">
              <a href="${videoUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#1a1428,#0d0d18);border-radius:9px;text-decoration:none;font-size:14px;font-weight:700;color:#c8a96f;letter-spacing:0.04em;">
                View Your Video →
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(232,232,240,0.3);">
            CronAi Aethel · <a href="${baseUrl}" style="color:rgba(200,169,111,0.5);text-decoration:none;">${baseUrl.replace('https://', '')}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Your video "${video.title}" is ready!\n\nTemplate: ${video.template} | Resolution: ${video.resolution || 'HD'}\n\nView it here: ${videoUrl}`;

  return send({
    to: user.email,
    subject: `✦ Your video is ready — ${video.title}`,
    html,
    text,
  }, env);
}

/* ── Subscription Confirmation Email ─────────────────────────────────────── */
/**
 * Confirm a new/upgraded subscription.
 * @param {{ email: string, username: string }} user
 * @param {{ tier: string, videos_remaining: number }} subscription
 * @param {object} env
 */
export async function sendSubscriptionEmail(user, subscription, env) {
  const baseUrl = env?.BASE_URL || 'https://cronai-aethel-frontend.pages.dev';

  const perks = {
    Basic: '5 videos/month · HD quality · All 8 templates',
    Pro: '15 videos/month · HD quality · Priority queue',
    Premium: 'Unlimited videos · 4K quality · Priority queue · All features',
  };

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:560px;">
        <tr><td style="padding:40px;text-align:center;border-bottom:1px solid rgba(200,169,111,0.15);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#c8a96f;">Subscription Active</p>
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">${subscription.tier} Plan</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:rgba(232,232,240,0.8);">Hi ${user.username}, your <strong style="color:#fff;">${subscription.tier}</strong> subscription is now active.</p>
          <div style="background:rgba(200,169,111,0.06);border:1px solid rgba(200,169,111,0.15);border-radius:10px;padding:20px 24px;margin-bottom:28px;">
            <p style="margin:0;font-size:14px;color:rgba(232,232,240,0.7);">${perks[subscription.tier] || subscription.tier}</p>
          </div>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:linear-gradient(135deg,#c8a96f,#a07840);border-radius:10px;padding:1px;">
            <a href="${baseUrl}/create" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#1a1428,#0d0d18);border-radius:9px;text-decoration:none;font-size:14px;font-weight:700;color:#c8a96f;">
              Start Creating →
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(232,232,240,0.3);">CronAi Aethel</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Your ${subscription.tier} plan is active!\n\n${perks[subscription.tier] || ''}\n\nStart creating: ${baseUrl}/create`;

  return send({ to: user.email, subject: `Your ${subscription.tier} plan is active — CronAi Aethel`, html, text }, env);
}

/* ── Password Reset Email ─────────────────────────────────────────────────── */
export async function sendPasswordResetEmail({ email, username, resetUrl }, env) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#0d0d18 0%,#1a1428 100%);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(200,169,111,0.15);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#c8a96f;">CronAi Aethel</p>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Reset your password</h1>
          <p style="margin:12px 0 0;font-size:14px;color:rgba(232,232,240,0.6);">Hi ${username}, we got your request.</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(232,232,240,0.8);">
            Click the button below to set a new password. This link expires in <strong style="color:#c8a96f;">1 hour</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 28px;">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#c8a96f,#b8923a);color:#0a0a10;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none;letter-spacing:0.03em;">
              Reset Password
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:12px;color:rgba(232,232,240,0.4);line-height:1.6;">
            If you didn't request this, you can safely ignore this email. Your password won't change.<br>
            Link not working? Copy and paste this URL into your browser:<br>
            <span style="color:#c8a96f;word-break:break-all;">${resetUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:11px;color:rgba(232,232,240,0.3);">© CronAi Aethel — AI Video Studio</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Reset your CronAi Aethel password\n\nHi ${username},\n\nClick this link to reset your password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;

  return send({ to: email, subject: 'Reset your CronAi Aethel password', html, text }, env);
}

/* ── Email Verification ───────────────────────────────────────────────────── */
export async function sendVerificationEmail({ email, username, verifyUrl }, env) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#0d0d18 0%,#1a1428 100%);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(200,169,111,0.15);">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#c8a96f;">CronAi Aethel</p>
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Verify your email</h1>
          <p style="margin:12px 0 0;font-size:14px;color:rgba(232,232,240,0.6);">One tap and you're ready to create.</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(232,232,240,0.8);">
            Hi ${username}, click below to verify your email address. This link expires in <strong style="color:#c8a96f;">24 hours</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:8px 0 28px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#c8a96f,#b8923a);color:#0a0a10;font-weight:700;font-size:15px;border-radius:8px;text-decoration:none;letter-spacing:0.03em;">
              Verify Email Address
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:12px;color:rgba(232,232,240,0.4);line-height:1.6;">
            If you didn't create a CronAi Aethel account, you can safely ignore this email.<br>
            Link not working? Copy and paste: <span style="color:#c8a96f;word-break:break-all;">${verifyUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:11px;color:rgba(232,232,240,0.3);">© CronAi Aethel — AI Video Studio</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Verify your CronAi Aethel email\n\nHi ${username},\n\nClick this link to verify your email (expires in 24 hours):\n${verifyUrl}\n\nIf you didn't sign up, ignore this email.`;

  return send({ to: email, subject: 'Verify your CronAi Aethel email address', html, text }, env);
}
