import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, neonAuth } from "@/lib/neon-auth";

export async function proxy(request: NextRequest) {
  if (!authConfigured()) return NextResponse.next({ request });
  return neonAuth().middleware({ loginUrl: "/login" })(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
