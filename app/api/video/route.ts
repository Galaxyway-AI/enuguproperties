import { NextRequest } from "next/server";
import { z } from "zod";
import { features } from "@/lib/business";
import { configured, db } from "@/lib/supabase";
import { serverQuery } from "@/lib/server-db";
import {
  databaseActionErrorMessage,
  errorResponse,
  HttpError,
  isDatabaseActionError,
  rateLimit,
  sameOrigin,
  validationErrorMessage,
} from "@/lib/security";
import { createVideoUpload, deleteVideo, getVideo } from "@/lib/stream";

const prepareSchema = z.object({
  action: z.literal("prepare"),
  property: z.uuid(),
  size: z.number().int().positive().max(104_857_600),
  name: z.string().trim().min(1).max(180),
});
const completeSchema = z.object({
  action: z.literal("complete"),
  id: z.uuid(),
});
const cancelSchema = z.object({
  action: z.literal("cancel"),
  id: z.uuid(),
});

type UploadRow = {
  id: string;
  path: string;
  expected_bytes: number;
  status: "pending" | "processing" | "ready" | "failed";
};

export async function POST(request: NextRequest) {
  let streamIdToRemove: string | null = null;
  try {
    if (!features.video)
      throw new HttpError(404, "Video uploads are not available.");
    if (!configured())
      throw new HttpError(503, "Video uploads are awaiting account services.");
    sameOrigin(request);
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new HttpError(401, "Sign in before uploading a video.");

    const body = await request.json();
    if (body?.action === "prepare") {
      await rateLimit(`video-prepare:${user.id}`, 8, 600);
      const input = prepareSchema.parse(body);
      const { data: property } = await client
        .from("properties")
        .select("id,seller_id,status,plan_id")
        .eq("id", input.property)
        .maybeSingle();
      if (!property || property.seller_id !== user.id)
        throw new HttpError(
          403,
          "You can only add videos to your own listing.",
        );
      if (["live", "paused", "under_offer"].includes(property.status)) {
        const { error } = await client.rpc("begin_approved_listing_revision", {
          p_id: input.property,
        });
        if (error) throw error;
      } else if (!["draft", "needs_changes"].includes(property.status))
        throw new HttpError(
          400,
          "Videos can be changed while a listing is a draft or awaiting amendments.",
        );
      const { data: plan } = await client
        .from("listing_plans")
        .select("id,name,video_limit,video_seconds,video_max_bytes")
        .eq("id", property.plan_id)
        .maybeSingle();
      if (!plan || plan.video_limit < 1)
        throw new HttpError(
          400,
          "Your advertising plan does not include video uploads. Choose Plus or Premium first.",
        );
      const maximumBytes = Math.min(plan.video_max_bytes, 104_857_600);
      if (input.size > maximumBytes)
        throw new HttpError(
          413,
          `Your ${plan.name} plan accepts videos up to ${Math.floor(maximumBytes / 1_048_576)} MB.`,
        );

      const abandoned = await serverQuery<Pick<UploadRow, "id" | "path">>(
        "select id,path from public.video_uploads where property_id=$1 and owner_id=$2 and status='pending' order by created_at",
        [input.property, user.id],
      );
      for (const upload of abandoned) {
        if (upload.path.startsWith("stream:"))
          await deleteVideo(upload.path.slice("stream:".length)).catch(
            () => undefined,
          );
        await serverQuery(
          "delete from public.video_uploads where id=$1 and owner_id=$2 and status='pending'",
          [upload.id, user.id],
        );
      }

      const direct = await createVideoUpload({
        maxDurationSeconds: plan.video_seconds,
        expiry: new Date(Date.now() + 15 * 60_000).toISOString(),
        creator: user.id,
        meta: { property: input.property, name: input.name },
        allowedOrigins: [new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname],
        requireSignedURLs: true,
      });
      streamIdToRemove = direct.id;
      const rows = await serverQuery<{ id: string }>(
        "select public.reserve_video($1,$2,$3,$4) as id",
        [input.property, user.id, `stream:${direct.id}`, input.size],
      );
      const id = rows[0]?.id;
      if (!id)
        throw new HttpError(400, "The video upload could not be reserved.");
      streamIdToRemove = null;
      return Response.json({ id, uploadUrl: direct.uploadURL });
    }

    if (body?.action === "cancel") {
      const input = cancelSchema.parse(body);
      await rateLimit(`video-cancel:${user.id}`, 20, 600);
      const rows = await serverQuery<Pick<UploadRow, "id" | "path" | "status">>(
        "select id,path,status from public.video_uploads where id=$1 and owner_id=$2 limit 1",
        [input.id, user.id],
      );
      const upload = rows[0];
      if (!upload || upload.status !== "pending")
        return Response.json({ message: "Video upload already cleared." });
      if (upload.path.startsWith("stream:"))
        await deleteVideo(upload.path.slice("stream:".length)).catch(
          () => undefined,
        );
      await serverQuery(
        "delete from public.video_uploads where id=$1 and owner_id=$2 and status='pending'",
        [input.id, user.id],
      );
      return Response.json({ message: "Interrupted video upload cleared." });
    }

    const input = completeSchema.parse(body);
    await rateLimit(`video-complete:${user.id}`, 90, 600);
    const rows = await serverQuery<UploadRow>(
      "select id,path,expected_bytes,status from public.video_uploads where id=$1 and owner_id=$2 limit 1",
      [input.id, user.id],
    );
    const upload = rows[0];
    if (!upload)
      throw new HttpError(404, "This video upload could not be found.");
    if (upload.status === "ready")
      return Response.json({ message: "Video uploaded and ready for review." });
    if (upload.status === "failed")
      throw new HttpError(
        400,
        "This video could not be processed. Choose another supported video file.",
      );
    if (!upload.path.startsWith("stream:"))
      throw new HttpError(400, "This upload uses an unsupported video format.");

    const streamId = upload.path.slice("stream:".length);
    const video = await getVideo(streamId);
    if (video.status.state === "error") {
      await serverQuery(
        "update public.video_uploads set status='failed' where id=$1",
        [input.id],
      );
      await deleteVideo(streamId).catch(() => undefined);
      throw new HttpError(
        400,
        video.status.errorReasonText ||
          "Cloudflare could not process this video. Try a standard MP4, MOV or WebM file.",
      );
    }
    if (!video.readyToStream) {
      return Response.json(
        {
          processing: true,
          message: `Video uploaded. Processing ${video.status.pctComplete || "0"}%…`,
        },
        { status: 202 },
      );
    }
    const claimed = await serverQuery<{ id: string }>(
      "update public.video_uploads set status='processing' where id=$1 and owner_id=$2 and status='pending' returning id",
      [input.id, user.id],
    );
    if (!claimed[0] && upload.status !== "processing")
      throw new HttpError(409, "This video upload has already been completed.");
    const attached = await serverQuery<{ id: string }>(
      "select public.finish_video($1,$2,$3,$4) as id",
      [input.id, upload.path, video.size, video.duration],
    );
    if (!attached[0]?.id)
      throw new HttpError(
        400,
        "The processed video could not be attached to this listing.",
      );
    return Response.json({
      id: attached[0].id,
      message: "Video uploaded, processed and ready for review.",
    });
  } catch (error) {
    if (streamIdToRemove)
      await deleteVideo(streamIdToRemove).catch(() => undefined);
    if (error instanceof z.ZodError)
      return Response.json(
        { error: validationErrorMessage(error) },
        { status: 400 },
      );
    if (isDatabaseActionError(error) && !(error instanceof HttpError))
      return Response.json(
        { error: databaseActionErrorMessage(error) },
        { status: 400 },
      );
    if (
      error instanceof Error &&
      error.message.includes("Storage capacity exceeded")
    ) {
      console.error(
        JSON.stringify({
          event: "video_storage_capacity_exceeded",
          at: new Date().toISOString(),
        }),
      );
      return Response.json(
        {
          error:
            "Video storage is not active yet. Please contact Enugu Properties support while the administrator completes the video service setup.",
        },
        { status: 503 },
      );
    }
    return errorResponse(error);
  }
}
