import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyPaymentSignature(
  raw: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(
    createHmac("sha512", secret).update(raw).digest(),
    Buffer.from(signature, "hex"),
  );
}
