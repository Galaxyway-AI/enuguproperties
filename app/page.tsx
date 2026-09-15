import Image from "next/image";
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
} from "lucide-react";
import { getAreas, getProperties, isDemo } from "@/lib/catalogue";
import { heroImage } from "@/lib/demo";
import { SearchForm } from "@/components/search";
import { PropertyCard } from "@/components/property-card";
import { business } from "@/lib/business";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [areas, { properties }] = await Promise.all([
    getAreas(),
    getProperties(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: business.brandName,
            legalName: business.legalName,
            taxID: business.rcNumber,
            email: business.supportEmail,
            telephone: business.whatsappE164,
            url:
              process.env.NEXT_PUBLIC_APP_URL || "https://enuguproperties.com",
          }).replace(/</g, "\\u003c"),
        }}
      />
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> YOUR NEXT CHAPTER STARTS HERE
            </div>
            <h1>
              Find property
              <br />
              in Enugu.
              <br />
              <em>With confidence.</em>
            </h1>
            <p>
              A place to call home. Land to build a future.
              <br className="desktop-only" /> Explore Enugu property with local
              knowledge
              <br className="desktop-only" /> and a clearer picture of what
              you’re buying.
            </p>
            <div className="hero-links">
              <Link href="/properties" className="text-link">
                Explore properties <ArrowUpRight size={20} />
              </Link>
              <Link href="/how-it-works" className="subtle-link">
                How it works
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <Image
              src={heroImage}
              alt="Modern tropical home with a green lawn, illustrative architecture"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
            />
            <div className="hero-photo-caption">
              A little closer to your next chapter.
            </div>
            <div className="hero-trust-note">
              <span className="trust-icon">
                <ShieldCheck size={25} />
              </span>
              <div>
                <strong>More clarity. Greater confidence.</strong>
                <span>Know what’s been checked, and what hasn’t.</span>
              </div>
            </div>
            <span className="image-credit">Illustrative photography</span>
          </div>
        </div>
        <div className="container hero-search">
          <SearchForm areas={areas} />
          <div className="popular-searches">
            <span>Popular searches</span>
            <Link href="/properties?category=houses&area=independence-layout">
              Homes in Independence Layout
            </Link>
            <Link href="/properties?category=land&area=emene">
              Land in Emene
            </Link>
            <Link href="/properties?category=houses&area=trans-ekulu">
              Trans Ekulu
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
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR PLACE</span>
            <h2>A home. A plot. A possibility.</h2>
            <p>Explore a selection of property across Enugu.</p>
          </div>
          <Link className="text-link" href="/properties">
            View all properties <ArrowUpRight size={19} />
          </Link>
        </div>
        <div className="category-tabs">
          <Link className="active" href="/properties">
            All properties
          </Link>
          <Link href="/properties/houses">Houses</Link>
          <Link href="/properties/land">Land</Link>
          <Link href="/properties/commercial">Commercial</Link>
          <Link href="/properties/new-developments">New developments</Link>
        </div>
        {properties.length ? (
          <div className="property-grid">
            {properties.slice(0, 3).map((p) => (
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
