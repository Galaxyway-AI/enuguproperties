import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { db } from "@/lib/supabase";
import { safeNext } from "@/lib/domain";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const client = await db();
  const code = params.get("code");
  const hash = params.get("token_hash");
  const type = params.get("type");
  let ok = false;
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (
    hash &&
    ["signup", "recovery", "email", "email_change"].includes(type || "")
  ) {
    const { error } = await client.auth.verifyOtp({
      token_hash: hash,
      type: type as EmailOtpType,
    });
    ok = !error;
  }
  return NextResponse.redirect(
    new URL(
      ok
        ? safeNext(params.get("next"))
        : "/login?error=The+confirmation+link+has+expired.+Request+a+new+one.",
      process.env.NEXT_PUBLIC_APP_URL || request.url,
    ),
  );
}
