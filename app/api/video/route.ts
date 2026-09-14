import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import { z } from "zod";
import { db, serviceDb } from "@/lib/supabase";
import {
  sameOrigin,
  rateLimit,
  HttpError,
  errorResponse,
} from "@/lib/security";
export const runtime = "nodejs";
export const maxDuration = 180;
const execute = promisify(execFile);
export async function POST(request: NextRequest) {
  let directory: string | undefined;
  let processing: string | undefined;
  try {
    sameOrigin(request);
    const c = await db();
    const {
      data: { user },
    } = await c.auth.getUser();
    if (!user) throw new HttpError(401, "Sign in first.");
    await rateLimit(`video:${user.id}`, 8, 600);
    const body = await request.json();
    const service = serviceDb();
    if (body.action === "prepare") {
      const property = z.uuid().parse(body.property);
      const size = z.number().int().positive().max(104857600).parse(body.size);
      const path = `${user.id}/${property}/${randomUUID()}.mp4`;
      const { data: id, error } = await service.rpc("reserve_video", {
        p_property: property,
        p_actor: user.id,
        p_path: path,
        p_bytes: size,
      });
      if (error) throw new HttpError(400, error.message);
      const { data: signed, error: signError } = await service.storage
        .from("video-quarantine")
        .createSignedUploadUrl(path);
      if (signError) {
        await service
          .from("video_uploads")
          .update({ status: "failed" })
          .eq("id", id);
        throw signError;
      }
      return Response.json({ id, path, token: signed.token });
    }
    if (body.action !== "complete")
      throw new HttpError(400, "Unknown video action.");
    const id = z.uuid().parse(body.id);
    const { data: upload, error: claimError } = await service
      .from("video_uploads")
      .update({ status: "processing" })
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .select("*")
      .single();
    if (claimError || !upload)
      throw new HttpError(400, "Upload is already processing or unavailable.");
    processing = id;
    const { data: blob, error: downloadError } = await service.storage
      .from("video-quarantine")
      .download(upload.path);
    if (downloadError || !blob)
      throw new HttpError(400, "Upload did not finish. Please retry.");
    if (blob.size !== upload.expected_bytes || blob.size > 104857600)
      throw new HttpError(400, "Video size did not match.");
    const bytes = Buffer.from(await blob.arrayBuffer());
    if (bytes.subarray(4, 8).toString() !== "ftyp")
      throw new HttpError(400, "Only genuine MP4 videos are supported.");
    directory = await mkdtemp(join(tmpdir(), "enugu-video-"));
    const input = join(directory, "input.mp4");
    const output = join(directory, "processed.mp4");
    await writeFile(input, bytes);
    const { stdout } = await execute(
      ffprobe.path,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-show_format",
        "-show_streams",
        "-of",
        "json",
        input,
      ],
      { timeout: 30000, maxBuffer: 2000000, windowsHide: true },
    );
    const info = JSON.parse(stdout);
    const duration = Number(info.format?.duration);
    const streams = info.streams as {
      codec_type: string;
      codec_name: string;
      width?: number;
      height?: number;
    }[];
    const video = streams.find((s) => s.codec_type === "video");
    if (
      !video ||
      video.codec_name !== "h264" ||
      !Number.isFinite(duration) ||
      duration <= 0
    )
      throw new HttpError(400, "Use an H.264 MP4 video with a valid duration.");
    if ((video.width || 0) > 4096 || (video.height || 0) > 4096)
      throw new HttpError(400, "Upload a video no larger than 4K.");
    const { data: p } = await service
      .from("properties")
      .select("plan_id")
      .eq("id", upload.property_id)
      .single();
    const { data: plan } = await service
      .from("listing_plans")
      .select("video_seconds")
      .eq("id", p?.plan_id)
      .single();
    if (!plan || duration > plan.video_seconds)
      throw new HttpError(
        400,
        `Video exceeds the plan duration limit${plan ? ` of ${plan.video_seconds} seconds` : ""}.`,
      );
    if (!ffmpeg) throw new Error("Video processor missing");
    await execute(
      ffmpeg,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-i",
        input,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c",
        "copy",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-movflags",
        "+faststart",
        output,
      ],
      { timeout: 60000, maxBuffer: 2000000, windowsHide: true },
    );
    const processed = await readFile(output);
    const target = `${user.id}/${upload.property_id}/${randomUUID()}.mp4`;
    const { error: storeError } = await service.storage
      .from("property-media")
      .upload(target, processed, { contentType: "video/mp4" });
    if (storeError) throw storeError;
    const { error } = await service.rpc("finish_video", {
      p_id: id,
      p_path: target,
      p_bytes: processed.length,
      p_duration: duration,
    });
    if (error) {
      await service.storage.from("property-media").remove([target]);
      throw new HttpError(400, error.message);
    }
    await service.storage.from("video-quarantine").remove([upload.path]);
    processing = undefined;
    return Response.json({
      message: "Video validated, metadata removed and saved.",
    });
  } catch (e) {
    if (processing)
      await serviceDb()
        .from("video_uploads")
        .update({ status: "failed" })
        .eq("id", processing);
    return errorResponse(e);
  } finally {
    if (directory) {
      const root = resolve(tmpdir());
      const target = resolve(directory);
      if (!target.startsWith(join(root, "enugu-video-")))
        throw new Error("Invalid temporary cleanup path");
      await rm(target, { recursive: true, force: true });
    }
  }
}
