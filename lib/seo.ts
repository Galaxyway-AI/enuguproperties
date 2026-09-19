import type { Metadata } from "next";
import type { SearchFilters } from "./catalogue";
import type { PublicProperty } from "./domain";

export const siteUrl = "https://enuguproperties.com";
export const siteName = "Enugu Properties";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export type SeoLanding = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  eyebrow: string;
  intro: string;
  filters: SearchFilters;
  guidanceTitle: string;
  guidance: string[];
};

export const seoLandings = {
  sale: {
    slug: "/property-for-sale/enugu",
    title: "Property for Sale in Enugu, Nigeria",
    h1: "Property for Sale in Enugu",
    description:
      "Browse houses, land, flats and commercial property for sale in Enugu. View current listings, prices, photos and available verification information.",
    eyebrow: "PROPERTY FOR SALE IN ENUGU",
    intro:
      "Compare current property adverts across Enugu, then review the listing details, inspection options and the exact scope of any recorded checks before you proceed.",
    filters: { purpose: "sale" },
    guidanceTitle: "Buying property in Enugu",
    guidance: [
      "Use the property facts and photographs to create a shortlist, then inspect the specific property and its access in person or through an arranged remote inspection.",
      "A reviewed advert is a starting point. Confirm the seller’s authority, title documents, survey information and any official searches with suitable independent professionals before paying.",
    ],
  },
  houses: {
    slug: "/houses-for-sale/enugu",
    title: "Houses for Sale in Enugu, Nigeria",
    h1: "Houses for Sale in Enugu",
    description:
      "Find houses for sale in Enugu, including duplexes, bungalows, terraces and detached homes. Compare prices, photos and property details.",
    eyebrow: "HOUSES FOR SALE IN ENUGU",
    intro:
      "Explore available homes across Enugu and compare the details that matter, including bedrooms, building size, land size, condition and location.",
    filters: { purpose: "sale", category: "houses" },
    guidanceTitle: "Compare Enugu houses carefully",
    guidance: [
      "Check whether the advertised bedroom count, building condition, access, services and land size match what you see during inspection.",
      "Ask which documents relate to the building and land, who is authorised to sell, and what further legal, survey or official checks are appropriate.",
    ],
  },
  land: {
    slug: "/land-for-sale/enugu",
    title: "Land for Sale in Enugu, Nigeria",
    h1: "Land for Sale in Enugu",
    description:
      "Browse land and plots for sale in Enugu. Compare location, plot size, intended use, access and available title or verification information.",
    eyebrow: "LAND FOR SALE IN ENUGU",
    intro:
      "Search current land adverts by area and size. Treat every online advert as the beginning of your investigation, not proof of ownership or title.",
    filters: { purpose: "sale", category: "land" },
    guidanceTitle: "Before buying land in Enugu",
    guidance: [
      "Visit the site, identify the exact plot and boundaries, and confirm road access, drainage, services and the proposed use of the land.",
      "Use appropriate legal and survey professionals and relevant official records to investigate ownership, title, encumbrances, acquisition risk and planning restrictions.",
    ],
  },
  flats: {
    slug: "/flats-for-sale/enugu",
    title: "Flats & Apartments for Sale in Enugu",
    h1: "Flats and Apartments for Sale in Enugu",
    description:
      "Browse flats and apartments for sale in Enugu. Compare bedrooms, prices, photos, locations and available property information.",
    eyebrow: "FLATS FOR SALE IN ENUGU",
    intro:
      "Find current flat and apartment adverts in Enugu, with clear property facts and a route to request more information or an inspection.",
    filters: { purpose: "sale", category: "houses", property_type: "flat" },
    guidanceTitle: "Questions to ask about a flat",
    guidance: [
      "Confirm which unit is offered, the areas included in the sale, access and parking arrangements, service charges and responsibility for shared parts.",
      "Inspect the unit and development and obtain appropriate independent advice on title, approvals and the seller’s authority before committing funds.",
    ],
  },
  rent: {
    slug: "/property-for-rent/enugu",
    title: "Property for Rent in Enugu, Nigeria",
    h1: "Property for Rent in Enugu",
    description:
      "Find houses, flats and commercial property for rent in Enugu. Compare annual rents, locations, photos and property details.",
    eyebrow: "PROPERTY FOR RENT IN ENUGU",
    intro:
      "Browse annual rental adverts across Enugu. Confirm the full rent, fees, tenancy terms, property condition and the person authorised to let the property.",
    filters: { purpose: "rent" },
    guidanceTitle: "Rent with a clear record",
    guidance: [
      "Inspect the exact property and confirm the annual rent, deposit, service charges, utilities, repairs and proposed tenancy term in writing.",
      "Verify who is receiving money and why. Do not pay solely because a property appears online or because someone creates urgency.",
    ],
  },
  shortLets: {
    slug: "/short-lets/enugu",
    title: "Short Lets in Enugu",
    h1: "Short Lets in Enugu",
    description:
      "Browse short let apartments and homes in Enugu for temporary stays. Compare nightly rates, locations, photos and amenities.",
    eyebrow: "SHORT LETS IN ENUGU",
    intro:
      "Find temporary stays without mixing them with annual rentals. Confirm availability, the complete price, house rules, check-in arrangements and amenities before paying.",
    filters: { purpose: "short-let" },
    guidanceTitle: "Plan your short stay",
    guidance: [
      "Ask whether power, internet, cleaning, security, parking and caution fees are included and obtain written check-in and cancellation terms.",
      "Confirm that photographs and the stated location relate to the exact accommodation offered for your dates.",
    ],
  },
  commercial: {
    slug: "/commercial-property/enugu",
    title: "Commercial Property in Enugu",
    h1: "Commercial Property in Enugu",
    description:
      "Browse commercial property for sale and rent in Enugu, including offices, shops, warehouses, hospitality and industrial space.",
    eyebrow: "COMMERCIAL PROPERTY IN ENUGU",
    intro:
      "Explore business property across Enugu and assess access, permitted use, services, size and the practical needs of your operation.",
    filters: { category: "commercial" },
    guidanceTitle: "Assess commercial property",
    guidance: [
      "Check access, parking, loading, utilities, security, signage and whether the space and proposed use suit your operational requirements.",
      "Obtain appropriate advice on title or tenancy terms, planning and business-use requirements before entering a transaction.",
    ],
  },
} satisfies Record<string, SeoLanding>;

export function landingMetadata(
  landing: SeoLanding,
  page = 1,
  hasOnlyPagination = true,
): Metadata {
  const canonical = `${landing.slug}${page > 1 ? `?page=${page}` : ""}`;
  return {
    title: page > 1 ? `${landing.title} – Page ${page}` : landing.title,
    description: landing.description,
    alternates: { canonical },
    robots: hasOnlyPagination ? undefined : { index: false, follow: true },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: canonical,
      type: "website",
      images: [{ url: "/logo_long.png", alt: siteName }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const areaGuides: Record<
  string,
  { summary: string; context: string; checklist: string[]; nearby: string[] }
> = {
  "independence-layout": {
    summary:
      "Browse property in Independence Layout and compare current sale, rental and short-let adverts with clear listing details.",
    context:
      "Independence Layout is a recognised Enugu neighbourhood appearing across house, apartment and short-let searches. Property conditions and access can vary by street, so assess the exact address rather than relying on the area name alone.",
    checklist: ["Street and road access", "Drainage and utilities", "Exact plot or unit", "Title and seller authority"],
    nearby: ["new-haven", "gra", "uwani"],
  },
  "trans-ekulu": {
    summary:
      "Explore property in Trans Ekulu, Enugu, including current homes, land and rental adverts.",
    context:
      "Trans Ekulu includes established residential streets and newer developments. Confirm the precise part of the area, access route and estate or layout name for every property you consider.",
    checklist: ["Exact estate or layout", "Access at different times", "Property boundaries", "Services and security arrangements"],
    nearby: ["gra", "new-haven", "abakpa-nike"],
  },
  "new-haven": {
    summary:
      "Find property in New Haven, Enugu and compare available homes, land, rentals and commercial opportunities.",
    context:
      "New Haven combines residential streets with commercial activity around key roads. Check noise, traffic, access and the immediate surroundings of the particular property during inspection.",
    checklist: ["Immediate street use", "Traffic and access", "Parking", "Building and document checks"],
    nearby: ["independence-layout", "gra", "trans-ekulu"],
  },
  gra: {
    summary:
      "Browse property in GRA Enugu and review current houses, apartments, land, rentals and short lets.",
    context:
      "GRA is used in property searches for homes and short stays, but adverts may refer to different estates and extensions. Verify the exact location and what the stated area name means for that listing.",
    checklist: ["Exact GRA location", "Property access", "Services and charges", "Seller or host authority"],
    nearby: ["new-haven", "trans-ekulu", "independence-layout"],
  },
  "abakpa-nike": {
    summary:
      "Explore property in Abakpa Nike, Enugu, with current adverts for homes, land and rentals.",
    context:
      "Abakpa Nike covers a broad area and property descriptions may use nearby landmarks or estate names. Confirm the exact community, route, plot and travel times independently.",
    checklist: ["Exact community or estate", "Road and drainage", "Boundary identification", "Official and professional checks"],
    nearby: ["emene", "trans-ekulu", "nike"],
  },
};

function label(value?: string) {
  return (value || "property")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function propertySeoTitle(property: PublicProperty) {
  const bedrooms = property.bedrooms ? `${property.bedrooms} Bedroom ` : "";
  const type = label(property.property_type || property.category);
  const action =
    property.listing_purpose === "rent"
      ? "for Rent"
      : property.listing_purpose === "short-let"
        ? "for Short Let"
        : "for Sale";
  return `${bedrooms}${type} ${action} in ${property.area}, Enugu`;
}

export function propertySeoDescription(property: PublicProperty) {
  const title = propertySeoTitle(property);
  return `${title}. View price, photos, property details and available Enugu Properties verification information.`.slice(
    0,
    160,
  );
}
