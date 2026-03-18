import nodemailer from "nodemailer";
import dns from "node:dns";

export const WHATSAPP_LINK = "https://chat.whatsapp.com/DFjh7QeAt89IyoIpsGHrLY";

/** Reusable transporter (connection pooling for high traffic) */
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpSecure = process.env.SMTP_SECURE === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

// Render (and some hosts) don't have IPv6 egress; Gmail may resolve to IPv6 first.
// Force IPv4-first DNS resolution to avoid ENETUNREACH to IPv6 SMTP addresses.
dns.setDefaultResultOrder("ipv4first");

let transporterCache: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporterCache) return transporterCache;
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP is not configured on the server (missing env vars).");
  }
  const ips = await dns.promises.resolve4(smtpHost);
  const host = ips[0];
  if (!host) {
    throw new Error(`Could not resolve SMTP host to IPv4: ${smtpHost}`);
  }
  transporterCache = nodemailer.createTransport({
    host,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 30000,
    greetingTimeout: 20000,
  } as nodemailer.TransportOptions);
  return transporterCache;
}

// In production, missing SMTP envs is the #1 reason “works locally, not deployed”.
// We don't throw on module load to keep the API up, but we will log clearly.
if (process.env.NODE_ENV === "production" && smtpHost) {
  const missing = [
    !smtpHost && "SMTP_HOST",
    !process.env.SMTP_PORT && "SMTP_PORT",
    !smtpUser && "SMTP_USER",
    !smtpPass && "SMTP_PASS",
  ].filter(Boolean);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[mail] Missing SMTP env vars: ${missing.join(", ")}`);
  }
}

export interface ReportEmailParams {
  to: string;
  bandScore: string;
  accuracy: number;
  avgTime: number;
  totalTime: number;
  correctCount?: number;
  totalQuestions?: number;
}

/** Single band → realistic range for 5-min test (margin of error) */
function bandToRange(band: string): string {
  const n = parseFloat(band);
  if (Number.isNaN(n)) return band;
  if (n >= 8.5) return "8.5 - 9.0";
  if (n >= 8) return "8.0 - 8.5";
  if (n >= 7.5) return "7.5 - 8.0";
  if (n >= 7) return "7.0 - 7.5";
  if (n >= 6.5) return "6.5 - 7.0";
  if (n >= 6) return "6.0 - 6.5";
  if (n >= 5.5) return "5.5 - 6.0";
  if (n >= 5) return "5.0 - 5.5";
  if (n >= 4.5) return "4.5 - 5.0";
  return "4.0 - 4.5";
}

export async function sendReportEmail(
  params: ReportEmailParams,
): Promise<void> {
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error("SMTP is not configured on the server (missing env vars).");
  }
  const {
    to,
    bandScore,
    accuracy,
    avgTime,
    totalTime,
    correctCount,
    totalQuestions,
  } = params;
  const correct = correctCount ?? 0;
  const total = totalQuestions ?? 5;
  const bandRange = bandToRange(bandScore);

  const correctRow =
    total > 0
      ? `<tr><td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Correct answers</td><td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${correct} / ${total}</td></tr>`
      : "";

  const text = [
    `Your IELTS Reading Prediction: Band ${bandRange}`,
    ``,
    `Accuracy: ${accuracy}%`,
    `Test Duration: ${totalTime}s`,
    `Correct answers: ${correct} / ${total}`,
    ``,
    `Join our early-access community: ${WHATSAPP_LINK}`,
    ``,
    `Note: This is an initial prediction from a short micro-test. Our full-scale platform is launching soon.`,
    `© 2026 Gamlish. The Game of English.`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px;">
    <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://res.cloudinary.com/daqvhd097/image/upload/v1772646945/gamlish_logo-no-bg_rr1d5e.png" alt="Gamlish" width="110" />
      </div>

      <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #0f172a; text-align: center;">
        Your Band Prediction
      </h1>

      <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em;">Estimated Level</p>
        <p style="margin: 0; font-size: 24px; font-weight: 900; color: #2563eb; white-space: nowrap;">Band ${bandRange}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr><td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Accuracy</td><td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${accuracy}%</td></tr>
        <tr><td style="padding: 10px 0; color: #64748b; border-bottom: 1px solid #f1f5f9;">Test Duration</td><td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${totalTime}s</td></tr>
        ${correctRow}
      </table>

      <div style="background: #f0fdf4; border: 1px dashed #22c55e; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #166534; font-weight: 500;">
          Want to see the full version of Gamlish? Join our early-access community for updates!
        </p>
        <a href="${WHATSAPP_LINK}" style="background: #25d366; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
          Join WhatsApp Group
        </a>
      </div>

      <div style="padding: 16px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
          <strong>Note:</strong> This is an initial prediction based on a 3-5 minute micro-test. While accurate for a quick diagnostic, it is not a guaranteed official score. Our full-scale simulation platform is launching soon.
        </p>
      </div>

      <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">
        © 2026 Gamlish. All rights reserved.<br/>
        The Game of English — Level up your IELTS.
      </p>
    </div>
  </body>
</html>
`;

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"Gamlish" <${smtpFrom}>`,
    to,
    subject: `Your IELTS Prediction: Band ${bandRange}`,
    text,
    html,
  });
}
