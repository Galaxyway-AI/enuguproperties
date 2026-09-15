import { NextRequest } from "next/server";
import { validWebhook, paystack } from "@/lib/payments";
import { serverQuery } from "@/lib/server-db";
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 1000000)
      return new Response("Too large", { status: 413 });
    const raw = await request.text();
    if (raw.length > 1000000) return new Response("Too large", { status: 413 });
    if (!validWebhook(raw, request.headers.get("x-paystack-signature")))
      return new Response("Invalid signature", { status: 401 });
    const event = JSON.parse(raw);
    if (event.event !== "charge.success") return new Response("Ignored");
    if (typeof event.data?.reference !== "string")
      return new Response("Missing reference", { status: 400 });
    const verified = await paystack.verify(event.data.reference);
    if (
      verified.status !== "success" ||
      verified.reference !== event.data.reference
    )
      return new Response("Not confirmed", { status: 400 });
    await serverQuery("select public.fulfil_payment($1,$2,$3,$4)", [
      verified.reference,
      verified.id,
      verified.amount,
      verified.currency,
    ]);
    return new Response("OK");
  } catch {
    console.error(
      JSON.stringify({
        event: "payment_webhook_failed",
        at: new Date().toISOString(),
      }),
    );
    return new Response("Retry later", { status: 500 });
  }
}
