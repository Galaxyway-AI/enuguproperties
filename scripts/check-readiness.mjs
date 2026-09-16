const first = (...keys) => keys.find((key) => process.env[key]) || keys[0];
const checks = [
  ["Application URL", "NEXT_PUBLIC_APP_URL", (v) => /^https:\/\//.test(v)],
  [
    "Neon Data API",
    first("NEON_DATA_API_URL", "NEXT_PUBLIC_NEON_DATA_API_URL"),
    (v) => /^https:\/\//.test(v),
  ],
  ["Neon Auth", "NEXT_PUBLIC_NEON_AUTH_URL", (v) => /^https:\/\//.test(v)],
  ["Server database connection", "DATABASE_URL", Boolean],
  ["Email provider", "EMAIL_API_KEY", Boolean],
  ["Turnstile site key", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", Boolean],
  ["Turnstile secret", "TURNSTILE_SECRET_KEY", Boolean],
  [
    "Kora test secret",
    "KORAPAY_SECRET_KEY",
    (v) => v.startsWith("sk_test_"),
  ],
  ["Maintenance secret", "CRON_SECRET", (v) => v.length >= 24],
  ["Private media signing secret", "MEDIA_SIGNING_SECRET", (v) => v.length >= 32],
];

const results = checks.map(([name, key, validate]) => {
  const value = process.env[key] || "";
  return { name, key, ready: Boolean(validate(value)) };
});
const productionGuards = {
  koraMode: (process.env.KORAPAY_MODE || "test") === "test",
  liveOverrideDisabled: process.env.ALLOW_KORAPAY_LIVE !== "true",
  previewNoindex: process.env.PREVIEW_MODE === "true",
  betaMode: process.env.BETA_MODE === "true",
};

console.log(JSON.stringify({ checks: results, productionGuards }, null, 2));
if (
  results.some((result) => !result.ready) ||
  Object.values(productionGuards).some((ready) => !ready)
)
  process.exitCode = 1;
