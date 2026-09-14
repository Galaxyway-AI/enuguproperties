import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature } from "../lib/payment-signature";
test("payment signature accepts authentic raw bytes and rejects tampering", () => {
  const secret = "test-only-secret";
  const raw = '{"event":"charge.success"}';
  const sig = createHmac("sha512", secret).update(raw).digest("hex");
  assert.equal(verifyPaymentSignature(raw, sig, secret), true);
  assert.equal(verifyPaymentSignature(raw + " ", sig, secret), false);
  assert.equal(verifyPaymentSignature(raw, sig, "wrong-test-key"), false);
  assert.equal(verifyPaymentSignature(raw, null, secret), false);
  assert.equal(verifyPaymentSignature(raw, "00", secret), false);
});
