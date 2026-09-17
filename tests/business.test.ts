import test from "node:test";
import assert from "node:assert/strict";
import {
  appUrl,
  business,
  diasporaWhatsappUrl,
  whatsappUrl,
} from "../lib/business";
import { validTurnstileResult } from "../lib/turnstile";
import { registrationErrorMessage } from "../lib/registration-errors";
import {
  isTrustedAppOrigin,
  trustedAppHostnames,
  trustedAppOrigins,
} from "../lib/app-origins";

test("confirmed business identity and contact routing are canonical", () => {
  assert.equal(business.legalName, "MAGENCY ONLINE SOLUTIONS LTD.");
  assert.equal(business.rcNumber, "8229228");
  assert.equal(business.supportEmail, "support@enuguproperties.com");
  assert.equal(business.diasporaEmail, "diaspora@enuguproperties.com");
  const url = new URL(whatsappUrl("Property EP-2026-000142"));
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/2348037718967");
  assert.equal(url.searchParams.get("text"), "Property EP-2026-000142");
  const diasporaUrl = new URL(diasporaWhatsappUrl("Diaspora enquiry"));
  assert.equal(diasporaUrl.hostname, "wa.me");
  assert.equal(diasporaUrl.pathname, "/447777243332");
  assert.equal(diasporaUrl.searchParams.get("text"), "Diaspora enquiry");
});

test("production email links cannot fall back to localhost", () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = process.env.NODE_ENV;
  const previousUrl = process.env.NEXT_PUBLIC_APP_URL;
  try {
    env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000";
    assert.equal(
      appUrl("/account/dashboard"),
      "https://enuguproperties.com/account/dashboard",
    );
  } finally {
    if (previousNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousNodeEnv;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previousUrl;
  }
});

test("Turnstile requires success, hostname and action", () => {
  const valid = {
    success: true,
    hostname: "staging.example",
    action: "register",
  };
  assert.equal(
    validTurnstileResult(valid, "staging.example", "register"),
    true,
  );
  assert.equal(validTurnstileResult(valid, "other.example", "register"), false);
  assert.equal(validTurnstileResult(valid, "staging.example", "reset"), false);
  assert.equal(
    validTurnstileResult(
      { ...valid, hostname: "www.enuguproperties.com" },
      ["enuguproperties.com", "www.enuguproperties.com"],
      "register",
    ),
    true,
  );
  assert.equal(
    validTurnstileResult(
      { ...valid, success: false },
      "staging.example",
      "register",
    ),
    false,
  );
});

test("registration errors explain common account-service failures", () => {
  assert.match(
    registrationErrorMessage({ code: "USER_ALREADY_EXISTS", message: "Failed" }),
    /already uses this email/i,
  );
  assert.match(
    registrationErrorMessage({ code: "OVER_REQUEST_RATE_LIMIT", status: 429 }),
    /wait 10 minutes/i,
  );
  assert.match(
    registrationErrorMessage({ code: "UNTRUSTED_ORIGIN" }),
    /confirmation-link address/i,
  );
  assert.match(
    registrationErrorMessage({ code: "FEATURE_NOT_SUPPORTED", status: 403 }),
    /email registration is not enabled/i,
  );
  assert.match(
    registrationErrorMessage({ code: "FAILED_TO_CREATE_USER", status: 500 }),
    /could not save this registration/i,
  );
});

test("official apex and www origins are accepted without trusting other hosts", () => {
  assert.deepEqual(trustedAppOrigins("https://enuguproperties.com"), [
    "https://enuguproperties.com",
    "https://www.enuguproperties.com",
  ]);
  assert.deepEqual(trustedAppHostnames("https://enuguproperties.com"), [
    "enuguproperties.com",
    "www.enuguproperties.com",
  ]);
  assert.equal(
    isTrustedAppOrigin(
      "https://www.enuguproperties.com",
      "https://enugu-properties.emailgalaxyway.workers.dev",
      "https://enuguproperties.com/api/auth",
    ),
    true,
  );
  assert.equal(
    isTrustedAppOrigin(
      "https://attacker.example",
      "https://enugu-properties.emailgalaxyway.workers.dev",
      "https://enuguproperties.com/api/auth",
    ),
    false,
  );
  assert.deepEqual(
    trustedAppHostnames(
      "https://enugu-properties.emailgalaxyway.workers.dev",
      "https://www.enuguproperties.com/register",
    ),
    [
      "enugu-properties.emailgalaxyway.workers.dev",
      "enuguproperties.com",
      "www.enuguproperties.com",
    ],
  );
  assert.deepEqual(trustedAppOrigins("https://staging.example"), [
    "https://staging.example",
  ]);
});
