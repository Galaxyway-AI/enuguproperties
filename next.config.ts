import type { NextConfig } from "next";
const config: NextConfig = {
  ...(process.env.npm_lifecycle_event === "build"
    ? {
        turbopack: {
          resolveAlias: {
            "cloudflare:workers": "./lib/cloudflare-workers-next-shim.ts",
          },
        },
      }
    : {}),
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.neon.tech https://challenges.cloudflare.com https://upload.cloudflarestream.com; frame-src 'self' https://challenges.cloudflare.com https://*.cloudflarestream.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
      ...["/api/media/:path*", "/api/private-media/:path*"].map((source) => ({
        source,
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; media-src 'self' blob:; frame-ancestors 'self'",
          },
        ],
      })),
    ];
  },
};
export default config;
