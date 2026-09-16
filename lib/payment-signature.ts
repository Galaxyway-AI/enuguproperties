import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqualHex(actual: string | null, expected: string) {
  if (!actual || !/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function verifyKoraPaymentSignature(
  data: unknown,
  signature: string | null,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(JSON.stringify(data))
    .digest("hex");
  return safeEqualHex(signature, expected);
}

export function paymentAmountToMinor(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new Error("Invalid payment amount.");
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0)
    throw new Error("Invalid payment amount.");
  return minor;
}
