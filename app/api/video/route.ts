import { features } from "@/lib/business";

export async function POST() {
  if (!features.video)
    return Response.json({ error: "Video uploads are disabled." }, { status: 404 });

  return Response.json(
    { error: "Video processing is unavailable in this Worker release." },
    { status: 503 },
  );
}
