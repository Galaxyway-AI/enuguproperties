import "server-only";
import { appUrl, business } from "./business";
export interface Mailer {
  send(message: {
    to: string;
    subject: string;
    text: string;
    id: string;
  }): Promise<void>;
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const mailer: Mailer = {
  async send(message) {
    if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM)
      throw new Error("Email not configured");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.id,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#192c26"><h2 style="color:#165a42">enugu properties</h2><h1>${escape(message.subject)}</h1><p style="line-height:1.8">${escape(message.text)}</p><p><a href="${escape(appUrl("/account/dashboard"))}">View your account</a></p><hr><p style="font-size:12px">${business.brandName} · ${business.legalName}<br>Never pay for a property solely on the basis of an online listing.</p></div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error("Email provider unavailable");
  },
};
