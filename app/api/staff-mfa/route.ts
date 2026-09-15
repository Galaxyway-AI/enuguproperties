import { NextRequest } from "next/server";
import { currentUser } from "@/lib/supabase";
import { serverQuery } from "@/lib/server-db";
import { encodeBase32, isValidTotp } from "@/lib/staff-mfa";
import {
  errorResponse,
  HttpError,
  rateLimit,
  sameOrigin,
} from "@/lib/security";
import { z } from "zod";

async function encryptionKey() {
  const configured = process.env.STAFF_MFA_ENCRYPTION_KEY;
  if (!configured)
    throw new HttpError(503, "Authenticator setup is temporarily unavailable.");
  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(configured),
  );
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encrypt(secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(),
      new TextEncoder().encode(secret),
    ),
  );
  return Buffer.concat([Buffer.from(iv), Buffer.from(ciphertext)]).toString(
    "base64url",
  );
}

async function decrypt(cipher: string) {
  const bytes = Buffer.from(cipher, "base64url");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.subarray(0, 12) },
    await encryptionKey(),
    bytes.subarray(12),
  );
  return new TextDecoder().decode(plaintext);
}

async function requireStaff() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  const rows = await serverQuery<{ assigned: boolean }>(
    "select exists(select 1 from public.user_roles where user_id=$1) assigned",
    [user.id],
  );
  if (!rows[0]?.assigned)
    throw new HttpError(403, "An assigned staff role is required.");
  return user;
}

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const user = await requireStaff();
    const body = await request.json();
    const action = z.enum(["start", "verify"]).parse(body.action);
    await rateLimit(
      `staff-mfa:${user.id}:${action}`,
      action === "verify" ? 8 : 3,
      600,
    );

    const factors = await serverQuery<{
      secret_cipher: string;
      verified_at: string | null;
    }>(
      "select secret_cipher,verified_at from public.staff_mfa_factors where user_id=$1",
      [user.id],
    );
    let factor = factors[0];

    if (action === "start") {
      if (factor?.verified_at) return Response.json({ configured: true });
      if (!factor) {
        const secret = encodeBase32(crypto.getRandomValues(new Uint8Array(20)));
        const cipher = await encrypt(secret);
        await serverQuery(
          "insert into public.staff_mfa_factors(user_id,secret_cipher) values($1,$2)",
          [user.id, cipher],
        );
        factor = { secret_cipher: cipher, verified_at: null };
      }
      const secret = await decrypt(factor.secret_cipher);
      const account = encodeURIComponent(user.email || "staff");
      return Response.json({
        configured: false,
        secret,
        uri: `otpauth://totp/Enugu%20Properties:${account}?secret=${secret}&issuer=Enugu%20Properties&digits=6&period=30`,
      });
    }

    if (!factor)
      throw new HttpError(400, "Set up the authenticator before verifying.");
    const code = z
      .string()
      .regex(/^\d{6}$/)
      .parse(body.code);
    const secret = await decrypt(factor.secret_cipher);
    if (!(await isValidTotp(secret, code)))
      throw new HttpError(400, "The code is incorrect or has expired.");
    await serverQuery(
      `with verified_factor as (
         update public.staff_mfa_factors
         set verified_at=coalesce(verified_at,now()),updated_at=now()
         where user_id=$1
         returning user_id
       )
       insert into public.staff_mfa_sessions(user_id,verified_at,expires_at)
       select user_id,now(),now()+interval '8 hours' from verified_factor
       on conflict(user_id) do update
       set verified_at=excluded.verified_at,expires_at=excluded.expires_at`,
      [user.id],
    );
    return Response.json({
      message: "Authenticator verified for eight hours.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
