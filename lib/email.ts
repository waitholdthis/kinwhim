import { env } from "cloudflare:workers";

export async function sendEmail(message: { to: string; subject: string; text: string; html?: string }) {
  if (!env.RESEND_API_KEY) {
    if (import.meta.env.DEV) {
      console.info(`[kinwhim email to ${message.to}] ${message.subject}\n${message.text}`);
      return;
    }
    throw new Error("Email delivery is not configured.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "Kinwhim <hello@kinwhim.app>",
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!response.ok) {
    console.error("Email send failed", response.status, await response.text());
    throw new Error("We couldn’t send that email. Try again in a minute.");
  }
}

export function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
