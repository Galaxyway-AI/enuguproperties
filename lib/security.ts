import "server-only";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { serverQuery } from "./server-db";
import { validTurnstileResult, type TurnstileResult } from "./turnstile";
import type { z } from "zod";
import { isTrustedAppOrigin, trustedAppHostnames } from "./app-origins";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function validationErrorMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Check the highlighted information and try again.";
  const field = issue.path.length
    ? `${String(issue.path.at(-1)).replaceAll("_", " ")} `
    : "This field ";
  if (issue.code === "too_small")
    return `${field}must contain at least ${issue.minimum} ${issue.origin === "string" ? "characters" : "items"}.`;
  if (issue.code === "too_big")
    return `${field}must contain no more than ${issue.maximum} ${issue.origin === "string" ? "characters" : "items"}.`;
  if (issue.code === "invalid_format" && issue.format === "email")
    return "Enter a complete email address, for example name@example.com.";
  if (issue.code === "invalid_format" && issue.format === "uuid")
    return "Choose a valid record and try again.";
  if (issue.code === "invalid_value")
    return `${field}contains an option that is not available.`;
  return issue.message || "Check the highlighted information and try again.";
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { code: "", message: "" };
  const value = error as { code?: unknown; message?: unknown };
  return {
    code: typeof value.code === "string" ? value.code : "",
    message: typeof value.message === "string" ? value.message : "",
  };
}

export function databaseErrorMessage(error: unknown) {
  const { message } = errorDetails(error);
  if (!message) return null;
  const known = [
    "maximum of",
    "photograph",
    "Photos can only",
    "Photographs are locked",
    "your own listing",
    "Listing not found",
    "document category",
    "private documents",
    "active to upload",
  ];
  return known.some((part) =>
    message.toLowerCase().includes(part.toLowerCase()),
  )
    ? message
    : null;
}

export function databaseActionErrorMessage(error: unknown) {
  const { code, message } = errorDetails(error);
  if (code === "P0001" && message) return message;
  const knownMessage = databaseErrorMessage(error);
  if (knownMessage) return knownMessage;
  const messages: Record<string, string> = {
    "22P02":
      "One of the submitted values has the wrong format. Refresh the page and select the value again.",
    "23503":
      "This action depends on a related record that is missing or no longer available.",
    "23505":
      "A record with these details already exists, so this action was not repeated.",
    "23514": "One of the submitted values is outside the allowed range.",
    "42501": "Your account does not have permission to perform this action.",
    PGRST116:
      "The requested record could not be found or is no longer available.",
    PGRST202:
      "This action is not available in the current database version. Refresh the page and try again.",
  };
  if (messages[code]) return messages[code];
  return code
    ? `The database rejected this action (${code}). Refresh the page and try again.`
    : "The database rejected this action. Refresh the page and try again.";
}

export function isDatabaseActionError(error: unknown) {
  const { code } = errorDetails(error);
  return Boolean(code || databaseErrorMessage(error));
}
export function sameOrigin(request: NextRequest) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
  if (!isTrustedAppOrigin(request.headers.get("origin"), configuredUrl))
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
      trustedAppHostnames(process.env.NEXT_PUBLIC_APP_URL!),
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
