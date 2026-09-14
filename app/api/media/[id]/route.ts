import { NextRequest } from "next/server";
import { db, configured, serviceDb } from "@/lib/supabase";
import { z } from "zod";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!configured()) return new Response("Not found", { status: 404 });
    const id = z.uuid().parse((await params).id);
    const service = serviceDb();
    const { data: media } = await service
      .from("property_media")
      .select("storage_path,property_id,mime")
      .eq("id", id)
      .eq("status", "ready")
      .single();
    if (!media) return new Response("Not found", { status: 404 });
    const { data: publicProperty } = await (
      await db()
    )
      .from("public_properties")
      .select("id")
      .eq("id", media.property_id)
      .maybeSingle();
    if (!publicProperty) return new Response("Not found", { status: 404 });
    const { data, error } = await service.storage
      .from("property-media")
      .download(media.storage_path);
    if (error || !data) return new Response("Not found", { status: 404 });
    return new Response(data, {
      headers: {
        "Content-Type": media.mime,
        "Cache-Control": "public,max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
