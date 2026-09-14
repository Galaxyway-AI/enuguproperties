import "server-only";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { serviceDb } from "./supabase";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: NextRequest) {
  const expected = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000",
  ).origin;
  if (request.headers.get("origin") !== expected)
    throw new HttpError(
      403,
      "This request could not be verified. Reload the page and try again.",
    );
}
export async function rateLimit(key: string, limit = 15, seconds = 60) {
  const digest = createHash("sha256").update(key).digest("hex");
  const { data, error } = await serviceDb().rpc("consume_rate_limit", {
    p_key: digest,
    p_limit: limit,
    p_window: seconds,
  });
  if (error)
    throw new HttpError(503, "Request protection is temporarily unavailable.");
  if (!data)
    throw new HttpError(
      429,
      "Too many requests. Please wait a moment and try again.",
    );
}
export async function checkBot(token: unknown) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production")
      throw new HttpError(503, "This form is not available yet.");
    return;
  }
  if (typeof token !== "string" || !token)
    throw new HttpError(400, "Please complete the security check.");
  const r = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await r.json();
  if (
    !result.success ||
    result.hostname !== new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname
  )
    throw new HttpError(400, "Security check expired. Please try again.");
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    JSON.stringify({
      event: "request_failed",
      type: error instanceof Error ? error.name : "Unknown",
      at: new Date().toISOString(),
    }),
  );
  return Response.json(
    {
      error:
        "We could not complete that request. Check your information and try again.",
    },
    { status: 400 },
  );
}
