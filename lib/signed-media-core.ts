import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.MEDIA_SIGNING_SECRET;
  if (!value || value.length < 32)
    throw new Error("Private media signing is not configured.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createEvidenceToken(
  documentId: string,
  userId: string,
  lifetimeSeconds = 60,
) {
  const expires = Math.floor(Date.now() / 1000) + lifetimeSeconds;
  const payload = `${documentId}.${userId}.${expires}`;
  return `${expires}.${signature(payload)}`;
}

export function verifyEvidenceToken(
  token: string,
  documentId: string,
  userId: string,
) {
  const [expiresText, supplied] = token.split(".");
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000))
    return false;
  const expected = signature(`${documentId}.${userId}.${expires}`);
  if (!supplied || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
