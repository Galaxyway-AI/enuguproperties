import { after, NextRequest } from "next/server";
import { validKoraWebhook, kora } from "@/lib/payments";
import { serverQuery } from "@/lib/server-db";
import {
  safelyRunOperationsTask,
  safelySendOperationsAlert,
} from "@/lib/email";
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 1000000)
      return new Response("Too large", { status: 413 });
    const raw = await request.text();
    if (raw.length > 1000000) return new Response("Too large", { status: 413 });
    const event = JSON.parse(raw);
    if (
      !event.data ||
      !validKoraWebhook(event.data, request.headers.get("x-korapay-signature"))
    )
      return new Response("Invalid signature", { status: 401 });
    if (event.event !== "charge.success") return new Response("Ignored");
    const queryReference = event.data?.reference;
    const merchantReference =
      event.data?.payment_reference || event.data?.reference;
    if (
      typeof queryReference !== "string" ||
      typeof merchantReference !== "string"
    )
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
    after(() =>
      safelyRunOperationsTask(`payment-${merchantReference}`, async () => {
        const [payment] = await serverQuery<{
          reference: string;
          amount_minor: number;
          property_id: string;
          property_reference: string;
          title: string;
          email: string;
          purpose: string;
        }>(
          `select orders.reference,orders.amount_minor,orders.property_id,orders.purpose,
                properties.reference property_reference,properties.title,account.email
         from public.orders orders
         join public.properties properties on properties.id=orders.property_id
         join neon_auth."user" account on account.id=orders.user_id::text
         where orders.reference=$1`,
          [merchantReference],
        );
        if (!payment) return;
        await safelySendOperationsAlert({
          id: `payment-${payment.reference}`,
          subject: `${payment.purpose === "featured" ? "Featured advert" : "Advertising"} payment received: ${payment.property_reference}`,
          text: `${payment.title}\n\nProduct: ${payment.purpose === "featured" ? "7-day featured homepage placement" : "Property advertising plan"}\nCustomer: ${payment.email}\nPayment reference: ${payment.reference}\nAmount: NGN ${(Number(payment.amount_minor) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          adminPath: "/admin/payments",
        });
      }),
    );
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
