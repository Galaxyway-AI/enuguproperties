export const categories = [
  "houses",
  "land",
  "commercial",
  "new-developments",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  houses: "Houses",
  land: "Land",
  commercial: "Commercial",
  "new-developments": "New developments",
};
export const listingPurposes = ["sale", "rent", "short-let"] as const;
export type ListingPurpose = (typeof listingPurposes)[number];
export type AvailabilityStatus = "available" | "sold" | "rented";
export const listingPurposeLabels: Record<ListingPurpose, string> = {
  sale: "Buy",
  rent: "Rent",
  "short-let": "Short let",
};
export function listingPurposeSuffix(purpose?: string) {
  if (purpose === "rent") return " / year";
  if (purpose === "short-let") return " / night";
  return "";
}
export function listingPurposeDescription(purpose?: string) {
  if (purpose === "rent") return "for rent";
  if (purpose === "short-let") return "for short let";
  return "for sale";
}
export const verificationLabels: Record<string, string> = {
  identity: "Identity verified",
  authority: "Authority to market confirmed",
  site: "Site inspected",
  documents: "Documents reviewed",
  official_search: "Official search completed",
  survey: "Survey reviewed",
  legal: "Legal due diligence completed",
};
export type PublicProperty = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  listing_purpose?: ListingPurpose;
  area: string;
  area_slug: string;
  price_minor: number;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type?: string;
  negotiable?: boolean;
  toilets?: number | null;
  living_rooms?: number | null;
  parking_spaces?: number | null;
  building_sqm?: number | null;
  property_condition?: string;
  furnishing?: string;
  details?: Record<string, string | number | boolean>;
  land_sqm: number;
  features: string[];
  images: string[];
  seller_type: string;
  status: string;
  availability_status?: AvailabilityStatus;
  created_at: string;
  updated_at: string;
  featured: boolean;
  price_reduced: boolean;
  checks: {
    type: string;
    summary: string;
    completed_at: string;
    expires_at: string | null;
  }[];
  demo?: boolean;
  saved?: boolean;
  videos?: string[];
};
export type Plan = {
  id: string;
  name: string;
  price_minor: number;
  duration_days: number;
  photo_limit: number;
  video_limit: number;
  featured_days: number;
};
export function money(minor: number | string | bigint, compact = false) {
  const amount = BigInt(minor);
  if (compact && amount >= 100000000n && amount % 100000000n === 0n)
    return `₦${amount / 100000000n}m`;
  return `₦${(amount / 100n).toLocaleString("en-NG")}${amount % 100n ? `.${(amount % 100n).toString().padStart(2, "0")}` : ""}`;
}
export function toMinor(value: string): number {
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid amount with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Amount is too large.");
  return Number(minor);
}
export function commission(
  sale: bigint,
  basisPoints: number,
  minimum = 0n,
): bigint {
  if (
    sale < 0n ||
    !Number.isInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10000
  )
    throw new Error("Invalid commission basis");
  const fee = (sale * BigInt(basisPoints) + 5000n) / 10000n;
  return fee > minimum ? fee : minimum;
}
export const listingTransitions: Record<string, string[]> = {
  draft: ["submitted", "payment_pending"],
  payment_pending: ["submitted", "draft"],
  submitted: ["under_review", "withdrawn"],
  under_review: ["live", "needs_changes", "rejected"],
  needs_changes: ["submitted", "withdrawn"],
  live: ["paused", "under_offer", "sold", "expired", "under_review"],
  paused: ["under_review", "withdrawn"],
  under_offer: ["live", "sold", "paused", "expired", "under_review"],
  rejected: ["draft", "archived"],
  expired: ["draft", "archived"],
  withdrawn: ["draft", "archived"],
  sold: ["archived"],
  archived: [],
};
export function canTransition(from: string, to: string) {
  return listingTransitions[from]?.includes(to) ?? false;
}
export function safeNext(value: string | null) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/account/dashboard";
}
