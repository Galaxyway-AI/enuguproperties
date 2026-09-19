import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";
import { configured, db } from "@/lib/supabase";
import { business, diasporaWhatsappUrl } from "@/lib/business";
import type { Metadata } from "next";

const staticPageSeo: Record<string, { title: string; description: string }> = {
  sell: {
    title: "Sell or Advertise Property in Enugu",
    description:
      "List houses, land, flats, rentals and commercial property in Enugu. Compare advertising plans, submit your advert and manage buyer enquiries.",
  },
  verification: {
    title: "Property Verification in Enugu",
    description:
      "Understand Enugu Properties listing review, identity, authority, inspection and document checks, including what each verification does and does not establish.",
  },
  "buying-from-abroad": {
    title: "Buying Property in Enugu From Abroad",
    description:
      "Learn how Enugu Properties supports overseas and UK-based buyers with enquiries, inspections, records and carefully scoped verification in Enugu.",
  },
};

async function storedPage(page: string) {
  if (!configured()) return null;
  return (
    await (await db())
      .from("content_pages")
      .select("title,description,content,author,published_at,updated_at,seo_title,meta_description,social_image,indexable,canonical_override")
      .eq("slug", page)
      .eq("published", true)
      .maybeSingle()
  ).data;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  const stored = await storedPage(page);
  const fallback = content[page];
  const title = stored?.seo_title || staticPageSeo[page]?.title || stored?.title || fallback?.title;
  const description = stored?.meta_description || staticPageSeo[page]?.description || stored?.description || fallback?.intro;
  const canonical = stored?.canonical_override || `/${page}`;
  return {
    title,
    description,
    alternates: { canonical },
    robots: stored && !stored.indexable ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, images: stored?.social_image ? [stored.social_image] : undefined },
  };
}
export default async function Information({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const stored = await storedPage(page);
  const c = stored
    ? {
        eyebrow: "ENUGU PROPERTIES",
        title: stored.title,
        intro: stored.description,
        sections: [{ title: "", body: stored.content }],
        cta: undefined,
        author: stored.author,
        publishedAt: stored.published_at,
        updatedAt: stored.updated_at,
      }
    : content[page] ? { ...content[page], author: undefined, publishedAt: undefined, updatedAt: undefined } : undefined;
  if (!c) notFound();
  return (
    <>
      <header className="page-heading">
        <div className="container">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1>{c.title}</h1>
          <p>{c.intro}</p>
          {c.author && <p className="article-byline">By {c.author}{c.publishedAt ? ` · Published ${new Date(c.publishedAt).toLocaleDateString("en-GB")}` : ""}{c.updatedAt ? ` · Updated ${new Date(c.updatedAt).toLocaleDateString("en-GB")}` : ""}</p>}
        </div>
      </header>
      <div className="container section">
        <article className="prose">
          {c.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p style={{ whiteSpace: "pre-line" }}>{s.body}</p>
            </section>
          ))}
          {page === "buying-from-abroad" && (
            <section className="panel diaspora-contact">
              <h2>Contact the diaspora team</h2>
              <p>
                Buying from outside Nigeria? Our diaspora team can help
                coordinate property enquiries and inspections.
              </p>
              <p>
                <a
                  className="text-link"
                  href={`mailto:${business.diasporaEmail}`}
                >
                  {business.diasporaEmail}
                </a>
                <br />
                <a
                  className="text-link"
                  href={diasporaWhatsappUrl(
                    "Hello Enugu Properties, I am buying from abroad and would like assistance.",
                  )}
                >
                  Phone / WhatsApp {business.diasporaWhatsappDisplay}
                </a>
              </p>
            </section>
          )}
          {c.cta && (
            <Link className="button" href={c.cta.href}>
              {c.cta.label}
              <ArrowUpRight size={18} />
            </Link>
          )}
        </article>
      </div>
    </>
  );
}
