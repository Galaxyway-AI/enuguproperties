import "server-only";
import {
  fetchWithToken,
  NeonPostgrestClient,
} from "@neondatabase/postgrest-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authConfigured, neonAuth } from "./neon-auth";
import { appUrl } from "./business";

export const configured = () =>
  Boolean(
    authConfigured() &&
      (process.env.NEON_DATA_API_URL ||
        process.env.NEXT_PUBLIC_NEON_DATA_API_URL),
  );

async function jwt() {
  const server = neonAuth();
  const sessionToken = await server.token();
  if (sessionToken.data?.token) return sessionToken.data.token;
  const response = await fetch(`${process.env.NEON_AUTH_BASE_URL}/token/anonymous`, {
    headers: { Origin: new URL(appUrl()).origin },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const anonymousToken = (await response.json()) as { token?: string };
  return anonymousToken.token ?? null;
}

function dataClient() {
  const url =
    process.env.NEON_DATA_API_URL ??
    process.env.NEXT_PUBLIC_NEON_DATA_API_URL;
  if (!url) throw new Error("Neon Data API is not configured.");
  return new NeonPostgrestClient({
    dataApiUrl: url,
    options: { global: { fetch: fetchWithToken(jwt) } },
  });
}

function authCompatibility() {
  const server = neonAuth();
  return {
    async getUser() {
      const result = await server.getSession();
      return {
        data: { user: result.data?.user ?? null },
        error: result.error ? { message: result.error.message } : null,
      };
    },
    signOut: () => server.signOut(),
  };
}

export async function db(): Promise<SupabaseClient> {
  if (!configured())
    throw new Error(
      "Account services are not configured yet. Please try again after setup.",
    );
  return Object.assign(dataClient(), {
    auth: authCompatibility(),
  }) as unknown as SupabaseClient;
}
export async function currentUser() {
  if (!authConfigured()) return null;
  const result = await neonAuth().getSession();
  return result.data?.user ?? null;
}
