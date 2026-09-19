import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { isDemo } from "@/lib/catalogue";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";
import { business } from "@/lib/business";
import "./globals.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Property for Sale & Rent in Enugu, Nigeria | Enugu Properties",
    template: "%s | Enugu Properties",
  },
  description:
    "Explore houses, land and commercial property in Enugu. Understand listing reviews, property inspections and professional due diligence.",
  applicationName: "Enugu Properties",
  icons: { icon: "/icon.png", apple: "/apple-icon.jpg" },
  openGraph: {
    siteName: "Enugu Properties",
    locale: "en_NG",
    type: "website",
    images: [{ url: "/logo_long.png", alt: "Enugu Properties" }],
  },
  twitter: { card: "summary_large_image" },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": `${siteUrl}/#organization`,
                name: business.brandName,
                legalName: business.legalName,
                url: siteUrl,
                logo: absoluteUrl("/logo.png"),
                email: business.supportEmail,
                telephone: business.whatsappE164,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: "House 10, 34V Terraces Estate, Road No. 2, Off Orchid Road",
                  addressLocality: "Lekki",
                  addressRegion: "Lagos",
                  postalCode: "106104",
                  addressCountry: "NG",
                },
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                url: siteUrl,
                name: "Enugu Properties",
                publisher: { "@id": `${siteUrl}/#organization` },
                inLanguage: "en-NG",
              },
            ]),
          }}
        />
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
