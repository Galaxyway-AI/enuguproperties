import { getAreas, getPlans } from "@/lib/catalogue";
import { currentUser, db } from "@/lib/supabase";
import { ListingWizard } from "@/components/listing-wizard";
export default async function NewListing() {
  const user = await currentUser();
  const [areas, plans, existing] = await Promise.all([
    getAreas(),
    getPlans(),
    user ? (await db()).from("properties").select("id", { count: "exact", head: true }).eq("seller_id", user.id) : Promise.resolve({ count: null }),
  ]);
  return <ListingWizard areas={areas} plans={plans} firstListing={existing.count === 0} />;
}
