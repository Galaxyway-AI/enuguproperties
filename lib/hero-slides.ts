import type { PublicProperty } from "./domain";

export type HeroSlide = {
  image: string;
  title: string;
  area: string;
  href: string;
};

// Reuse public listing photos, never private evidence or unavailable adverts.
export function heroSlides(properties: PublicProperty[]): HeroSlide[] {
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
    if (selected.length === 3) break;
  }
  for (const property of eligible) {
    if (selected.length === 3) break;
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
