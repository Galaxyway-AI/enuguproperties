import test from "node:test";
import assert from "node:assert/strict";
import { authHref } from "../lib/auth-navigation";
import { safeNext, listingPurposeSuffix } from "../lib/domain";
import { searchBudget, searchPurpose } from "../lib/search-budget";

test("sign-in and registration links preserve the property and request type", () => {
  for (const kind of ["enquire", "inspection", "offer", "report"]) {
    const destination = `/account/request?property=property-id&kind=${kind}`;
    const login = new URL(
      authHref("login", destination),
      "https://enuguproperties.com",
    );
    assert.equal(login.pathname, "/login");
    assert.equal(login.searchParams.get("next"), destination);
    const register = new URL(
      authHref("register", login.searchParams.get("next")),
      login,
    );
    assert.equal(register.pathname, "/register");
    assert.equal(register.searchParams.get("next"), destination);
    const backToLogin = new URL(
      authHref("login", register.searchParams.get("next")),
      register,
    );
    assert.equal(backToLogin.searchParams.get("next"), destination);
  }
  assert.equal(
    new URL(
      authHref("login", "/property/enugu-home"),
      "https://enuguproperties.com",
    ).searchParams.get("next"),
    "/property/enugu-home",
  );
});

test("return destinations reject external and browser-normalized external URLs", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\n/evil.example",
    "/\t/evil.example",
    "/ /evil.example",
  ]) {
    assert.equal(safeNext(value), "/account/dashboard");
    assert.equal(
      new URL(
        authHref("login", value),
        "https://enuguproperties.com",
      ).searchParams.get("next"),
      "/account/dashboard",
    );
  }
});

test("rental and short-let budgets match the price periods used by adverts", () => {
  const sale = searchBudget("sale");
  const rent = searchBudget("rent");
  const shortLet = searchBudget("short-let");
  assert.equal(sale.label, "Maximum purchase price");
  assert.equal(rent.label, "Maximum annual rent");
  assert.equal(shortLet.label, "Maximum nightly rate");
  assert.equal(rent.suffix, listingPurposeSuffix("rent"));
  assert.equal(shortLet.suffix, listingPurposeSuffix("short-let"));
  assert.ok(rent.options.includes(500_000));
  assert.ok(shortLet.options.includes(50_000));
  assert.ok(sale.options.includes(100_000_000));
  assert.equal(searchPurpose("invalid"), "sale");
  assert.equal(searchPurpose("rent"), "rent");
  assert.equal(searchPurpose("short-let"), "short-let");
});
