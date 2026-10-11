import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, neonAuth } from "@/lib/neon-auth";
import { safeNext } from "@/lib/domain";
import { authHref } from "@/lib/auth-navigation";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === "www.enuguproperties.com") {
    const canonical = request.nextUrl.clone();
    canonical.hostname = "enuguproperties.com";
    canonical.protocol = "https:";
    return NextResponse.redirect(canonical, 308);
  }
  const pathname = request.nextUrl.pathname;
  const returnTo = safeNext(pathname + request.nextUrl.search);
  // Always overwrite this header so a browser cannot supply a return address.
  request.headers.set("x-enugu-return-to", returnTo);
  const protectedRoute =
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");
  const response =
    authConfigured() && protectedRoute
      ? await neonAuth().middleware({ loginUrl: authHref("login", returnTo) })(
          request,
        )
      : NextResponse.next({ request: { headers: request.headers } });
  if (request.nextUrl.hostname !== "enuguproperties.com")
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  else {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
    if (
      request.method === "GET" &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/account") &&
      !pathname.startsWith("/admin") &&
      !["/login", "/register", "/reset-password"].includes(pathname)
    ) {
      const canonical = new URL(pathname, "https://enuguproperties.com");
      response.headers.set("Link", `<${canonical}>; rel=\"canonical\"`);
    }
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
