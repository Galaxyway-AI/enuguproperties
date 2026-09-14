import { getAreas } from "@/lib/catalogue";
import { ListingWizard } from "@/components/listing-wizard";
export default async function NewListing() {
  return <ListingWizard areas={await getAreas()} />;
}
