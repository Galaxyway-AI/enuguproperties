import test from "node:test";
import assert from "node:assert/strict";
import { encodeBase32, isValidTotp, totp } from "../lib/staff-mfa";

test("TOTP matches the RFC 6238 SHA-1 test vector", async () => {
  const secret = encodeBase32(new TextEncoder().encode("12345678901234567890"));
  assert.equal(await totp(secret, 1, 8), "94287082");
});

test("TOTP verification accepts the adjacent clock window", async () => {
  const secret = encodeBase32(new TextEncoder().encode("12345678901234567890"));
  const code = await totp(secret, 2);
  assert.equal(await isValidTotp(secret, code, 90_000), true);
  assert.equal(await isValidTotp(secret, "000000", 90_000), false);
});
