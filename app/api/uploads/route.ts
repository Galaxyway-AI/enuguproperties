import { NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { db, configured } from "@/lib/supabase";
import { serverQuery } from "@/lib/server-db";
import { deleteMedia, putMedia, type MediaArea } from "@/lib/storage";
import {
  sameOrigin,
  rateLimit,
  errorResponse,
  HttpError,
} from "@/lib/security";
import { z } from "zod";
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
        .select("id,seller_id,status")
        .eq("id", property)
        .single();
      if (
        !p ||
        p.seller_id !== user.id ||
        !["draft", "needs_changes"].includes(p.status)
      )
        throw new HttpError(
          403,
          "Only your editable draft can receive uploads.",
        );
    }
    let bytes = Buffer.from(await file.arrayBuffer());
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
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new HttpError(
          400,
          "Upload a JPEG, PNG, WebP image or a PDF document.",
        );
      const image = sharp(bytes, {
        limitInputPixels: 40000000,
        failOn: "error",
      });
      const metadata = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format || "") ||
        (metadata.pages || 1) > 1
      )
        throw new HttpError(400, "Unsupported image content.");
      bytes = Buffer.from(
        await image
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer(),
      );
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
          [property, user.id, path, common.p_type, file.name, mime, common.p_hash],
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
    if (orphan)
      await deleteMedia(orphan.bucket, orphan.path);
    return errorResponse(e);
  }
}
