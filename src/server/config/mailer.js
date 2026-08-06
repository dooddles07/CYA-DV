import "server-only";
import { ApiError } from "@/server/utils/api-error";

const RESEND_API_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/**
 * Resend's HTTP API, not raw SMTP. Vercel's serverless functions can't
 * reliably complete an SMTP handshake (outbound port 465/587 gets silently
 * dropped — connection opens, greeting never arrives), a well-known platform
 * limitation. HTTPS calls don't hit that wall.
 *
 * Until a sending domain is verified in the Resend dashboard, delivery is
 * sandboxed to the Resend account's own signup email — real members won't
 * receive mail until a domain is added there.
 */
export function mailer() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new ApiError(503, "Email is not configured on this server.");

  return {
    async sendMail({ from, to, subject, text, html }) {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, text, html }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Resend send failed (${res.status}): ${body}`);
      }
      return res.json();
    },
  };
}

export function mailFrom() {
  return process.env.RESEND_FROM ?? "CYA Daily Verse <onboarding@resend.dev>";
}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}
