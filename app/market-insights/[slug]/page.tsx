import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleBySlug, editorialArticles } from "@/lib/editorial";
import { absoluteUrl, jsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return editorialArticles.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articleBySlug[(await params).slug];
  if (!article) return { title: "Guide not found", robots: { index: false, follow: true } };
  return { title: article.title, description: article.description, alternates: { canonical: `/market-insights/${article.slug}` }, openGraph: { type: "article", title: article.title, description: article.description, url: `/market-insights/${article.slug}`, publishedTime: article.publishedAt, modifiedTime: article.updatedAt } };
}
export default async function ArticlePage({ params }: Props) {
  const article = articleBySlug[(await params).slug]; if (!article) notFound();
  const url = absoluteUrl(`/market-insights/${article.slug}`);
  const schema = [{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: "Market insights", item: absoluteUrl("/market-insights") }, { "@type": "ListItem", position: 3, name: article.title, item: url }] }, { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.description, datePublished: article.publishedAt, dateModified: article.updatedAt, author: { "@type": "Organization", name: "Enugu Properties Editorial Team" }, publisher: { "@id": `${absoluteUrl("/")}#organization` }, mainEntityOfPage: url, inLanguage: "en-NG" }];
  return <article className="container section editorial-article">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}/>
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/market-insights">Market insights</Link><span>/</span><span>{article.title}</span></nav>
    <header><span className="eyebrow">ENUGU PROPERTY GUIDE</span><h1>{article.title}</h1><p className="article-deck">{article.description}</p><p className="article-byline">By Enugu Properties Editorial Team · Published {new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {article.readMinutes} minute read</p></header>
    <div className="prose article-body"><div className="notice">This guide is general information, not legal, survey, valuation or financial advice for a specific property.</div>
      {article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.points && <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}</section>)}
      <section><h2>Sources and further reading</h2><ul>{article.sources.map((source) => <li key={source.url}><a href={source.url}>{source.label}</a></li>)}</ul></section>
      <section className="panel"><h2>Continue your research</h2><p>{article.related.map((item, index) => <span key={item.href}>{index ? " · " : ""}<Link className="text-link" href={item.href}>{item.label}</Link></span>)}</p></section>
    </div>
  </article>;
}
