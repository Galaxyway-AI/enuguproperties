import Link from "next/link";
import { SearchX } from "lucide-react";
import { getAreas, getProperties } from "@/lib/catalogue";
import type { SeoLanding } from "@/lib/seo";
import { absoluteUrl, jsonLd } from "@/lib/seo";
import { SearchForm } from "./search";
import { PropertyCard } from "./property-card";

export async function SeoListingPage({
  landing,
  page = 1,
}: {
  landing: SeoLanding;
  page?: number;
}) {
  const filters = { ...landing.filters, page: String(page) };
  const [areas, result] = await Promise.all([
    getAreas(),
    getProperties(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: landing.h1, item: absoluteUrl(landing.slug) },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: landing.h1,
      description: landing.description,
      url: absoluteUrl(landing.slug),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: result.count,
        itemListElement: result.properties.map((property, index) => ({
          "@type": "ListItem",
          position: (page - 1) * result.pageSize + index + 1,
          url: absoluteUrl(`/property/${property.slug}`),
          name: property.title,
        })),
      },
    },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <header className="page-heading seo-page-heading">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span><span>{landing.h1}</span>
          </nav>
          <span className="eyebrow">{landing.eyebrow}</span>
          <h1>{landing.h1}</h1>
          <p>{landing.intro}</p>
        </div>
      </header>
      <section className="container results-content seo-results">
        <SearchForm areas={areas} filters={landing.filters} advanced />
        <div className="results-toolbar">
          <strong>{result.count} current {result.count === 1 ? "listing" : "listings"}</strong>
          <Link className="text-link" href="/properties">Browse all property</Link>
        </div>
        {result.properties.length ? (
          <div className="property-grid">
            {result.properties.map((property) => <PropertyCard key={property.id} property={property} />)}
          </div>
        ) : (
          <div className="empty-state">
            <SearchX size={36} />
            <h2>No matching property is available today.</h2>
            <p>Browse all current adverts or return as reviewed listings are added.</p>
            <Link className="button secondary" href="/properties">Browse all properties</Link>
          </div>
        )}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Property result pages">
            {page > 1 && <Link className="button secondary" href={`${landing.slug}?page=${page - 1}`}>Previous</Link>}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages && <Link className="button secondary" href={`${landing.slug}?page=${page + 1}`}>Next</Link>}
          </nav>
        )}
      </section>
      <section className="section seo-guidance">
        <div className="container seo-guidance-grid">
          <div>
            <span className="eyebrow">MAKE AN INFORMED DECISION</span>
            <h2>{landing.guidanceTitle}</h2>
          </div>
          <div className="prose">
            {landing.guidance.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p><Link className="text-link" href="/verification">Understand verification</Link> · <Link className="text-link" href="/safety">Read the buyer safety guide</Link> · <Link className="text-link" href="/market-insights">Explore property guides</Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
