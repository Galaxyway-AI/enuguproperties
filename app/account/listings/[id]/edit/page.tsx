import { notFound } from "next/navigation";
import { db, currentUser, configured } from "@/lib/supabase";
import { getAreas, getPlans } from "@/lib/catalogue";
import { ListingWizard } from "@/components/listing-wizard";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured()) return null;
  const { id } = await params;
  const c = await db();
  const user = await currentUser();
  if (!user) return null;
  const [{ data: p }, { data: privateDetails }, { data: media }, { count }, { data: agreement }, { data: profile }, areas, plans] = await Promise.all([
    c
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("seller_id", user!.id)
      .maybeSingle(),
    c.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    c.from("property_media").select("id,alt,kind").eq("property_id", id),
    c.from("properties").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
    c.from("agreement_versions").select("id,version,content").eq("kind", "seller").eq("active", true).eq("legal_approved", true).limit(1).maybeSingle(),
    c.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle(),
    getAreas(),
    getPlans(),
  ]);
  if (!p) notFound();
  const { data: paidOrders } = p.plan_id === "free"
    ? { data: [] }
    : await c.from("orders").select("id").eq("property_id", id).eq("plan_id", p.plan_id).eq("purpose", "listing").eq("status", "paid").limit(1);
  return (
    <ListingWizard
      areas={areas}
      initial={p}
      privateDetails={privateDetails || {}}
      media={media || []}
      plans={plans}
      firstListing={count === 1}
      agreement={agreement}
      profileReady={Boolean(profile?.full_name?.trim().length > 1 && profile?.phone?.trim().length > 5)}
      paymentReady={p.plan_id === "free" || Boolean(paidOrders?.length)}
    />
  );
}
