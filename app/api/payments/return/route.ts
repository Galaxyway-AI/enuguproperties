import { NextRequest, NextResponse } from "next/server";
import { kora } from "@/lib/payments";
import { serverQuery } from "@/lib/server-db";
import { appUrl } from "@/lib/business";

const validReference = (value: string) => /^[A-Za-z0-9_-]{8,120}$/.test(value);

export async function GET(request: NextRequest) {
  const queryReference = request.nextUrl.searchParams.get("reference") || "";
  let status = "pending";
  if (validReference(queryReference)) {
    try {
      const verified = await kora.verify(queryReference);
      if (verified.status === "success" && validReference(verified.reference)) {
        await serverQuery("select public.fulfil_payment($1,$2,$3,$4)", [
          verified.reference,
          verified.id,
          verified.amount,
          verified.currency,
        ]);
        status = "success";
      } else if (verified.status === "failed") {
        status = "failed";
      }
    } catch {
      status = "pending";
    }
  }
  return NextResponse.redirect(appUrl(`/account/billing?payment=${status}`));
}
