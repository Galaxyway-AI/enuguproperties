import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowUpRight } from "lucide-react";
import { getAreas, getProperties } from "@/lib/catalogue";
import { PropertyCard } from "@/components/property-card";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const areas = await getAreas();
  const area = areas.find((a) => a.slug === slug?.[0]);
  return {
    title: area
      ? `Property in ${area.name}, Enugu`
      : "Explore Enugu neighbourhoods",
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
  return (
    <>
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
              <h2>Get a feel for the area</h2>
              <p>
                Visit at different times of day. Check your journey to work,
                schools and essential services, and ask about road access,
                drainage, water and electricity at the specific property.
              </p>
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
