declare module "cloudflare:workers" {
  export type StreamDirectUploadCreateParams = {
    maxDurationSeconds: number;
    expiry?: string;
    creator?: string;
    meta?: Record<string, string>;
    allowedOrigins?: string[];
    requireSignedURLs?: boolean;
  };

  interface StreamVideo {
    id: string;
    readyToStream: boolean;
    preview?: string;
    size: number;
    duration: number;
    status: {
      state: string;
      pctComplete?: string;
      errorReasonText: string;
    };
  }

  interface StreamVideoHandle {
    details(): Promise<StreamVideo>;
    delete(): Promise<void>;
    generateToken(): Promise<string>;
  }

  interface StreamBinding {
    createDirectUpload(
      params: StreamDirectUploadCreateParams,
    ): Promise<{ id: string; uploadURL: string }>;
    video(id: string): StreamVideoHandle;
  }

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

  export const env: {
    MEDIA: MediaBucket;
    PRIVATE_MEDIA: MediaBucket;
    STREAM: StreamBinding;
  };
}
