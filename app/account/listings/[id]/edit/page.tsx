import { notFound } from "next/navigation";
import { db, currentUser, configured } from "@/lib/supabase";
import { getAreas } from "@/lib/catalogue";
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
  const [{ data: p }, { data: privateDetails }, areas] = await Promise.all([
    c
      .from("properties")
      .select("*")
      .eq("id", id)
      .eq("seller_id", user!.id)
      .maybeSingle(),
    c.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    getAreas(),
  ]);
  if (!p) notFound();
  return (
    <ListingWizard
      areas={areas}
      initial={p}
      privateDetails={privateDetails || {}}
    />
  );
}
