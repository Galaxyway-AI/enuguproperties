import type { PublicProperty } from "./domain";

export type HeroSlide = {
  image: string;
  title: string;
  area: string;
  href: string;
};

export const DEFAULT_HOMEPAGE_SLIDE_COUNT = 3;
export const MAX_HOMEPAGE_SLIDE_COUNT = 12;

export function homepageSlideCount(value: unknown): number {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= MAX_HOMEPAGE_SLIDE_COUNT
    ? count
    : DEFAULT_HOMEPAGE_SLIDE_COUNT;
}

// Reuse public listing photos, never private evidence or unavailable adverts.
export function heroSlides(
  properties: PublicProperty[],
  limit = DEFAULT_HOMEPAGE_SLIDE_COUNT,
): HeroSlide[] {
  const count = homepageSlideCount(limit);
  const eligible = properties.filter(
    (property) =>
      property.images[0] &&
      ["live", "under_offer"].includes(property.status) &&
      (!property.availability_status ||
        property.availability_status === "available") &&
      !property.demo,
  );
  const selected: PublicProperty[] = [];
  const groups = new Set<string>();
  const images = new Set<string>();
  for (const property of eligible) {
    const group = `${property.listing_purpose || "sale"}:${property.category}`;
    if (groups.has(group) || images.has(property.images[0])) continue;
    selected.push(property);
    groups.add(group);
    images.add(property.images[0]);
    if (selected.length === count) break;
  }
  for (const property of eligible) {
    if (selected.length === count) break;
    if (images.has(property.images[0])) continue;
    selected.push(property);
    images.add(property.images[0]);
  }
  return selected.map((property) => ({
    image: property.images[0],
    title: property.title,
    area: property.area,
    href: `/property/${property.slug}`,
  }));
}
