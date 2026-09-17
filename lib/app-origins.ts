const productionHostnames = [
  "enuguproperties.com",
  "www.enuguproperties.com",
] as const;

function isProductionHostname(hostname: string) {
  return productionHostnames.includes(
    hostname as (typeof productionHostnames)[number],
  );
}

export function trustedAppOrigins(configuredUrl: string, requestUrl?: string) {
  const configured = new URL(configuredUrl);
  const origins = new Set([configured.origin]);
  const request = requestUrl ? new URL(requestUrl) : null;
  if (
    isProductionHostname(configured.hostname) ||
    (request && isProductionHostname(request.hostname))
  )
    for (const hostname of productionHostnames) {
      const alias = new URL("https://enuguproperties.com");
      alias.hostname = hostname;
      origins.add(alias.origin);
    }
  return [...origins];
}

export function trustedAppHostnames(
  configuredUrl: string,
  requestUrl?: string,
) {
  return trustedAppOrigins(configuredUrl, requestUrl).map(
    (origin) => new URL(origin).hostname,
  );
}

export function isTrustedAppOrigin(
  origin: string | null,
  configuredUrl: string,
  requestUrl?: string,
) {
  if (!origin) return false;
  let normalised: string;
  try {
    normalised = new URL(origin).origin;
  } catch {
    return false;
  }
  return trustedAppOrigins(configuredUrl, requestUrl).includes(normalised);
}
