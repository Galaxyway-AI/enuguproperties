"use client";
import { useState } from "react";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Tag,
  KeyRound,
  CalendarDays,
} from "lucide-react";
import type { SearchFilters } from "@/lib/catalogue";
import { searchBudget, searchPurpose } from "@/lib/search-budget";
type SearchFormProps = {
  areas: { name: string; slug: string }[];
  filters?: SearchFilters;
  advanced?: boolean;
  hero?: boolean;
};
export function SearchForm({
  areas,
  filters = {},
  advanced = false,
  hero = false,
}: SearchFormProps) {
  return (
    <SearchFields
      key={JSON.stringify(filters)}
      areas={areas}
      filters={filters}
      advanced={advanced}
      hero={hero}
    />
  );
}
function SearchFields({
  areas,
  filters = {},
  advanced = false,
  hero = false,
}: SearchFormProps) {
  const [purpose, setPurpose] = useState(searchPurpose(filters.purpose));
  const [maximum, setMaximum] = useState(filters.max || "");
  const [minimum, setMinimum] = useState(filters.min || "");
  const budget = searchBudget(purpose);
  const priceLabel = (price: number) =>
    `₦${price.toLocaleString("en-NG")}${budget.suffix}`;
  return (
    <form
      action="/properties"
      className={`search-panel${advanced ? " advanced" : ""}${hero ? " marketplace-search" : ""}`}
    >
      <fieldset className="purpose-tabs">
        <legend className="sr-only">I want to</legend>
        {[
          ["sale", "Buy", Tag],
          ["rent", "Rent", KeyRound],
          ["short-let", "Short let", CalendarDays],
        ].map(([value, label, Icon]) => {
          const PurposeIcon = Icon as typeof Tag;
          return (
            <label key={value as string}>
              <input
                type="radio"
                name="purpose"
                value={value as string}
                checked={purpose === value}
                onChange={() => {
                  setPurpose(searchPurpose(value as string));
                  setMaximum("");
                  setMinimum("");
                }}
              />
              <span>
                <PurposeIcon size={16} /> {label as string}
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="search-main">
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
          <span>Property type</span>
          <select name="category" defaultValue={filters.category || ""}>
            <option value="">All property types</option>
            <option value="houses">Houses &amp; apartments</option>
            <option value="land">Land &amp; plots</option>
            <option value="commercial">Commercial</option>
            <option value="new-developments">New developments</option>
          </select>
        </label>
        <label>
          <span>{budget.label}</span>
          <select
            name="max"
            value={maximum}
            onChange={(event) => setMaximum(event.target.value)}
          >
            <option value="">{budget.any}</option>
            {maximum && !budget.options.includes(Number(maximum)) && (
              <option value={maximum}>{priceLabel(Number(maximum))}</option>
            )}
            {budget.options.map((p) => (
              <option value={p} key={p}>
                {priceLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button search-button">
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
              {purpose === "rent"
                ? "Minimum annual rent (₦)"
                : purpose === "short-let"
                  ? "Minimum nightly rate (₦)"
                  : "Minimum purchase price (₦)"}
              <input
                type="number"
                min="0"
                name="min"
                value={minimum}
                onChange={(event) => setMinimum(event.target.value)}
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
