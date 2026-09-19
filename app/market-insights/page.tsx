import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { editorialArticles } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "Enugu Property Market Insights & Buyer Guides",
  description: "Practical Enugu property guides covering buying, land, documents, neighbourhood research, verification and diaspora purchases.",
  alternates: { canonical: "/market-insights" },
};

export default function MarketInsights() {
  return <>
    <header className="page-heading"><div className="container"><span className="eyebrow">ENUGU PROPERTY KNOWLEDGE</span><h1>Market insights and practical guides.</h1><p>Research the process, ask better questions and understand what should be checked before you commit to property in Enugu.</p></div></header>
    <section className="section container"><div className="editorial-grid">
      {editorialArticles.map((article) => <article className="editorial-card" key={article.slug}><BookOpen size={25}/><p className="eyebrow">{article.readMinutes} MINUTE GUIDE</p><h2>{article.title}</h2><p>{article.description}</p><Link className="text-link" href={`/market-insights/${article.slug}`}>Read the guide <ArrowUpRight size={17}/></Link></article>)}
    </div></section>
  </>;
}
