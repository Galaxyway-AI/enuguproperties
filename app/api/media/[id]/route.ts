import { NextRequest } from "next/server";
import { db, configured } from "@/lib/supabase";
import { serverQuery } from "@/lib/server-db";
import { getMedia } from "@/lib/storage";
import { videoEmbedUrl } from "@/lib/stream";
import { z } from "zod";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!configured()) return new Response("Not found", { status: 404 });
    const id = z.uuid().parse((await params).id);
    const [media] = await serverQuery<{
      storage_path: string;
      property_id: string;
      mime: string;
    }>(
      "select storage_path,property_id,mime from public.property_media where id=$1 and status='ready' limit 1",
      [id],
    );
    if (!media) return new Response("Not found", { status: 404 });
    const { data: publicProperty } = await (
      await db()
    )
      .from("public_properties")
      .select("id")
      .eq("id", media.property_id)
      .maybeSingle();
    if (!publicProperty) return new Response("Not found", { status: 404 });
    if (media.storage_path.startsWith("stream:")) {
      const target = await videoEmbedUrl(
        media.storage_path.slice("stream:".length),
      );
      return Response.redirect(target, 302);
    }
    const object = await getMedia("property-media", media.storage_path);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": media.mime,
        "Cache-Control": "public,max-age=3600,stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
