import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, ShieldCheck, ArrowUpRight } from "lucide-react";
import { getProperty } from "@/lib/catalogue";
import {
  listingPurposeDescription,
  listingPurposeSuffix,
  money,
  verificationLabels,
} from "@/lib/domain";
import { Gallery } from "@/components/gallery";
import { features, whatsappUrl } from "@/lib/business";
import {
  absoluteUrl,
  jsonLd,
  propertySeoDescription,
  propertySeoTitle,
} from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await getProperty((await params).slug);
  const title = p ? propertySeoTitle(p) : "Property not found";
  const description = p ? propertySeoDescription(p) : undefined;
  return {
    title,
    description,
    alternates: { canonical: p ? `/property/${p.slug}` : undefined },
    robots: p?.demo ? { index: false, follow: false } : undefined,
    openGraph: p
      ? {
          title,
          description,
          url: `/property/${p.slug}`,
          type: "website",
          images: p.images.map((image) => ({
            url: new URL(image, absoluteUrl("/")).toString(),
            alt: title,
          })),
        }
      : undefined,
    twitter: p?.images.length ? { card: "summary_large_image" } : undefined,
  };
}
export default async function Property({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await getProperty((await params).slug);
  if (!p) notFound();
  const unavailable =
    p.availability_status === "sold" || p.availability_status === "rented";
  const availabilityLabel =
    p.availability_status === "sold" ? "SOLD" : "RENTED";
  const label = (value: string) =>
    value
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const extraDetails = [
    p.property_type && ["Property type", label(p.property_type)],
    p.building_sqm && [
      "Building size",
      `${p.building_sqm.toLocaleString()} m²`,
    ],
    p.toilets !== null &&
      p.toilets !== undefined && ["Toilets", String(p.toilets)],
    p.living_rooms !== null &&
      p.living_rooms !== undefined && ["Living rooms", String(p.living_rooms)],
    p.parking_spaces !== null &&
      p.parking_spaces !== undefined && [
        "Parking spaces",
        String(p.parking_spaces),
      ],
    p.property_condition && ["Condition", label(p.property_condition)],
    p.furnishing && ["Furnishing", label(p.furnishing)],
    ...Object.entries(p.details || {}).map(([key, value]) => [
      label(key),
      typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : label(String(value)),
    ]),
  ].filter(Boolean) as string[][];
  const seoTitle = propertySeoTitle(p);
  const propertyType = p.property_type === "flat" ? "Apartment" : p.category === "houses" ? "House" : "Place";
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Properties", item: absoluteUrl("/properties") },
        { "@type": "ListItem", position: 3, name: p.area, item: absoluteUrl(`/areas/${p.area_slug}`) },
        { "@type": "ListItem", position: 4, name: seoTitle, item: absoluteUrl(`/property/${p.slug}`) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: seoTitle,
      description: p.description,
      url: absoluteUrl(`/property/${p.slug}`),
      datePosted: p.created_at,
      dateModified: p.updated_at,
      image: p.images.map((image) => new URL(image, absoluteUrl("/")).toString()),
      offers: {
        "@type": "Offer",
        price: Number(p.price_minor) / 100,
        priceCurrency: "NGN",
        availability: p.availability_status && p.availability_status !== "available" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        url: absoluteUrl(`/property/${p.slug}`),
      },
      itemOffered: {
        "@type": propertyType,
        name: seoTitle,
        numberOfBedrooms: p.bedrooms ?? undefined,
        numberOfBathroomsTotal: p.bathrooms ?? undefined,
        floorSize: p.building_sqm ? { "@type": "QuantitativeValue", value: p.building_sqm, unitCode: "MTK" } : undefined,
        address: { "@type": "PostalAddress", addressLocality: p.area, addressRegion: "Enugu", addressCountry: "NG" },
      },
    },
  ];
  return (
    <section className="container section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/properties">Properties</Link>
        <span>/</span>
        <Link href={`/areas/${p.area_slug}`}>{p.area}</Link>
        <span>/</span>
        <span>{p.reference}</span>
      </nav>
      <Gallery
        images={p.images}
        title={
          p.demo
            ? "Illustrative photograph for a fictional sample listing"
            : p.title
        }
      />
      {p.demo && (
        <div className="notice">
          This is a fictional sample listing with illustrative stock
          photography. It is not available to buy, inspect or make an offer on.
        </div>
      )}
      {!["live", "under_offer"].includes(p.status) && (
        <div className="notice">
          This property is no longer available.{" "}
          <Link href="/properties">Explore current listings.</Link>
        </div>
      )}
      <div className="detail-grid">
        <div>
          <div className="detail-title">
            {unavailable && (
              <span className="badge unavailable availability-badge-detail">
                {availabilityLabel}
              </span>
            )}
            <span className="eyebrow">
              {p.category.replaceAll("-", " ")}{" "}
              {listingPurposeDescription(p.listing_purpose)} · {p.reference}
            </span>
            <h1>{p.title}</h1>
            <p className="card-location">
              <MapPin size={17} />
              {p.area}, Enugu · Area location only
            </p>
            {unavailable && (
              <p className="availability-message">
                The lister has marked this property{" "}
                {availabilityLabel.toLowerCase()}.
              </p>
            )}
          </div>
          <div className="spec-grid">
            {p.bedrooms !== null && (
              <div>
                <strong>{p.bedrooms}</strong>Bedrooms
              </div>
            )}
            {p.bathrooms !== null && (
              <div>
                <strong>{p.bathrooms}</strong>Bathrooms
              </div>
            )}
            <div>
              <strong>{p.land_sqm.toLocaleString()} m²</strong>Land size
            </div>
          </div>
          <div className="prose">
            <h2>About this property</h2>
            <p style={{ whiteSpace: "pre-line" }}>{p.description}</p>
            {extraDetails.length > 0 && (
              <>
                <h2>Property details</h2>
                <dl className="property-details">
                  {extraDetails.map(([name, value]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {p.videos?.map((v) => (
              <iframe
                key={v}
                src={v}
                title="Property video"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  border: 0,
                  borderRadius: 8,
                }}
                aria-label="Property video"
              />
            ))}
            <h2>Property features</h2>
            <div className="feature-list">
              {p.features.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
            <h2>What has been checked?</h2>
            <p>
              A completed check describes a specific review. It does not
              guarantee ownership, legal title or the outcome of a purchase.
            </p>
            <ul className="trust-list">
              {p.checks.length ? (
                p.checks.map((c) => (
                  <li key={c.type}>
                    <ShieldCheck size={22} />
                    <div>
                      <strong>{verificationLabels[c.type]}</strong>
                      <p>{c.summary}</p>
                      <small>
                        Completed{" "}
                        {new Date(c.completed_at).toLocaleDateString("en-GB")}
                        {c.expires_at
                          ? ` · Recheck by ${new Date(c.expires_at).toLocaleDateString("en-GB")}`
                          : ""}
                      </small>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  No enhanced verification checks have been recorded for this
                  listing.
                </li>
              )}
            </ul>
            <Link className="text-link" href="/verification">
              What each check means <ArrowUpRight size={17} />
            </Link>
            <h2>Location</h2>
            <div className="panel">
              <MapPin size={25} />
              <h3>{p.area}, Enugu</h3>
              <p>
                The exact address is private. Confirm the location through an
                arranged inspection.
              </p>
              <Link href={`/areas/${p.area_slug}`} className="text-link">
                Explore this area
              </Link>
            </div>
            <h2>Before you commit</h2>
            <p>
              Never make payment for a property solely on the basis of an online
              listing. Request appropriate verification and professional legal
              advice before completing a purchase.
            </p>
            <p className="form-caption">
              Listed {new Date(p.created_at).toLocaleDateString("en-GB")} ·
              Updated {new Date(p.updated_at).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
        <aside className="panel detail-sidebar">
          <span className="eyebrow">
            {p.listing_purpose === "rent"
              ? "ANNUAL RENT"
              : p.listing_purpose === "short-let"
                ? "NIGHTLY RATE"
                : "ASKING PRICE"}
          </span>
          <div className="detail-price">
            {money(p.price_minor)}
            <small>{listingPurposeSuffix(p.listing_purpose)}</small>
          </div>
          {p.negotiable && <p className="form-caption">Price is negotiable</p>}
          <p>Listed by a property {p.seller_type}</p>
          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--line)",
              margin: "22px 0",
            }}
          />
          <h3>Let’s take a closer look.</h3>
          <p>
            Enquiries are managed through Enugu Properties so your introduction
            has a clear record.
          </p>
          {!p.demo &&
          !unavailable &&
          ["live", "under_offer"].includes(p.status) ? (
            <>
              {features.inspections && (
                <Link
                  className="button"
                  href={`/account/request?property=${p.id}&kind=inspection`}
                >
                  Request inspection
                </Link>
              )}
              {features.enquiries && (
                <Link
                  className="button secondary"
                  href={`/account/request?property=${p.id}&kind=enquire`}
                >
                  Ask about this property
                </Link>
              )}
              <a
                className="button secondary"
                href={whatsappUrl(
                  `Hello Enugu Properties, I am interested in property ${p.reference}.`,
                )}
              >
                Ask on WhatsApp
              </a>
              {features.offers && (
                <Link
                  className="button secondary"
                  href={`/account/request?property=${p.id}&kind=offer`}
                >
                  Make an offer
                </Link>
              )}
              <Link
                className="text-link"
                style={{ marginTop: 20 }}
                href={`/account/request?property=${p.id}&kind=report`}
              >
                Report this property
              </Link>
            </>
          ) : (
            <Link className="button" href="/properties">
              Browse properties
            </Link>
          )}
          <p className="form-caption" style={{ marginTop: 22 }}>
            Advertising placement does not determine verification status.
          </p>
        </aside>
      </div>
    </section>
  );
}
