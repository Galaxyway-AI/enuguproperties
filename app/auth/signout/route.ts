import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { sameOrigin, errorResponse } from "@/lib/security";
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    await (await db()).auth.signOut();
    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch (e) {
    return errorResponse(e);
  }
}
