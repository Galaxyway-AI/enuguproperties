import "server-only";
import { env } from "cloudflare:workers";

export type MediaArea =
  | "property-media"
  | "private-evidence"
  | "video-quarantine";

function objectKey(area: MediaArea, path: string) {
  if (!path || path.startsWith("/") || path.includes(".."))
    throw new Error("Invalid media path.");
  return `${area}/${path}`;
}

function bucket(area: MediaArea) {
  const selected =
    area === "property-media" ? env.MEDIA : env.PRIVATE_MEDIA;
  if (!selected) throw new Error("The requested media area is not configured.");
  return selected;
}

export async function putMedia(
  area: MediaArea,
  path: string,
  body: ArrayBuffer | ArrayBufferView | Blob | ReadableStream,
  contentType: string,
) {
  await bucket(area).put(objectKey(area, path), body, {
    httpMetadata: { contentType },
    customMetadata: { area },
  });
}

export function getMedia(area: MediaArea, path: string) {
  return bucket(area).get(objectKey(area, path));
}

export function deleteMedia(area: MediaArea, path: string) {
  return bucket(area).delete(objectKey(area, path));
}
