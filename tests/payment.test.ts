import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  paymentAmountToMinor,
  verifyKoraPaymentSignature,
} from "../lib/payment-signature";
test("Kora webhook signature accepts authentic data and rejects tampering", () => {
  const secret = "test-only-secret";
  const data = { reference: "EPP-12345678", amount: 5000, currency: "NGN" };
  const sig = createHmac("sha256", secret)
    .update(JSON.stringify(data))
    .digest("hex");
  assert.equal(verifyKoraPaymentSignature(data, sig, secret), true);
  assert.equal(verifyKoraPaymentSignature({ ...data, amount: 1 }, sig, secret), false);
  assert.equal(verifyKoraPaymentSignature(data, sig, "wrong-test-key"), false);
  assert.equal(verifyKoraPaymentSignature(data, null, secret), false);
  assert.equal(verifyKoraPaymentSignature(data, "00", secret), false);
});

test("Kora major-unit amounts convert to database minor units exactly", () => {
  assert.equal(paymentAmountToMinor("5000.00"), 500000);
  assert.equal(paymentAmountToMinor(15000), 1500000);
  assert.equal(paymentAmountToMinor("100.5"), 10050);
  assert.throws(() => paymentAmountToMinor("1.001"));
  assert.throws(() => paymentAmountToMinor("not-an-amount"));
});
