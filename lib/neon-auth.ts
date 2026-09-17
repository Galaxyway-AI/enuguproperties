import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import {
  createAuthServer,
  extractNeonAuthCookies,
} from "@neondatabase/auth/server";
import { cookies, headers } from "next/headers";
import { appUrl } from "./business";

let instance: ReturnType<typeof createNeonAuth> | undefined;
let canonicalInstance: ReturnType<typeof createAuthServer> | undefined;

export function authConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
}

export function neonAuth() {
  if (!authConfigured()) throw new Error("Neon Auth is not configured.");

  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      sessionDataTtl: 300,
    },
    logLevel: process.env.NODE_ENV === "production" ? "warn" : "error",
  });

  return instance;
}

/**
 * Auth client for requests initiated by our own forms.
 *
 * Some mobile browsers omit or rewrite the Origin header on a fetch after a
 * redirect. Neon's server adapter forwards that browser value upstream, where
 * it is rejected by the trusted-domain check. These requests have already
 * passed our same-origin validation, so use the site's canonical origin for
 * Neon's independent origin check while preserving the request's auth cookies.
 */
export function canonicalNeonAuth() {
  if (!authConfigured()) throw new Error("Neon Auth is not configured.");

  canonicalInstance ??= createAuthServer({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookieSecret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 300,
    context: async () => {
      const [cookieStore, headerStore] = await Promise.all([
        cookies(),
        headers(),
      ]);
      return {
        getCookies: () => extractNeonAuthCookies(headerStore),
        setCookie: (name, value, options) => {
          cookieStore.set(name, value, options);
        },
        getHeader: (name) => headerStore.get(name),
        getOrigin: () => new URL(appUrl()).origin,
        getFramework: () => "nextjs",
      };
    },
  });

  return canonicalInstance;
}

type EmailSignUpInput = {
  email: string;
  password: string;
  name: string;
};

type EmailSignUpResult = {
  data: { user?: { id?: string } } | null;
  error: {
    code?: string;
    message?: string;
    status: number;
    statusText?: string;
  } | null;
};

/**
 * Register without forwarding browser session cookies. Email verification does
 * not create a session, and a clean server request avoids stale auth cookies
 * changing Neon's CSRF/feature path. Keep the upstream code so the form can
 * explain the real rejection instead of the SDK's generic 403 mapping.
 */
export async function signUpWithEmail(
  input: EmailSignUpInput,
): Promise<EmailSignUpResult> {
  if (!authConfigured()) throw new Error("Neon Auth is not configured.");

  const endpoint = new URL(
    "sign-up/email",
    `${process.env.NEON_AUTH_BASE_URL!.replace(/\/$/, "")}/`,
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(appUrl()).origin,
      "x-neon-auth-proxy": "nextjs",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json().catch(() => null)) as {
    user?: { id?: string };
    code?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    return {
      data: null,
      error: {
        code: payload?.code,
        message: payload?.message || response.statusText,
        status: response.status,
        statusText: response.statusText,
      },
    };
  }

  return { data: payload, error: null };
}
