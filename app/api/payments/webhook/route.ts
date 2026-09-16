import { NextRequest } from "next/server";
import { validKoraWebhook, kora } from "@/lib/payments";
import { serverQuery } from "@/lib/server-db";
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 1000000)
      return new Response("Too large", { status: 413 });
    const raw = await request.text();
    if (raw.length > 1000000) return new Response("Too large", { status: 413 });
    const event = JSON.parse(raw);
    if (!event.data || !validKoraWebhook(event.data, request.headers.get("x-korapay-signature")))
      return new Response("Invalid signature", { status: 401 });
    if (event.event !== "charge.success") return new Response("Ignored");
    const queryReference = event.data?.reference;
    const merchantReference =
      event.data?.payment_reference || event.data?.reference;
    if (typeof queryReference !== "string" || typeof merchantReference !== "string")
      return new Response("Missing reference", { status: 400 });
    const verified = await kora.verify(queryReference);
    if (
      verified.status !== "success" ||
      verified.reference !== merchantReference
    )
      return new Response("Not confirmed", { status: 400 });
    await serverQuery("select public.fulfil_payment($1,$2,$3,$4)", [
      merchantReference,
      verified.id,
      verified.amount,
      verified.currency,
    ]);
    return new Response("OK");
  } catch {
    console.error(
      JSON.stringify({
        event: "payment_webhook_failed",
        provider: "kora",
        at: new Date().toISOString(),
      }),
    );
    return new Response("Retry later", { status: 500 });
  }
}
