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
  "/robots.txt",
  "/sitemap.xml",
];
for (let i = 0; i < pages.length; i += 4) {
  await Promise.all(
    pages.slice(i, i + 4).map(async (path) => {
      const r = await fetch(base + path);
      assert.equal(r.status, 200, `${path} should render`);
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
console.log(
  `PASS: ${pages.length} page routes, 404, CSRF, job authentication, webhook authentication and media protection.`,
);
