import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchX } from "lucide-react";
import { getAreas, getProperties, type SearchFilters } from "@/lib/catalogue";
import {
  categories,
  categoryLabels,
  listingPurposeLabels,
  type Category,
  type ListingPurpose,
} from "@/lib/domain";
import { SearchForm } from "@/components/search";
import { PropertyCard } from "@/components/property-card";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ category?: string[] }>;
  searchParams: Promise<SearchFilters>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { category } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const nonPaginationKeys = Object.keys(query).filter((key) => key !== "page");
  const path = `/properties${category?.length ? "/" + category.join("/") : ""}`;
  const purpose = ["sale", "rent", "short-let"].includes(query.purpose || "")
    ? (query.purpose as ListingPurpose)
    : "sale";
  return {
    title:
      category?.[0] && categories.includes(category[0] as Category)
        ? `${categoryLabels[category[0] as Category]} to ${purpose === "sale" ? "buy" : purpose === "rent" ? "rent" : "short let"} in Enugu`
        : `Property to ${purpose === "sale" ? "buy" : purpose === "rent" ? "rent" : "short let"} in Enugu`,
    description: "Browse current property adverts in Enugu and filter by purpose, area, type, price and property details.",
    alternates: { canonical: `${path}${page > 1 && nonPaginationKeys.length === 0 ? `?page=${page}` : ""}` },
    robots: nonPaginationKeys.length
      ? { index: false, follow: true }
      : undefined,
  };
}
export default async function Properties({ params, searchParams }: Props) {
  const [{ category }, query, areas] = await Promise.all([
    params,
    searchParams,
    getAreas(),
  ]);
  if (
    category &&
    (category.length > 1 ||
      (!categories.includes(category[0] as Category) &&
        category[0] !== "featured"))
  )
    notFound();
  const filters = {
    ...query,
    ...(category?.[0] === "featured"
      ? { featured: "true" }
      : category?.[0]
        ? { category: category[0] }
        : {}),
  };
  const result = await getProperties(filters);
  const purpose = ["sale", "rent", "short-let"].includes(filters.purpose || "")
    ? (filters.purpose as ListingPurpose)
    : undefined;
  const title =
    category?.[0] === "featured"
      ? "Featured properties"
      : category?.[0]
        ? `${categoryLabels[category[0] as Category]} ${purpose ? listingPurposeLabels[purpose].toLowerCase() : "in Enugu"}`
        : purpose
          ? `${listingPurposeLabels[purpose]} property in Enugu.`
          : "Find your next chapter in Enugu.";
  function pageLink(page: number) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v !== undefined) as [
        string,
        string,
      ][],
    );
    params.set("page", String(page));
    return `/properties?${params}`;
  }
  return (
    <>
      <div className="page-heading">
        <div className="container">
          <div className="breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Properties</span>
          </div>
          <span className="eyebrow">A PLACE FOR YOUR PLANS</span>
          <h1>{title}</h1>
          <p>
            Search property for sale, rent and short lets. Read each listing’s
            verification details before taking your next step.
          </p>
        </div>
      </div>
      <section className="container results-content">
        <SearchForm areas={areas} filters={filters} advanced />
        <div className="results-toolbar">
          <strong>
            {result.count} {result.count === 1 ? "property" : "properties"}{" "}
            found
          </strong>
          <Link className="text-link" href="/properties">
            Clear filters
          </Link>
        </div>
        {result.properties.length ? (
          <div className="property-grid">
            {result.properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <SearchX size={36} />
            <h2>No properties match just yet.</h2>
            <p>Try another area, a wider budget or fewer filters.</p>
            <Link className="button secondary" href="/properties">
              Reset your search
            </Link>
          </div>
        )}
        <div className="pagination">
          {result.page > 1 && (
            <Link className="button secondary" href={pageLink(result.page - 1)}>
              Previous
            </Link>
          )}
          {result.count > 0 && (
            <span>
              Page {result.page} of {Math.ceil(result.count / result.pageSize)}
            </span>
          )}
          {result.page * result.pageSize < result.count && (
            <Link className="button secondary" href={pageLink(result.page + 1)}>
              Next
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
