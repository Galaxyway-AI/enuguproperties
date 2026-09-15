import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import type { SearchFilters } from "@/lib/catalogue";
export function SearchForm({
  areas,
  filters = {},
  advanced = false,
}: {
  areas: { name: string; slug: string }[];
  filters?: SearchFilters;
  advanced?: boolean;
}) {
  return (
    <form
      action="/properties"
      className={advanced ? "search-panel advanced" : "search-panel"}
    >
      <div className="search-main">
        <label>
          <span>Property type</span>
          <select name="category" defaultValue={filters.category || ""}>
            <option value="">All property types</option>
            <option value="houses">Houses</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
            <option value="new-developments">New developments</option>
          </select>
        </label>
        <label>
          <span>
            <MapPin size={13} /> Location
          </span>
          <select name="area" defaultValue={filters.area || ""}>
            <option value="">Anywhere in Enugu</option>
            {areas.map((a) => (
              <option value={a.slug} key={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Maximum budget</span>
          <select name="max" defaultValue={filters.max || ""}>
            <option value="">Any price</option>
            {[20000000, 50000000, 100000000, 200000000, 500000000].map((p) => (
              <option value={p} key={p}>
                ₦{p / 1000000} million
              </option>
            ))}
          </select>
        </label>
        <button className="button search-button">
          <Search size={19} /> Search properties
        </button>
      </div>
      {advanced && (
        <details
          className="filter-details"
          open={Boolean(
            filters.q ||
            filters.min ||
            filters.bedrooms ||
            filters.bathrooms ||
            filters.min_land ||
            filters.check,
          )}
        >
          <summary>
            <SlidersHorizontal size={16} /> More filters
          </summary>
          <div className="form-grid">
            <label>
              Keywords
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Property name or description"
                maxLength={100}
              />
            </label>
            <label>
              Minimum price (₦)
              <input
                type="number"
                min="0"
                name="min"
                defaultValue={filters.min}
                placeholder="No minimum"
              />
            </label>
            <label>
              Bedrooms
              <select name="bedrooms" defaultValue={filters.bedrooms || ""}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label>
              Bathrooms
              <select name="bathrooms" defaultValue={filters.bathrooms || ""}>
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minimum land size (m²)
              <input
                type="number"
                min="1"
                name="min_land"
                defaultValue={filters.min_land}
                placeholder="Any size"
              />
            </label>
            <label>
              Verification check
              <select name="check" defaultValue={filters.check || ""}>
                <option value="">Any status</option>
                <option value="site">Site inspected</option>
                <option value="identity">Identity verified</option>
                <option value="documents">Documents reviewed</option>
                <option value="legal">Legal due diligence completed</option>
              </select>
            </label>
            <label>
              Sort by
              <select name="sort" defaultValue={filters.sort || "newest"}>
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
        </details>
      )}
    </form>
  );
}
