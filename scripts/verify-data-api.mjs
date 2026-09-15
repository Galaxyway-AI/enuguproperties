const targets = {
  staging: {
    host: "ep-crimson-block-za1a50ot.apirest.c-2.eu-west-2.aws.neon.tech",
    origin: "https://enugu-properties.emailgalaxyway.workers.dev",
  },
  production: {
    host: "ep-holy-sound-zaigrb4x.apirest.c-2.eu-west-2.aws.neon.tech",
    origin: "https://enuguproperties.com",
  },
};
const target = targets[process.env.VERIFY_DATA_API_ENV || "staging"];
if (!target) throw new Error("VERIFY_DATA_API_ENV must be staging or production");
const endpoint = process.env.NEON_DATA_API_URL;
const authEndpoint = process.env.NEON_AUTH_BASE_URL;
if (!endpoint) throw new Error("NEON_DATA_API_URL is required");
if (!authEndpoint) throw new Error("NEON_AUTH_BASE_URL is required");
if (new URL(endpoint).hostname !== target.host)
  throw new Error("Refusing verification: endpoint does not match the selected environment");

const tokenResponse = await fetch(`${authEndpoint}/token/anonymous`, {
  headers: { Origin: target.origin },
});
if (!tokenResponse.ok)
  throw new Error(`Anonymous token request failed with ${tokenResponse.status}`);
const tokenPayload = await tokenResponse.json();
if (typeof tokenPayload.token !== "string")
  throw new Error("Anonymous token response did not contain a token");

const checks = [
  { resource: "public_properties?select=id,slug&limit=1", allowed: true },
  { resource: "locations?select=id,slug&limit=1", allowed: true },
  { resource: "profiles?select=id&limit=1", allowed: false },
  { resource: "property_private?select=property_id&limit=1", allowed: false },
  { resource: "property_documents?select=id&limit=1", allowed: false },
  { resource: "schema_migrations?select=*&limit=1", allowed: false },
];

const results = [];
for (const check of checks) {
  const response = await fetch(`${endpoint}/${check.resource}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${tokenPayload.token}`,
    },
  });
  const body = await response.text();
  const passed = check.allowed ? response.ok : !response.ok;
  results.push({
    resource: check.resource.split("?")[0],
    expected: check.allowed ? "allowed" : "blocked",
    status: response.status,
    error: response.ok ? undefined : body.slice(0, 240),
    passed,
  });
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => !result.passed)) process.exitCode = 1;
