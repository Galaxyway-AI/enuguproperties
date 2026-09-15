import "server-only";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { serverQuery } from "./server-db";
import { validTurnstileResult, type TurnstileResult } from "./turnstile";
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
  let rows: { allowed: boolean }[];
  try {
    rows = await serverQuery<{ allowed: boolean }>(
      "select public.consume_rate_limit($1,$2,$3) as allowed",
      [digest, limit, seconds],
    );
  } catch {
    throw new HttpError(503, "Request protection is temporarily unavailable.");
  }
  if (!rows[0]?.allowed)
    throw new HttpError(
      429,
      "Too many requests. Please wait a moment and try again.",
    );
}
export async function checkBot(token: unknown, expectedAction: string) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production")
      throw new HttpError(503, "This form is not available yet.");
    return;
  }
  if (typeof token !== "string" || !token)
    throw new HttpError(400, "Please complete the security check.");
  let r: Response;
  try {
    r = await fetch(
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
  } catch {
    throw new HttpError(
      503,
      "Security check is temporarily unavailable. Please try again.",
    );
  }
  if (!r.ok)
    throw new HttpError(
      503,
      "Security check is temporarily unavailable. Please try again.",
    );
  const result = (await r.json()) as TurnstileResult;
  if (
    !validTurnstileResult(
      result,
      new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname,
      expectedAction,
    )
  )
    throw new HttpError(400, "Security check expired. Please try again.");
  await rateLimit(`turnstile-replay:${token}`, 1, 600);
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
