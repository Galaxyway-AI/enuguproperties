export default function unavailableNativeModule() {
  throw new Error(
    "Native media processing is unavailable in the Cloudflare Worker runtime.",
  );
}
