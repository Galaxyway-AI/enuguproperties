import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Globe2, ShieldCheck, MessageCircle, Search, Camera } from "lucide-react";
import { business, whatsappUrl, diasporaWhatsappUrl } from "@/lib/business";
import { content } from "@/lib/content";
import { configured, db } from "@/lib/supabase";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";
import "@/components/trust-content.css";

const storedAbout = cache(async () => {
  if (!configured()) return null;
  const { data } = await (await db())
    .from("content_pages")
    .select("title,description,content,seo_title,meta_description,social_image,indexable,canonical_override")
    .eq("slug", "about")
    .eq("published", true)
    .maybeSingle();
  return data;
});

const description =
  "Meet the business behind Enugu Properties. Find homes, land, rentals and short lets, understand listing review and verification, and contact Nigeria or diaspora support.";

export async function generateMetadata(): Promise<Metadata> {
  const stored = await storedAbout();
  const title = stored?.seo_title || "About Enugu Properties";
  const pageDescription = stored?.meta_description || description;
  const canonical = stored?.canonical_override || "/about";
  return {
    title,
    description: pageDescription,
    alternates: { canonical },
    robots: stored && !stored.indexable ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description: pageDescription,
      url: canonical,
      type: "website",
      images: [{ url: stored?.social_image || "/logo_long.png", alt: business.brandName }],
    },
  };
}

export default async function AboutPage() {
  const stored = await storedAbout();
  const about = content.about;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": `${siteUrl}/about#page`,
            url: absoluteUrl("/about"),
            name: "About Enugu Properties",
            description,
            about: { "@id": `${siteUrl}/#organization` },
            isPartOf: { "@id": `${siteUrl}/#website` },
          }),
        }}
      />
      <header className="page-heading visitor-about-heading">
        <div className="container">
          <span className="eyebrow">{about.eyebrow}</span>
          <h1>{stored?.title || about.title}</h1>
          <p>{stored?.description || about.intro}</p>
          <div className="visitor-heading-actions">
            <Link className="button" href="/properties">
              Find a property <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link className="button secondary" href="/contact">Speak to us</Link>
          </div>
        </div>
      </header>
      <section className="container section visitor-about">
        <div className="visitor-about-intro">
          <article className="visitor-story">
            <span className="eyebrow">WHY WE ARE HERE</span>
            <h2>A clearer way to find your place in Enugu.</h2>
            {stored?.content ? (
              <p className="visitor-stored-story">{stored.content}</p>
            ) : (
              <>
                <p>
                  Searching for a home, a plot of land or a space for your business
                  should begin with useful information and a clear way to ask
                  questions. Enugu Properties brings sale, rental and short-let
                  adverts together in one marketplace focused on Enugu.
                </p>
                <p>
                  Owners, authorised agents and developers can advertise their
                  properties. Visitors can compare adverts, read the available
                  records and ask our property team about the next step, wherever
                  they are based.
                </p>
              </>
            )}
            <Link className="text-link" href="/how-it-works">
              See how the platform works <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </article>
          <aside className="visitor-business-card" aria-labelledby="business-identity">
            <Building2 size={30} aria-hidden="true" />
            <h2 id="business-identity">The business behind the platform</h2>
            <p>{business.brandName} is operated by:</p>
            <strong>{business.legalName}</strong>
            <dl>
              <div><dt>Company registration</dt><dd>RC {business.rcNumber}</dd></div>
              <div><dt>Company type</dt><dd>Private company limited by shares</dd></div>
              <div>
                <dt>Registered address</dt>
                <dd>{business.registeredAddress.join(", ")}</dd>
              </div>
            </dl>
            <p className="visitor-small-copy">
              This is our company’s registered address. Property inspections take
              place at the relevant property by confirmed appointment.
            </p>
          </aside>
        </div>

        <section className="visitor-values" aria-labelledby="platform-services">
          <h2 id="platform-services">Useful information. Clear next steps.</h2>
          <div className="visitor-value-grid">
            <article>
              <Search size={27} aria-hidden="true" />
              <h3>Find what fits</h3>
              <p>Search homes, land and commercial space to buy, rent or book for a short stay, by area, property type and budget.</p>
            </article>
            <article>
              <Camera size={27} aria-hidden="true" />
              <h3>Advertise with clarity</h3>
              <p>Start with essential property facts, photographs and your advertising plan. Add more details if you wish and submit your advert for review.</p>
            </article>
            <article>
              <MessageCircle size={27} aria-hidden="true" />
              <h3>Ask about the next step</h3>
              <p>Send a property enquiry, request an inspection or contact support. Confirm availability, the scope of the service and any fees before booking.</p>
            </article>
          </div>
        </section>

        <section className="visitor-verification-note" aria-labelledby="review-explained">
          <ShieldCheck size={32} aria-hidden="true" />
          <div>
            <span className="eyebrow">UNDERSTAND THE RECORD</span>
            <h2 id="review-explained">Review and verification answer different questions.</h2>
            <p>
              Staff review adverts before publication. A reviewed listing means
              the submitted advert has passed that review; it does not by itself
              establish legal ownership, title or property condition.
            </p>
            <p>
              Verification badges refer to specific recorded checks, such as
              identity, marketing authority, site inspection or document review.
              Read the scope, date and outcome of each check. Paying for
              advertising or featured placement does not buy a verification
              result.
            </p>
            <p>
              Enugu Properties is not a government registry and does not replace
              independent advice from a solicitor, surveyor or other suitably
              qualified professional.
            </p>
            <div className="visitor-inline-links">
              <Link href="/verification">Understand verification</Link>
              <Link href="/safety">Read our property safety guide</Link>
            </div>
          </div>
        </section>

        <section className="visitor-support" aria-labelledby="support-options">
          <span className="eyebrow">A CONVERSATION STARTS HERE</span>
          <h2 id="support-options">Support in Nigeria and abroad.</h2>
          <p>Choose the contact that fits your enquiry, or send us a message through the website.</p>
          <div className="visitor-support-grid">
            <article className="visitor-contact-card">
              <MessageCircle size={27} aria-hidden="true" />
              <h3>Nigeria and general support</h3>
              <p>Help with accounts, advertising, property enquiries, inspections and platform questions.</p>
              <a href={`mailto:${business.supportEmail}`}>{business.supportEmail}</a>
              <a href={`tel:${business.whatsappE164}`}>{business.whatsappDisplay}</a>
              <a className="button secondary" href={whatsappUrl("Hello Enugu Properties, I would like assistance.")}>Chat on WhatsApp</a>
            </article>
            <article className="visitor-contact-card">
              <Globe2 size={27} aria-hidden="true" />
              <h3>Diaspora support</h3>
              <p>Discuss your search from abroad and ask about property enquiries and remote inspection coordination.</p>
              <a href={`mailto:${business.diasporaEmail}`}>{business.diasporaEmail}</a>
              <a href={`tel:${business.diasporaWhatsappE164}`}>{business.diasporaWhatsappDisplay}</a>
              <a className="button secondary" href={diasporaWhatsappUrl("Hello Enugu Properties, I would like property support from abroad.")}>Chat on WhatsApp</a>
            </article>
          </div>
          <div className="visitor-heading-actions">
            <Link className="button" href="/contact">Send us a message <ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link className="text-link" href="/faq">Read frequently asked questions <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </section>
      </section>
    </>
  );
}
