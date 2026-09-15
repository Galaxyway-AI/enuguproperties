// Next's Node build cannot resolve the Cloudflare runtime-only module. Vinext
// does not use this shim and externalises cloudflare:workers for workerd.
export const env = {} as {
  MEDIA?: never;
  PRIVATE_MEDIA?: never;
};
