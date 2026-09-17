import "server-only";
import { appUrl, business } from "./business";
export interface Mailer {
  send(message: {
    to: string;
    subject: string;
    text: string;
    id: string;
    replyTo?: string;
    accountLink?: boolean;
    actionLink?: { href: string; label: string };
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
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        text: message.text,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#192c26"><h2 style="color:#165a42">enugu properties</h2><h1>${escape(message.subject)}</h1><p style="line-height:1.8;white-space:pre-wrap">${escape(message.text)}</p>${message.actionLink ? `<p><a href="${escape(message.actionLink.href)}">${escape(message.actionLink.label)}</a></p>` : message.accountLink === false ? "" : `<p><a href="${escape(appUrl("/account/dashboard"))}">View your account</a></p>`}<hr><p style="font-size:12px">${business.brandName} · ${business.legalName}<br>Never pay for a property solely on the basis of an online listing.</p></div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error("Email provider unavailable");
  },
};

export type OperationsAlert = {
  id: string;
  subject: string;
  text: string;
  adminPath: string;
};

export function operationsRecipient() {
  return (
    process.env.OPERATIONS_ALERT_EMAIL ||
    process.env.CONTACT_RECIPIENT_EMAIL ||
    business.supportEmail
  );
}

export async function sendOperationsAlert(alert: OperationsAlert) {
  await mailer.send({
    id: `operations-${alert.id}`,
    to: operationsRecipient(),
    replyTo: business.supportEmail,
    subject: alert.subject,
    text: alert.text,
    accountLink: false,
    actionLink: {
      href: appUrl(alert.adminPath),
      label: "Open the admin control panel",
    },
  });
}

export async function safelySendOperationsAlert(alert: OperationsAlert) {
  try {
    await sendOperationsAlert(alert);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "operations_email_failed",
        notification: alert.id,
        type: error instanceof Error ? error.name : "Unknown",
      }),
    );
  }
}

export async function safelyRunOperationsTask(
  id: string,
  task: () => Promise<void>,
) {
  try {
    await task();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "operations_notification_failed",
        notification: id,
        type: error instanceof Error ? error.name : "Unknown",
      }),
    );
  }
}
