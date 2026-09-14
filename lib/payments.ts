import "server-only";
import { verifyPaymentSignature } from "./payment-signature";
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
function key() {
  const value = process.env.PAYSTACK_SECRET_KEY;
  if (!value) throw new Error("Payments have not been configured.");
  return value;
}
async function api(path: string, body?: unknown) {
  const r = await fetch(`https://api.paystack.co${path}`, {
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
export const paystack: PaymentProvider = {
  async initialise(order) {
    const data = await api("/transaction/initialize", {
      reference: order.reference,
      amount: order.amount_minor,
      currency: "NGN",
      email: order.email,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing`,
    });
    const url = new URL(data.authorization_url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com")
      throw new Error("Invalid checkout destination.");
    return url.toString();
  },
  async verify(reference) {
    const data = await api(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    return {
      id: String(data.id),
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      reference: data.reference,
    };
  },
};
export function validWebhook(raw: string, signature: string | null) {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  return verifyPaymentSignature(raw, signature, key());
}
