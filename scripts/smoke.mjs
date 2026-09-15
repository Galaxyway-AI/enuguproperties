import assert from "node:assert/strict";
const base = process.env.SMOKE_URL || "http://127.0.0.1:3000";
const pages = [
  "/",
  "/properties",
  "/properties/houses",
  "/properties/land",
  "/properties/commercial",
  "/areas",
  "/areas/emene",
  "/verification",
  "/safety",
  "/about",
  "/sell",
  "/pricing",
  "/how-it-works",
  "/buying-from-abroad",
  "/market-insights",
  "/contact",
  "/login",
  "/register",
  "/reset-password",
  "/account/dashboard",
  "/account/listings/new",
  "/admin",
  "/legal/privacy",
  "/legal/terms",
  "/legal/seller-terms",
  "/robots.txt",
  "/sitemap.xml",
];
for (let i = 0; i < pages.length; i += 4) {
  await Promise.all(
    pages.slice(i, i + 4).map(async (path) => {
      const r = await fetch(base + path);
      assert.equal(r.status, 200, `${path} should render`);
      const protectedPage = path.startsWith("/account/") || path === "/admin";
      assert.equal(
        new URL(r.url).pathname,
        protectedPage ? "/login" : path,
        `${path} should not redirect unexpectedly`,
      );
      const text = await r.text();
      assert.ok(
        !text.includes("Build Error"),
        `${path} must not contain a build error`,
      );
    }),
  );
}
assert.equal((await fetch(base + "/missing-page")).status, 404);
assert.equal(
  (
    await fetch(base + "/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  ).status,
  403,
);
assert.equal((await fetch(base + "/api/jobs", { method: "POST" })).status, 401);
assert.equal(
  (await fetch(base + "/api/payments/webhook", { method: "POST", body: "{}" }))
    .status,
  401,
);
assert.equal((await fetch(base + "/api/media/not-a-uuid")).status, 404);

const health = await fetch(base + "/api/health");
assert.equal(health.status, 200, "/api/health should report healthy");
assert.equal((await health.json()).status, "ok");

if (new URL(base).hostname === "enuguproperties.com") {
  const root = await fetch(base + "/", { redirect: "manual" });
  assert.equal(root.status, 200);
  assert.match(root.headers.get("strict-transport-security") || "", /max-age=/);
  assert.match(root.headers.get("link") || "", /rel="canonical"/);

  const www = await fetch("https://www.enuguproperties.com/safety?source=smoke", {
    redirect: "manual",
  });
  assert.equal(www.status, 308, "www should permanently redirect to apex");
  assert.equal(
    www.headers.get("location"),
    "https://enuguproperties.com/safety?source=smoke",
  );

  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.doesNotMatch(robots, /^disallow:\s*\/\s*$/im);

  const register = await (await fetch(base + "/register")).text();
  if (process.env.EXPECT_REGISTRATION === "true") {
    assert.match(register, /Create account/);
    assert.doesNotMatch(register, /Seller registration is opening shortly/);
  } else {
    assert.match(register, /Seller registration is opening shortly/);
  }

  const pricing = await (await fetch(base + "/pricing")).text();
  assert.match(pricing, /Paid plans are launching shortly/);

  const contact = await (await fetch(base + "/contact")).text();
  assert.match(contact, /challenges\.cloudflare\.com\/turnstile/);
} else if (new URL(base).hostname.endsWith(".workers.dev")) {
  const root = await fetch(base + "/");
  assert.match(root.headers.get("x-robots-tag") || "", /noindex/i);

  const robots = await (await fetch(base + "/robots.txt")).text();
  assert.match(robots, /^disallow:\s*\/\s*$/im);
}
console.log(
  `PASS: ${pages.length} page routes, health, 404, CSRF, job authentication, webhook authentication, media protection and production guards.`,
);
