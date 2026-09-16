import Image from "next/image";
import Link from "next/link";
import { BedDouble, Bath, Maximize, MapPin, ArrowUpRight } from "lucide-react";
import {
  listingPurposeDescription,
  listingPurposeSuffix,
  money,
  verificationLabels,
  type PublicProperty,
} from "@/lib/domain";
import { SaveButton } from "./save-button";
export function PropertyCard({ property: p }: { property: PublicProperty }) {
  return (
    <article className="property-card">
      <div className="card-image">
        <Link href={`/property/${p.slug}`} tabIndex={-1} aria-hidden="true">
          {p.images[0] ? (
            <Image
              src={p.images[0]}
              alt={
                p.demo
                  ? "Illustrative photograph for a fictional sample listing"
                  : p.title
              }
              fill
              sizes="(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw"
            />
          ) : (
            <div className="no-image">Photographs pending</div>
          )}
        </Link>
        <div className="image-badges">
          {p.featured && (
            <span className="badge advertising">Featured · Ad</span>
          )}
          {p.demo && <span className="badge sample">Sample listing</span>}
        </div>
        <SaveButton id={p.id} demo={p.demo} initialSaved={p.saved} />
        <span className="image-category">
          {p.category === "houses"
            ? `House ${listingPurposeDescription(p.listing_purpose)}`
            : p.category === "land"
              ? `Land ${listingPurposeDescription(p.listing_purpose)}`
              : `Property ${listingPurposeDescription(p.listing_purpose)}`}
        </span>
      </div>
      <div className="card-body">
        <div className="card-price">
          {money(p.price_minor)}
          <small className="price-period">
            {listingPurposeSuffix(p.listing_purpose)}
          </small>
          {p.negotiable && <span className="form-caption">Negotiable</span>}
          {p.price_reduced && <span className="reduced">Price reduced</span>}
        </div>
        <Link className="card-title" href={`/property/${p.slug}`}>
          {p.title}
        </Link>
        <p className="card-location">
          <MapPin size={14} />
          {p.area}, Enugu
        </p>
        <div className="property-specs">
          {p.bedrooms !== null && (
            <span>
              <BedDouble size={17} />
              {p.bedrooms} beds
            </span>
          )}
          {p.bathrooms !== null && (
            <span>
              <Bath size={17} />
              {p.bathrooms} baths
            </span>
          )}
          <span>
            <Maximize size={15} />
            {p.land_sqm.toLocaleString()} m²
          </span>
        </div>
        <div className="card-trust">
          <span>
            {p.checks.length
              ? verificationLabels[p.checks[0].type]
              : "View listing information"}
          </span>
          <Link href={`/property/${p.slug}`} aria-label={`View ${p.title}`}>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
