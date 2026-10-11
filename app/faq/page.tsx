import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Faq } from "@/components/faq";
import { business, whatsappUrl, diasporaWhatsappUrl } from "@/lib/business";
import { faqItems, faqStructuredData } from "@/lib/faq";
import { jsonLd } from "@/lib/seo";
import "@/components/trust-content.css";

const description =
  "Answers about searching Enugu properties, the first free Plus advert, listing review, optional documents, inspections and support in Nigeria and abroad.";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | Enugu Properties",
    description,
    url: "/faq",
    type: "website",
    images: [{ url: "/logo_long.png", alt: business.brandName }],
  },
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqStructuredData(faqItems)) }}
      />
      <header className="page-heading">
        <div className="container">
          <span className="eyebrow">HELP WITH YOUR NEXT STEP</span>
          <h1>Questions? Start here.</h1>
          <p>
            Straightforward answers about finding a property, placing an advert
            and getting support. Still need a hand? Speak to us.
          </p>
        </div>
      </header>
      <section className="container section visitor-faq-page">
        <nav className="visitor-faq-topics" aria-label="FAQ topics">
          <a href="#browsing">Finding a property</a>
          <a href="#first-plus">Advertising and offers</a>
          <a href="#verification">Review and verification</a>
          <a href="#enquiries">Enquiries and inspections</a>
          <a href="#diaspora">Support from abroad</a>
        </nav>
        <Faq />
        <aside className="visitor-support-banner">
          <MessageCircle size={28} aria-hidden="true" />
          <div>
            <h2>Let’s help you move forward.</h2>
            <p>
              Contact us about your account, an advert, a property enquiry or an
              inspection.
            </p>
            <div className="visitor-inline-links">
              <a href={`mailto:${business.supportEmail}`}>
                {business.supportEmail}
              </a>
              <a href={whatsappUrl("Hello Enugu Properties, I have a question.")}>
                Nigeria WhatsApp
              </a>
              <a href={diasporaWhatsappUrl("Hello Enugu Properties, I would like support from abroad.")}>
                Diaspora WhatsApp
              </a>
            </div>
          </div>
          <Link className="button" href="/contact">
            Contact us <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </aside>
      </section>
    </>
  );
}
