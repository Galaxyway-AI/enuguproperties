import { NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { db, configured } from "@/lib/supabase";
import { serverQuery } from "@/lib/server-db";
import { deleteMedia, putMedia, type MediaArea } from "@/lib/storage";
import {
  sameOrigin,
  rateLimit,
  errorResponse,
  HttpError,
  databaseErrorMessage,
} from "@/lib/security";
import { z } from "zod";
import { validateMetadataFreeWebp } from "@/lib/webp";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let orphan: { bucket: MediaArea; path: string } | null = null;
  try {
    sameOrigin(request);
    if (!configured())
      throw new HttpError(503, "Uploads are awaiting secure storage setup.");
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 13 * 1024 * 1024)
      throw new HttpError(413, "Files must be 12 MB or smaller.");
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new HttpError(401, "Sign in before uploading.");
    await rateLimit(`upload:${user.id}`, 15, 300);
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 12 * 1024 * 1024
    )
      throw new HttpError(400, "Choose a file up to 12 MB.");
    const property = z.uuid().parse(form.get("property"));
    const kind = z.enum(["image", "document"]).parse(form.get("kind"));
    const staff = form.get("staff") === "true";
    if (staff) {
      const { data: permissions } = await client.rpc("my_permissions");
      if (
        kind !== "document" ||
        !permissions?.some((p: string) =>
          ["verify", "compliance", "inspect"].includes(p),
        )
      )
        throw new HttpError(403, "Staff evidence permission required.");
    } else {
      const { data: p } = await client
        .from("properties")
        .select("id,seller_id,status,plan_id")
        .eq("id", property)
        .single();
      if (
        !p ||
        p.seller_id !== user.id ||
        !["draft", "needs_changes", "live", "paused", "under_offer"].includes(
          p.status,
        )
      )
        throw new HttpError(
          403,
          ["submitted", "under_review"].includes(p?.status || "")
            ? "Photographs are locked while staff review this listing."
            : "Photos can only be changed before submission or while preparing a new approved-listing revision.",
        );
      if (kind === "image") {
        const [{ data: plan }, media] = await Promise.all([
          client
            .from("listing_plans")
            .select("name,photo_limit")
            .eq("id", p.plan_id)
            .single(),
          client
            .from("property_media")
            .select("id", { count: "exact", head: true })
            .eq("property_id", property)
            .eq("kind", "image"),
        ]);
        if (!plan)
          throw new HttpError(
            400,
            "Choose an advertising plan before uploading photographs.",
          );
        if ((media.count || 0) >= plan.photo_limit)
          throw new HttpError(
            400,
            `Your ${plan.name} plan allows a maximum of ${plan.photo_limit} photographs. Delete a photograph or choose another plan.`,
          );
      }
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    let mime = "image/webp";
    let ext = "webp";
    if (kind === "document" && bytes.subarray(0, 5).toString() === "%PDF-") {
      if (
        file.type !== "application/pdf" ||
        !bytes.subarray(-2048).toString().includes("%%EOF")
      )
        throw new HttpError(400, "The PDF could not be validated.");
      // Reject active PDF features; documents are delivered as attachments, never executed inline.
      if (
        /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA)\b/i.test(
          bytes.toString("latin1"),
        )
      )
        throw new HttpError(
          400,
          "Use a flat PDF without scripts, embedded files or automatic actions.",
        );
      mime = "application/pdf";
      ext = "pdf";
    } else {
      if (file.type !== "image/webp")
        throw new HttpError(
          400,
          "The photograph could not be prepared securely. Try a JPEG, PNG or WebP image.",
        );
      try {
        validateMetadataFreeWebp(bytes);
      } catch {
        throw new HttpError(400, "The photograph could not be validated.");
      }
    }
    const bucket: MediaArea =
      kind === "image" ? "property-media" : "private-evidence";
    const path = `${user.id}/${property}/${randomUUID()}.${ext}`;
    await putMedia(bucket, path, bytes, mime);
    orphan = { bucket, path };
    const common = {
      p_property: property,
      p_path: path,
      p_type: form.get("type") || "other",
      p_name: file.name,
      p_mime: mime,
      p_hash: createHash("sha256").update(bytes).digest("hex"),
    };
    const rows = staff
      ? await serverQuery<{ id: string }>(
          "select public.attach_staff_evidence($1,$2,$3,$4,$5,$6,$7) as id",
          [
            property,
            user.id,
            path,
            common.p_type,
            file.name,
            mime,
            common.p_hash,
          ],
        )
      : await serverQuery<{ id: string }>(
          "select public.attach_upload($1,$2,$3,$4,$5,$6,$7,$8,$9) as id",
          [
            property,
            user.id,
            path,
            kind,
            common.p_type,
            file.name,
            mime,
            bytes.length,
            common.p_hash,
          ],
        );
    const id = rows[0]?.id;
    if (!id) throw new HttpError(400, "The upload could not be recorded.");
    orphan = null;
    return Response.json({
      id,
      message:
        kind === "document"
          ? `Evidence uploaded to quarantine for security review. Reference: ${id}`
          : `Photograph securely uploaded. Reference: ${id}`,
    });
  } catch (e) {
    if (orphan) await deleteMedia(orphan.bucket, orphan.path);
    const databaseMessage = databaseErrorMessage(e);
    if (databaseMessage)
      return Response.json({ error: databaseMessage }, { status: 400 });
    return errorResponse(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    sameOrigin(request);
    if (!configured())
      throw new HttpError(
        503,
        "Photo management is awaiting secure storage setup.",
      );
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      throw new HttpError(401, "Sign in before removing a photograph.");
    await rateLimit(`delete-upload:${user.id}`, 20, 300);
    const id = z.uuid().parse(request.nextUrl.searchParams.get("id"));
    const rows = await serverQuery<{ bucket: MediaArea; storage_path: string }>(
      "select * from public.delete_property_media($1,$2)",
      [id, user.id],
    );
    const removed = rows[0];
    if (!removed)
      throw new HttpError(
        404,
        "The photograph was not found or is no longer available.",
      );
    try {
      await deleteMedia(removed.bucket, removed.storage_path);
    } catch {
      console.error(
        JSON.stringify({ event: "deleted_media_storage_cleanup_failed", id }),
      );
    }
    return Response.json({
      ok: true,
      message:
        "Photograph removed. You can upload a replacement before submitting.",
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        { error: "Choose a valid photograph to remove." },
        { status: 400 },
      );
    const databaseMessage = databaseErrorMessage(e);
    if (databaseMessage)
      return Response.json({ error: databaseMessage }, { status: 400 });
    return errorResponse(e);
  }
}
