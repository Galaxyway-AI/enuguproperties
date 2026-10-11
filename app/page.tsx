import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  ScanSearch,
  MapPin,
  Globe2,
  FileCheck2,
  MessageCircle,
  Check,
  Home as HomeIcon,
  Building2,
  Mountain,
  Store,
  CalendarDays,
  KeyRound,
  Gift,
  Search,
  Camera,
  Send,
} from "lucide-react";
import { getAreas, getHomepageProperties, isDemo } from "@/lib/catalogue";
import { SearchForm } from "@/components/search";
import { PropertyCard } from "@/components/property-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { Faq } from "@/components/faq";
import { homepageFaqItems } from "@/lib/faq";
import { heroSlides } from "@/lib/hero-slides";
import { business, diasporaWhatsappUrl, whatsappUrl } from "@/lib/business";
import type { Metadata } from "next";
import { jsonLd, siteUrl } from "@/lib/seo";
import "@/components/homepage.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Property for Sale & Rent in Enugu, Nigeria",
  description:
    "Search houses, land, flats, commercial property, rentals and short lets in Enugu. Browse reviewed adverts and request inspections.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Property for Sale & Rent in Enugu, Nigeria",
    description:
      "Find your next property in Enugu, with clear listing information and local support.",
  },
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
      <HeroCarousel slides={heroSlides(properties)}>
        <span className="marketplace-kicker">
          <MapPin size={15} /> YOUR NEXT MOVE STARTS HERE
        </span>
        <h1>
          Find your next property
          <br />
          in <span>Enugu.</span>
        </h1>
        <p className="homepage-hero-copy">
          Explore homes, land, rentals and short stays, with clear property
          information and local support.
        </p>
        <SearchForm areas={areas} hero />
        <div className="homepage-hero-actions">
          <Link className="button light" href="/account/listings/new">
            List your property <ArrowUpRight size={18} />
          </Link>
          <Link className="homepage-free-offer" href="/pricing">
            <Gift size={18} />
            <span>
              New members: your first Plus advert is <strong>FREE</strong>
            </span>
          </Link>
        </div>
      </HeroCarousel>

      <section
        className="trust-strip homepage-trust-strip"
        aria-label="Our approach"
      >
        <div className="container">
          <Link href="/how-it-works">
            <ShieldCheck />
            <span>Adverts reviewed before publication</span>
          </Link>
          <Link href="/verification">
            <FileCheck2 />
            <span>Understand the checks recorded</span>
          </Link>
          <Link href="/contact">
            <MapPin />
            <span>Ask about local inspections</span>
          </Link>
          <Link href="/buying-from-abroad">
            <Globe2 />
            <span>Nigeria & diaspora support</span>
          </Link>
        </div>
      </section>

      <section
        className="section container homepage-featured"
        aria-labelledby="featured-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORE THE MARKET</span>
            <h2 id="featured-heading">Featured properties in Enugu.</h2>
            <p>
              A home, an investment, a fresh start. Find a place that fits your
              plans.
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
          <Link href="/houses-for-sale/enugu">Homes to buy</Link>
          <Link href="/land-for-sale/enugu">Land & plots</Link>
          <Link href="/property-for-rent/enugu">Rentals</Link>
          <Link href="/short-lets/enugu">Short lets</Link>
        </div>
        {properties.length ? (
          <div className="property-grid">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ScanSearch size={32} />
            <h3>Your next property search starts here.</h3>
            <p>
              New adverts appear after review. Explore the areas you’re
              interested in or tell us what you’re looking for.
            </p>
            <Link className="button" href="/areas">
              Explore Enugu <ArrowRight size={17} />
            </Link>
          </div>
        )}
        <p className="section-footnote">
          Featured placement is advertising. Check each advert for the specific
          verification work recorded.
          {isDemo()
            ? " These examples demonstrate the marketplace experience."
            : ""}
        </p>
      </section>

      <section className="homepage-browse-band">
        <div className="section container browse-types">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FIND YOUR FIT</span>
              <h2>What are you looking for?</h2>
              <p>Choose a property type and start exploring.</p>
            </div>
          </div>
          <div className="type-card-grid">
            {[
              [HomeIcon, "Houses", "/houses-for-sale/enugu", "Homes to buy"],
              [
                Building2,
                "Flats & apartments",
                "/flats-for-sale/enugu",
                "Find your own space",
              ],
              [
                Mountain,
                "Land & plots",
                "/land-for-sale/enugu",
                "Room for your plans",
              ],
              [
                Store,
                "Commercial",
                "/commercial-property/enugu",
                "Space for your business",
              ],
              [
                KeyRound,
                "Rentals",
                "/property-for-rent/enugu",
                "Find your next home",
              ],
              [
                CalendarDays,
                "Short lets",
                "/short-lets/enugu",
                "A place for a short stay",
              ],
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
        </div>
      </section>

      <section
        className="section container homepage-process"
        aria-labelledby="process-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">SIMPLE STEPS, CLEAR NEXT MOVES</span>
            <h2 id="process-heading">How Enugu Properties works.</h2>
            <p>
              Whether you’re looking for a property or advertising one, start
              here.
            </p>
          </div>
          <Link className="text-link" href="/how-it-works">
            See the full guide <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="homepage-journeys">
          <article className="homepage-journey">
            <span className="eyebrow">FINDING A PROPERTY</span>
            <h3>From browsing to a closer look.</h3>
            <ol>
              <li>
                <Search size={20} />
                <div>
                  <strong>Search your way</strong>
                  <p>
                    Choose Buy, Rent or Short let, then filter by area and
                    budget. Browsing is free.
                  </p>
                </div>
              </li>
              <li>
                <MessageCircle size={20} />
                <div>
                  <strong>Ask about the advert</strong>
                  <p>
                    Read the details and send an enquiry. Your selected property
                    stays with you through sign-in.
                  </p>
                </div>
              </li>
              <li>
                <MapPin size={20} />
                <div>
                  <strong>Inspect and understand the checks</strong>
                  <p>
                    Ask about an inspection, read the recorded checks and
                    arrange advice appropriate to your plans.
                  </p>
                </div>
              </li>
            </ol>
            <Link className="text-link" href="/properties">
              Find a property <ArrowRight size={17} />
            </Link>
          </article>
          <article className="homepage-journey homepage-journey-seller">
            <span className="eyebrow">ADVERTISING A PROPERTY</span>
            <h3>A clearer way to reach interested people.</h3>
            <ol>
              <li>
                <KeyRound size={20} />
                <div>
                  <strong>Create your account</strong>
                  <p>
                    Register and start your first listing. Plus is selected for
                    eligible new members; activate the free offer at checkout.
                  </p>
                </div>
              </li>
              <li>
                <Camera size={20} />
                <div>
                  <strong>Add the essentials and photos</strong>
                  <p>
                    Describe the property, choose your plan and add photographs.
                    Extra details and private documents are optional.
                  </p>
                </div>
              </li>
              <li>
                <Send size={20} />
                <div>
                  <strong>Submit for review</strong>
                  <p>
                    We review the advert before publication. Track its progress
                    and enquiries in your account.
                  </p>
                </div>
              </li>
            </ol>
            <Link className="text-link" href="/account/listings/new">
              Start your advert <ArrowRight size={17} />
            </Link>
          </article>
        </div>
      </section>

      <section className="homepage-confidence">
        <div className="container homepage-confidence-grid">
          <div>
            <span className="eyebrow">KNOW WHAT YOU’RE LOOKING AT</span>
            <h2>
              Clear information.
              <br />
              More informed decisions.
            </h2>
            <p>
              Every advert goes through publication review. Where further checks
              have been completed, you can see what was checked, when, and the
              recorded result.
            </p>
            <Link className="text-link" href="/verification">
              Understand verification <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="homepage-check-cards">
            <article>
              <ShieldCheck size={25} />
              <h3>Publication review</h3>
              <p>
                We review advert information before it appears on the website.
              </p>
            </article>
            <article>
              <FileCheck2 size={25} />
              <h3>Specific checks, explained</h3>
              <p>
                Identity, inspections and document checks each have their own
                scope. See the details on the advert.
              </p>
            </article>
            <article>
              <Check size={25} />
              <h3>Your next steps matter</h3>
              <p>
                Inspect the property and seek appropriate professional advice
                before committing.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">GET TO KNOW ENUGU</span>
            <h2>Find your corner of the city.</h2>
            <p>
              Start with a neighbourhood. Explore the properties available
              there.
            </p>
          </div>
          <Link className="text-link" href="/areas">
            Explore all areas <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="area-grid">
          {areas.slice(0, 6).map((area, index) => (
            <Link
              href={`/areas/${area.slug}`}
              key={area.slug}
              className="area-card"
            >
              <span className="area-index">0{index + 1}</span>
              <MapPin size={23} />
              <h3>{area.name}</h3>
              <span>
                Explore properties <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container homepage-company">
        <div>
          <span className="eyebrow">ABOUT ENUGU PROPERTIES</span>
          <h2>
            A local focus.
            <br />
            Support wherever you are.
          </h2>
          <p>
            Enugu Properties is operated by {business.legalName}. We bring
            property adverts, enquiries and recorded checks together in one
            place, with support for people in Nigeria and abroad.
          </p>
          <Link className="text-link" href="/about">
            Get to know the platform <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="homepage-support-links">
          <Link href="/contact">
            <MessageCircle size={26} />
            <span>
              <strong>Speak to the Nigeria team</strong>
              <small>
                Help with adverts, enquiries and inspection arrangements.
              </small>
            </span>
            <ArrowUpRight size={19} />
          </Link>
          <Link href="/buying-from-abroad">
            <Globe2 size={26} />
            <span>
              <strong>Looking from abroad?</strong>
              <small>
                Understand the next steps and contact diaspora support.
              </small>
            </span>
            <ArrowUpRight size={19} />
          </Link>
        </div>
      </section>

      <section
        className="section container homepage-faq"
        aria-labelledby="faq-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">A FEW QUESTIONS, ANSWERED</span>
            <h2 id="faq-heading">Good to know before you start.</h2>
          </div>
          <Link className="text-link" href="/faq">
            View all FAQs <ArrowUpRight size={18} />
          </Link>
        </div>
        <Faq items={homepageFaqItems} />
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
              Register and start your first listing. Plus is selected for
              eligible new members. Activate your free offer at checkout for
              more photos, video and 45 days of advertising.
            </p>
          </div>
          <div className="offer-actions">
            <Link className="button" href="/account/listings/new">
              Start your first advert <ArrowUpRight size={18} />
            </Link>
            <Link className="text-link" href="/pricing">
              View advertising plans <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section container homepage-contact">
        <div>
          <span className="eyebrow">LET’S HELP YOU TAKE THE NEXT STEP</span>
          <h2>Have a question? Talk to us.</h2>
          <p>Ask about a property, your advert or the support available.</p>
        </div>
        <div className="homepage-contact-actions">
          <a
            className="button"
            href={whatsappUrl(
              "Hello Enugu Properties, I would like some help.",
            )}
          >
            Nigeria WhatsApp <MessageCircle size={18} />
          </a>
          <a
            className="button secondary"
            href={diasporaWhatsappUrl(
              "Hello Enugu Properties, I am enquiring from abroad and would like assistance.",
            )}
          >
            Diaspora WhatsApp <Globe2 size={18} />
          </a>
          <Link className="text-link" href="/contact">
            Email or contact form <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
