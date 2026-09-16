import test from "node:test";
import assert from "node:assert/strict";
import {
  toMinor,
  money,
  commission,
  canTransition,
  safeNext,
  listingPurposeDescription,
  listingPurposeSuffix,
} from "../lib/domain";
test("money is represented and calculated using integer minor units", () => {
  assert.equal(toMinor("185000000.25"), 18500000025);
  assert.equal(money(18500000025), "₦185,000,000.25");
  assert.equal(commission(18500000000n, 200), 370000000n);
  assert.equal(commission(10001n, 250), 250n);
  assert.throws(() => toMinor("1e8"));
  assert.throws(() => toMinor("1.999"));
  assert.throws(() => toMinor("-1"));
});
test("listing purposes use clear public price periods", () => {
  assert.equal(listingPurposeDescription("sale"), "for sale");
  assert.equal(listingPurposeDescription("rent"), "for rent");
  assert.equal(listingPurposeDescription("short-let"), "for short let");
  assert.equal(listingPurposeSuffix("rent"), " / year");
  assert.equal(listingPurposeSuffix("short-let"), " / night");
});
test("a seller cannot jump from draft to published", () => {
  assert.equal(canTransition("draft", "live"), false);
  assert.equal(canTransition("submitted", "under_review"), true);
  assert.equal(canTransition("under_review", "live"), true);
  assert.equal(canTransition("sold", "live"), false);
});
test("auth redirects remain within the application", () => {
  assert.equal(safeNext("//evil.example"), "/account/dashboard");
  assert.equal(safeNext("/\\evil.example"), "/account/dashboard");
  assert.equal(safeNext("https://evil.example"), "/account/dashboard");
  assert.equal(safeNext("/account/listings"), "/account/listings");
});
