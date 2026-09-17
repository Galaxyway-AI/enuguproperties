const productionHostnames = [
  "enuguproperties.com",
  "www.enuguproperties.com",
] as const;

export function trustedAppOrigins(configuredUrl: string) {
  const configured = new URL(configuredUrl);
  const origins = new Set([configured.origin]);
  if (
    productionHostnames.includes(
      configured.hostname as (typeof productionHostnames)[number],
    )
  )
    for (const hostname of productionHostnames) {
      const alias = new URL(configured.origin);
      alias.hostname = hostname;
      origins.add(alias.origin);
    }
  return [...origins];
}

export function trustedAppHostnames(configuredUrl: string) {
  return trustedAppOrigins(configuredUrl).map(
    (origin) => new URL(origin).hostname,
  );
}

export function isTrustedAppOrigin(
  origin: string | null,
  configuredUrl: string,
) {
  return Boolean(origin && trustedAppOrigins(configuredUrl).includes(origin));
}
