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
  check?: string;
  featured?: string;
  sort?: string;
  page?: string;
};
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
    if (filters.min)
      data = data.filter((p) => p.price_minor >= Number(filters.min) * 100);
    if (filters.max)
      data = data.filter((p) => p.price_minor <= Number(filters.max) * 100);
    if (filters.bedrooms)
      data = data.filter((p) => (p.bedrooms || 0) >= Number(filters.bedrooms));
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
  if (filters.min && Number.isFinite(Number(filters.min)))
    query = query.gte("price_minor", Math.round(Number(filters.min) * 100));
  if (filters.max && Number.isFinite(Number(filters.max)))
    query = query.lte("price_minor", Math.round(Number(filters.max) * 100));
  if (filters.bedrooms) query = query.gte("bedrooms", Number(filters.bedrooms));
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
