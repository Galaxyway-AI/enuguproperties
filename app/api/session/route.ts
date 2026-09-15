import { configured, currentUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = configured() ? await currentUser() : null;
  return Response.json(
    { signedIn: Boolean(user) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
