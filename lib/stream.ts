import "server-only";
import { env, type StreamDirectUploadCreateParams } from "cloudflare:workers";

export function createVideoUpload(params: StreamDirectUploadCreateParams) {
  if (!env.STREAM) throw new Error("Cloudflare Stream is not configured.");
  return env.STREAM.createDirectUpload(params);
}

export function getVideo(id: string) {
  if (!env.STREAM) throw new Error("Cloudflare Stream is not configured.");
  return env.STREAM.video(id).details();
}

export function deleteVideo(id: string) {
  if (!env.STREAM) throw new Error("Cloudflare Stream is not configured.");
  return env.STREAM.video(id).delete();
}

export async function videoEmbedUrl(id: string) {
  if (!env.STREAM) throw new Error("Cloudflare Stream is not configured.");
  const handle = env.STREAM.video(id);
  const [details, token] = await Promise.all([
    handle.details(),
    handle.generateToken(),
  ]);
  if (!details.readyToStream || !details.preview)
    throw new Error("Video is not ready for playback.");
  return `${new URL(details.preview).origin}/${token}/iframe`;
}
