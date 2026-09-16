import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";
import { configured, db } from "@/lib/supabase";
import { business, diasporaWhatsappUrl } from "@/lib/business";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return {
    title: content[page]?.title,
    description: content[page]?.intro,
    alternates: { canonical: `/${page}` },
  };
}
export default async function Information({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const stored = configured()
    ? (
        await (
          await db()
        )
          .from("content_pages")
          .select("title,description,content")
          .eq("slug", page)
          .eq("published", true)
          .maybeSingle()
      ).data
    : null;
  const c = stored
    ? {
        eyebrow: "ENUGU PROPERTIES",
        title: stored.title,
        intro: stored.description,
        sections: [{ title: "", body: stored.content }],
        cta: undefined,
      }
    : content[page];
  if (!c) notFound();
  return (
    <>
      <header className="page-heading">
        <div className="container">
          <span className="eyebrow">{c.eyebrow}</span>
          <h1>{c.title}</h1>
          <p>{c.intro}</p>
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
