import "server-only";
import { verifyKoraPaymentSignature, paymentAmountToMinor } from "./payment-signature";
import { appUrl } from "./business";
export interface PaymentProvider {
  initialise(order: {
    reference: string;
    amount_minor: number;
    email: string;
  }): Promise<string>;
  verify(reference: string): Promise<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    reference: string;
  }>;
}
function mode() {
  const value = process.env.KORAPAY_MODE || "test";
  if (!["test", "live"].includes(value)) throw new Error("Invalid Kora mode.");
  return value;
}

function key() {
  const value = process.env.KORAPAY_SECRET_KEY;
  if (!value) throw new Error("Payments have not been configured.");
  const environment = mode();
  if (environment === "test" && !value.startsWith("sk_test_"))
    throw new Error("Kora test mode requires a test secret key.");
  if (environment === "live" && !value.startsWith("sk_live_"))
    throw new Error("Kora live mode requires a live secret key.");
  if (environment === "live" && process.env.ALLOW_KORAPAY_LIVE !== "true")
    throw new Error("Kora live mode is locked until explicitly enabled.");
  return value;
}
async function api(path: string, body?: unknown) {
  const r = await fetch(`https://api.korapay.com${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (!r.ok || !data.status) throw new Error("Payment provider unavailable.");
  return data.data;
}
export const kora: PaymentProvider = {
  async initialise(order) {
    if (!Number.isSafeInteger(order.amount_minor) || order.amount_minor <= 0)
      throw new Error("Invalid checkout amount.");
    const data = await api("/merchant/api/v1/charges/initialize", {
      reference: order.reference,
      amount: order.amount_minor / 100,
      currency: "NGN",
      customer: { email: order.email },
      narration: `Enugu Properties advertising · ${order.reference}`,
      notification_url: appUrl("/api/payments/webhook"),
      redirect_url: appUrl("/api/payments/return"),
      metadata: { purpose: "listing" },
    });
    const url = new URL(data.checkout_url);
    const checkoutHost =
      mode() === "live"
        ? "checkout.korapay.com"
        : "test-checkout.korapay.com";
    if (url.protocol !== "https:" || url.hostname !== checkoutHost)
      throw new Error("Invalid checkout destination.");
    return url.toString();
  },
  async verify(reference) {
    const data = await api(
      `/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
    );
    return {
      id: String(data.transaction_reference || data.reference),
      amount: paymentAmountToMinor(data.amount_paid ?? data.amount),
      currency: String(data.currency || ""),
      status: String(data.status || ""),
      reference: String(data.payment_reference || data.reference || ""),
    };
  },
};
export function validKoraWebhook(data: unknown, signature: string | null) {
  return verifyKoraPaymentSignature(data, signature, key());
}
