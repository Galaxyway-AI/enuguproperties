declare module "cloudflare:workers" {
  interface MediaObjectBody {
    body: ReadableStream<Uint8Array>;
  }

  interface MediaBucket {
    put(
      key: string,
      value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream,
      options?: {
        httpMetadata?: { contentType?: string };
        customMetadata?: Record<string, string>;
      },
    ): Promise<unknown>;
    get(key: string): Promise<MediaObjectBody | null>;
    delete(key: string): Promise<void>;
  }

  export const env: { MEDIA: MediaBucket; PRIVATE_MEDIA: MediaBucket };
}
