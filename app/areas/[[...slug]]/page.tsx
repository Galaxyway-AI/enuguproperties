import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowUpRight } from "lucide-react";
import { getAreas, getProperties } from "@/lib/catalogue";
import { PropertyCard } from "@/components/property-card";
import type { Metadata } from "next";
import { absoluteUrl, areaGuides, jsonLd } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const areas = await getAreas();
  const area = areas.find((a) => a.slug === slug?.[0]);
  const result = area ? await getProperties({ area: area.slug }) : null;
  const guide = area ? areaGuides[area.slug] : null;
  const title = area ? `Property in ${area.name}, Enugu` : "Enugu Areas & Neighbourhood Property Guide";
  const description = guide?.summary || area?.description || "Explore Enugu neighbourhoods, browse current property adverts and learn what to check before buying or renting in a specific area.";
  return {
    title,
    description,
    alternates: { canonical: area ? `/areas/${area.slug}` : "/areas" },
    robots: area && !guide && !result?.count ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: area ? `/areas/${area.slug}` : "/areas" },
  };
}
export default async function Areas({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const areas = await getAreas();
  const area = areas.find((a) => a.slug === slug?.[0]);
  if (slug && (!area || slug.length > 1)) notFound();
  const result = area ? await getProperties({ area: area.slug }) : null;
  const guide = area ? areaGuides[area.slug] : null;
  const schema = area
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Enugu areas", item: absoluteUrl("/areas") },
          { "@type": "ListItem", position: 3, name: area.name, item: absoluteUrl(`/areas/${area.slug}`) },
        ],
      }
    : null;
  return (
    <>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />}
      <div className="page-heading">
        <div className="container">
          <span className="eyebrow">GET TO KNOW YOUR NEXT NEIGHBOURHOOD</span>
          <h1>
            {area
              ? `Property in ${area.name}, Enugu`
              : "Every neighbourhood has a next chapter."}
          </h1>
          <p>
            {area?.description ||
              "Explore Enugu’s neighbourhoods and discover property that fits your plans. Visit the area, assess access and amenities, and ask the questions that matter to you."}
          </p>
        </div>
      </div>
      <section className="section container">
        {area ? (
          <>
            <h2>Available in {area.name}</h2>
            <div className="area-intent-links" aria-label={`${area.name} property searches`}>
              <Link href={`/properties?purpose=sale&area=${area.slug}`}>Property for sale</Link>
              <Link href={`/properties?purpose=rent&area=${area.slug}`}>Property for rent</Link>
              <Link href={`/properties?purpose=short-let&area=${area.slug}`}>Short lets</Link>
              <Link href={`/properties/land?purpose=sale&area=${area.slug}`}>Land for sale</Link>
            </div>
            {result?.properties.length ? (
              <div className="property-grid">
                {result.properties.map((p) => (
                  <PropertyCard property={p} key={p.id} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <MapPin size={32} />
                <h3>No available listings in this area yet.</h3>
                <p>
                  Check nearby neighbourhoods or return as reviewed listings are
                  added.
                </p>
                <Link className="button" href="/properties">
                  Browse all properties
                </Link>
              </div>
            )}
            <div className="prose">
              <h2>{guide ? `About property in ${area.name}` : "Get a feel for the area"}</h2>
              <p>
                {guide?.context || "Visit at different times of day. Check your journey to work, schools and essential services, and ask about road access, drainage, water and electricity at the specific property."}
              </p>
              {guide && (
                <>
                  <h2>What to check in {area.name}</h2>
                  <ul>{guide.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
                  <h2>Explore nearby Enugu areas</h2>
                  <p>{guide.nearby.map((nearby, index) => {
                    const nearbyArea = areas.find((candidate) => candidate.slug === nearby);
                    return nearbyArea ? <span key={nearby}>{index ? " · " : ""}<Link href={`/areas/${nearby}`}>{nearbyArea.name}</Link></span> : null;
                  })}</p>
                </>
              )}
              <Link className="text-link" href="/safety">
                Prepare for your inspection
              </Link>
            </div>
          </>
        ) : (
          <div className="area-grid">
            {areas.map((a) => (
              <Link
                href={`/areas/${a.slug}`}
                className="area-card"
                key={a.slug}
              >
                <MapPin />
                <h3>{a.name}</h3>
                <span>
                  Explore properties <ArrowUpRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
