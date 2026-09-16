import { NextRequest } from "next/server";
import { db } from "@/lib/supabase";
import { getMedia } from "@/lib/storage";
import { videoEmbedUrl } from "@/lib/stream";
import { z } from "zod";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const c = await db();
    const {
      data: { user },
    } = await c.auth.getUser();
    if (!user) return new Response("Unauthorised", { status: 401 });
    const { data: m } = await c
      .from("property_media")
      .select("storage_path,mime")
      .eq("id", z.uuid().parse((await params).id))
      .single();
    if (!m) return new Response("Not found", { status: 404 });
    if (m.storage_path.startsWith("stream:")) {
      const target = await videoEmbedUrl(
        m.storage_path.slice("stream:".length),
      );
      return Response.redirect(target, 302);
    }
    const object = await getMedia("property-media", m.storage_path);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": m.mime,
        "Cache-Control": "private,no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
