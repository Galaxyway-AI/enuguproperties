import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { getMedia } from "@/lib/storage";
import { verifyEvidenceToken } from "@/lib/signed-media";
import { serverQuery } from "@/lib/server-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = z.uuid().parse((await params).id);
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    const token = request.nextUrl.searchParams.get("token") || "";
    if (!user || !verifyEvidenceToken(token, id, user.id))
      return new Response("Unauthorised", { status: 401 });
    const { data: document } = await client
      .from("property_documents")
      .select("storage_path,mime,original_name,scan_status")
      .eq("id", id)
      .single();
    if (!document || document.scan_status !== "clean")
      return new Response("Not found", { status: 404 });
    const object = await getMedia("private-evidence", document.storage_path);
    if (!object) return new Response("Not found", { status: 404 });
    await serverQuery(
      "insert into public.audit_logs(actor_id,action,entity,entity_id) values($1,'document_downloaded','document',$2)",
      [user.id, id],
    );
    const safeName = document.original_name.replace(/[^a-zA-Z0-9._ -]/g, "_");
    return new Response(object.body, {
      headers: {
        "Content-Type": document.mime,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private,no-store,max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
