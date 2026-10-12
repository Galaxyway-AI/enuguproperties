import test from "node:test";
import assert from "node:assert/strict";
import { heroSlides, homepageSlideCount } from "../lib/hero-slides";
import type { PublicProperty } from "../lib/domain";

const property = (id: number, changes: Record<string, unknown> = {}) => ({
  id: `property-${id}`,
  slug: `property-${id}`,
  title: `Property ${id}`,
  area: "Enugu",
  category: id % 2 ? "houses" : "land",
  listing_purpose: id % 2 ? "sale" : "rent",
  status: "live",
  availability_status: "available",
  images: [`https://example.com/${id}.jpg`],
  demo: false,
  ...changes,
}) as unknown as PublicProperty;

test("homepage slideshow count stays within the admin-supported range", () => {
  assert.equal(homepageSlideCount(1), 1);
  assert.equal(homepageSlideCount(12), 12);
  for (const invalid of [0, 13, 1.5, "abc", null])
    assert.equal(homepageSlideCount(invalid), 3);
});

test("slideshow count uses distinct photos from available live adverts", () => {
  const listings = [
    property(1),
    property(2),
    property(3, { availability_status: "sold" }),
    property(4, { images: ["https://example.com/1.jpg"] }),
    property(5),
    property(6, { status: "paused" }),
  ];
  assert.equal(heroSlides(listings, 1).length, 1);
  assert.deepEqual(
    heroSlides(listings, 4).map((slide) => slide.href),
    ["/property/property-1", "/property/property-2", "/property/property-5"],
  );
});
