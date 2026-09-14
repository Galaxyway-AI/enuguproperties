import { NextRequest } from "next/server";
import { db, serviceDb } from "@/lib/supabase";
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
    const { data, error } = await serviceDb()
      .storage.from("property-media")
      .download(m.storage_path);
    if (error || !data) return new Response("Not found", { status: 404 });
    return new Response(data, {
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
