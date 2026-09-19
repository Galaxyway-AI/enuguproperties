import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  ScanSearch,
  MapPin,
  Globe2,
  FileCheck2,
  Users,
  Check,
  Home as HomeIcon,
  Building2,
  Mountain,
  Store,
  CalendarDays,
  KeyRound,
  Gift,
} from "lucide-react";
import { getAreas, getHomepageProperties, isDemo } from "@/lib/catalogue";
import { SearchForm } from "@/components/search";
import { PropertyCard } from "@/components/property-card";
import { business } from "@/lib/business";
import type { Metadata } from "next";
import { jsonLd, siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Property for Sale & Rent in Enugu, Nigeria",
  description: "Search houses, land, flats, commercial property, rentals and short lets in Enugu. Browse reviewed adverts and request inspections.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "Property for Sale & Rent in Enugu, Nigeria", description: "Search current property adverts across Enugu and understand the checks available before you proceed." },
};
export default async function Home() {
  const [areas, properties] = await Promise.all([
    getAreas(),
    getHomepageProperties(6),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: business.brandName,
            legalName: business.legalName,
            taxID: business.rcNumber,
            email: business.supportEmail,
            telephone: business.whatsappE164,
            url: siteUrl,
          }),
        }}
      />
      <section className="marketplace-hero">
        <div className="container marketplace-hero-inner">
          <span className="marketplace-kicker">
            <ShieldCheck size={15} /> Enugu’s local property marketplace
          </span>
          <h1>Find the right property in Enugu.</h1>
          <p>
            Search homes, land and commercial property to buy, rent or book for
            a short stay.
          </p>
          <SearchForm areas={areas} hero />
          <div className="marketplace-actions">
            <span>Have a property?</span>
            <Link className="button light" href="/register">
              Register to advertise <ArrowUpRight size={18} />
            </Link>
            <Link className="marketplace-signin" href="/login">
              Already registered? Sign in
            </Link>
          </div>
        </div>
      </section>
      <section className="new-member-offer">
        <div className="container new-member-offer-inner">
          <span className="offer-icon" aria-hidden="true">
            <Gift size={27} />
          </span>
          <div>
            <span className="eyebrow">NEW MEMBER OFFER</span>
            <h2>Your first Plus property advert is FREE.</h2>
            <p>
              Register as a new member and choose Plus for your first listing.
              Your free offer is applied automatically, giving you more photos,
              video and 45 days of advertising.
            </p>
          </div>
          <div className="offer-actions">
            <Link className="button" href="/register">
              Register and advertise <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/pricing">
              View advertising plans <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <div className="container">
          <div>
            <ShieldCheck /> <span>Reviewed before publication</span>
          </div>
          <div>
            <MapPin />
            <span>Local inspection support</span>
          </div>
          <div>
            <FileCheck2 />
            <span>Clear verification records</span>
          </div>
          <div>
            <Users />
            <span>People behind the process</span>
          </div>
        </div>
      </section>
      <section className="section container browse-types">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BROWSE BY TYPE</span>
            <h2>What kind of property are you looking for?</h2>
            <p>Go straight to the search that matches your plans.</p>
          </div>
        </div>
        <div className="type-card-grid">
          {[
            [
              HomeIcon,
              "Houses",
              "/houses-for-sale/enugu",
              "Homes to buy",
            ],
            [
              Building2,
              "Flats & apartments",
              "/flats-for-sale/enugu",
              "Flats to buy",
            ],
            [
              Mountain,
              "Land & plots",
              "/land-for-sale/enugu",
              "Land for sale",
            ],
            [
              Store,
              "Commercial",
              "/commercial-property/enugu",
              "Business property",
            ],
            [
              CalendarDays,
              "Short lets",
              "/short-lets/enugu",
              "Book short stays",
            ],
            [KeyRound, "Rentals", "/property-for-rent/enugu", "Browse rentals"],
          ].map(([Icon, title, href, copy]) => {
            const TypeIcon = Icon as typeof HomeIcon;
            return (
              <Link
                className="type-card"
                href={href as string}
                key={title as string}
              >
                <span>
                  <TypeIcon size={26} />
                </span>
                <h3>{title as string}</h3>
                <p>{copy as string}</p>
                <ArrowUpRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FEATURED PROPERTIES</span>
            <h2>Featured places across Enugu.</h2>
            <p>
              Paid and featured adverts appear first, with fresh listings added
              when space is available.
            </p>
          </div>
          <Link className="text-link" href="/properties">
            View all properties <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="category-tabs">
          <Link className="active" href="/properties">
            All properties
          </Link>
          <Link href="/houses-for-sale/enugu">Houses</Link>
          <Link href="/land-for-sale/enugu">Land</Link>
          <Link href="/commercial-property/enugu">Commercial</Link>
          <Link href="/properties/new-developments">New developments</Link>
        </div>
        {properties.length ? (
          <div className="property-grid">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ScanSearch size={32} />
            <h3>Good properties deserve a proper introduction.</h3>
            <p>
              New listings will appear here after review. Start by exploring the
              areas you’re interested in.
            </p>
            <Link className="button" href="/areas">
              Explore Enugu <ArrowRight size={17} />
            </Link>
          </div>
        )}
        <p className="section-footnote">
          Featured placement is advertising. It does not indicate property
          verification.
          {isDemo()
            ? " These examples demonstrate the marketplace experience."
            : ""}
        </p>
      </section>
      <section className="confidence-section">
        <div className="container confidence-grid">
          <div>
            <span className="eyebrow">A BETTER WAY TO BUY</span>
            <h2>
              Confidence comes
              <br />
              from asking the
              <br />
              <em>right questions.</em>
            </h2>
            <p>
              Buying property is a big decision. We make the checks, people and
              next steps easier to understand.
            </p>
            <Link className="text-link" href="/verification">
              Understand our verification <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="trust-steps">
            {[
              [
                ShieldCheck,
                "A reviewed listing is the starting point",
                "Listings are reviewed before publication. This is separate from checking ownership or legal title.",
              ],
              [
                MapPin,
                "See more than the photographs",
                "Request an inspection and understand the property’s condition, access and surroundings.",
              ],
              [
                FileCheck2,
                "Know exactly what has been checked",
                "Each completed verification records its scope and date. Professional due diligence helps you make an informed decision.",
              ],
            ].map(([Icon, title, copy], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div className="trust-step" key={i}>
                  <span className="step-icon">
                    <I size={24} />
                  </span>
                  <div>
                    <h3>{title as string}</h3>
                    <p>{copy as string}</p>
                  </div>
                  <span className="step-number">0{i + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LOCAL KNOWLEDGE, NEW POSSIBILITIES</span>
            <h2>Find your corner of Enugu.</h2>
            <p>Start with the neighbourhood. Discover what’s available.</p>
          </div>
          <Link className="text-link" href="/areas">
            Explore all areas <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="area-grid">
          {areas.slice(0, 6).map((a, i) => (
            <Link href={`/areas/${a.slug}`} key={a.slug} className="area-card">
              <span className="area-index">0{i + 1}</span>
              <MapPin size={23} />
              <h3>{a.name}</h3>
              <span>
                Explore properties <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="container diaspora-section">
        <div className="diaspora-art">
          <Globe2 size={125} strokeWidth={0.7} />
          <span>ENUGU, WHEREVER YOU ARE.</span>
        </div>
        <div>
          <span className="eyebrow">FAR FROM HOME. CLOSER TO CONFIDENCE.</span>
          <h2>
            Your next chapter in Enugu.
            <br />
            Even from miles away.
          </h2>
          <p>
            Buying from outside Nigeria takes extra care. Explore how local
            inspections, clear records and independent professional advice can
            support your journey.
          </p>
          <Link className="button light" href="/buying-from-abroad">
            Buying property from abroad <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section container seller-strip">
        <div>
          <span className="eyebrow">
            FOR PROPERTY OWNERS, AGENTS & DEVELOPERS
          </span>
          <h2>The right introduction starts here.</h2>
          <p>List your property. Reach buyers. Stay informed at every step.</p>
        </div>
        <Link className="button" href="/sell">
          Sell your property <ArrowUpRight size={18} />
        </Link>
      </section>
      <div className="safety-bar">
        <div className="container">
          <Check size={18} />
          <span>
            Before you pay, inspect and verify. Always seek appropriate
            professional advice.
          </span>
          <Link href="/safety">
            Read our safety guide <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </>
  );
}
