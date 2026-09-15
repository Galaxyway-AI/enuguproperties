import "server-only";
import { configured, db } from "./supabase";
import { demoAreas, demoProperties, seedPlans } from "./demo";
import type { Plan, PublicProperty } from "./domain";
export const isDemo = () =>
  process.env.DEMO_MODE === "true" &&
  (process.env.NODE_ENV !== "production" ||
    process.env.PREVIEW_MODE === "true") &&
  !configured();
export type SearchFilters = {
  q?: string;
  category?: string;
  area?: string;
  min?: string;
  max?: string;
  bedrooms?: string;
  bathrooms?: string;
  min_land?: string;
  check?: string;
  featured?: string;
  sort?: string;
  page?: string;
};
function filterNumber(value: string | undefined, maximum: number) {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum
    ? parsed
    : null;
}
export async function getProperties(filters: SearchFilters = {}) {
  const page = Math.min(10000, Math.max(1, Number(filters.page) || 1));
  const pageSize = 12;
  if (!configured()) {
    let data = isDemo() ? [...demoProperties] : [];
    if (filters.q)
      data = data.filter((p) =>
        `${p.title} ${p.area} ${p.description}`
          .toLowerCase()
          .includes(filters.q!.toLowerCase()),
      );
    if (filters.category)
      data = data.filter((p) => p.category === filters.category);
    if (filters.area) data = data.filter((p) => p.area_slug === filters.area);
    const min = filterNumber(filters.min, 9_007_199_254_740);
    const max = filterNumber(filters.max, 9_007_199_254_740);
    const bedrooms = filterNumber(filters.bedrooms, 100);
    const bathrooms = filterNumber(filters.bathrooms, 100);
    const minLand = filterNumber(filters.min_land, 100_000_000);
    if (min !== null) data = data.filter((p) => p.price_minor >= min * 100);
    if (max !== null) data = data.filter((p) => p.price_minor <= max * 100);
    if (bedrooms !== null)
      data = data.filter((p) => (p.bedrooms || 0) >= bedrooms);
    if (bathrooms !== null)
      data = data.filter((p) => (p.bathrooms || 0) >= bathrooms);
    if (minLand !== null) data = data.filter((p) => p.land_sqm >= minLand);
    if (filters.check)
      data = data.filter((p) => p.checks.some((c) => c.type === filters.check));
    if (filters.featured) data = data.filter((p) => p.featured);
    if (filters.sort === "price-asc")
      data.sort((a, b) => a.price_minor - b.price_minor);
    if (filters.sort === "price-desc")
      data.sort((a, b) => b.price_minor - a.price_minor);
    return {
      properties: data.slice((page - 1) * pageSize, page * pageSize),
      count: data.length,
      page,
      pageSize,
    };
  }
  const client = await db();
  let query = client
    .from("public_properties")
    .select("*", { count: "exact" })
    .in("status", ["live", "under_offer"]);
  if (filters.q)
    query = query.ilike(
      "title",
      `%${filters.q.replace(/[%_]/g, "").slice(0, 100)}%`,
    );
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.area) query = query.eq("area_slug", filters.area);
  const min = filterNumber(filters.min, 9_007_199_254_740);
  const max = filterNumber(filters.max, 9_007_199_254_740);
  const bedrooms = filterNumber(filters.bedrooms, 100);
  const bathrooms = filterNumber(filters.bathrooms, 100);
  const minLand = filterNumber(filters.min_land, 100_000_000);
  if (min !== null) query = query.gte("price_minor", Math.round(min * 100));
  if (max !== null) query = query.lte("price_minor", Math.round(max * 100));
  if (bedrooms !== null) query = query.gte("bedrooms", bedrooms);
  if (bathrooms !== null) query = query.gte("bathrooms", bathrooms);
  if (minLand !== null) query = query.gte("land_sqm", minLand);
  if (filters.check)
    query = query.contains("checks", [{ type: filters.check }]);
  if (filters.featured) query = query.eq("featured", true);
  query = filters.sort?.startsWith("price")
    ? query.order("price_minor", { ascending: filters.sort === "price-asc" })
    : query.order("created_at", { ascending: false });
  const { data, error, count } = await query.range(
    (page - 1) * pageSize,
    page * pageSize - 1,
  );
  if (error)
    throw new Error(
      "Property search is temporarily unavailable. Please try again.",
    );
  const {
    data: { user },
  } = await client.auth.getUser();
  const saved =
    user && data?.length
      ? (
          await client
            .from("saved_properties")
            .select("property_id")
            .in(
              "property_id",
              data.map((p) => p.id),
            )
        ).data
      : [];
  const savedIds = new Set(saved?.map((p) => p.property_id));
  return {
    properties: (data || []).map((p) => ({
      ...p,
      saved: savedIds.has(p.id),
    })) as PublicProperty[],
    count: count || 0,
    page,
    pageSize,
  };
}
export async function getProperty(
  slug: string,
): Promise<PublicProperty | null> {
  if (!configured())
    return isDemo()
      ? demoProperties.find((p) => p.slug === slug) || null
      : null;
  const { data, error } = await (
    await db()
  )
    .from("public_properties")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Property could not be loaded.");
  return data;
}
export async function getAreas() {
  if (!configured()) return demoAreas;
  const { data, error } = await (
    await db()
  )
    .from("locations")
    .select("id,name,slug,kind,description")
    .eq("kind", "area")
    .order("name");
  if (error) throw new Error("Areas could not be loaded.");
  return data || [];
}
export async function getPlans(): Promise<Plan[]> {
  if (!configured()) return seedPlans;
  const { data, error } = await (
    await db()
  )
    .from("listing_plans")
    .select("*")
    .eq("active", true)
    .order("price_minor");
  if (error) throw new Error("Advertising plans could not be loaded.");
  return data || [];
}
