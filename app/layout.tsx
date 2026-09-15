import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { isDemo } from "@/lib/catalogue";
import "./globals.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://enuguproperties.com",
  ),
  title: {
    default: "Enugu Properties | Find property with confidence",
    template: "%s | Enugu Properties",
  },
  description:
    "Explore houses, land and commercial property in Enugu. Understand listing reviews, property inspections and professional due diligence.",
  openGraph: { siteName: "Enugu Properties", locale: "en_NG", type: "website" },
  twitter: { card: "summary" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const turnstileKeyName = "NEXT_PUBLIC_TURNSTILE_SITE_KEY";
  const turnstileSiteKey = process.env[turnstileKeyName];
  return (
    <html lang="en-NG">
      <body data-turnstile-site-key={turnstileSiteKey}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {isDemo() && (
          <div className="demo-banner">
            Development preview · Fictional listings and illustrative
            photography. No properties are offered for sale.
          </div>
        )}
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
