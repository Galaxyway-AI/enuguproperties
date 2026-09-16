"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function cancelUpload(id: string) {
  await fetch("/api/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel", id }),
  }).catch(() => undefined);
}

export function VideoUpload({ property }: { property: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="stack-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const file = new FormData(event.currentTarget).get("file");
        if (!(file instanceof File)) return;
        setBusy(true);
        setError("");
        try {
          setMessage("Preparing secure direct upload…");
          const prepare = await fetch("/api/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "prepare",
              property,
              size: file.size,
              name: file.name,
            }),
          });
          const data = await prepare.json();
          if (!prepare.ok) throw new Error(data.error);

          setMessage("Uploading directly to the secure video service…");
          const uploadBody = new FormData();
          uploadBody.set("file", file);
          let uploaded: Response;
          try {
            uploaded = await fetch(data.uploadUrl, {
              method: "POST",
              body: uploadBody,
            });
          } catch {
            await cancelUpload(data.id);
            throw new TypeError("Failed to fetch");
          }
          if (!uploaded.ok) {
            await cancelUpload(data.id);
            throw new Error(
              "The video upload was interrupted or the file exceeded your plan limit. Please try again.",
            );
          }

          setMessage("Processing the video for safe, reliable playback…");
          let result: {
            error?: string;
            message?: string;
            processing?: boolean;
          } = {};
          for (let attempt = 0; attempt < 60; attempt += 1) {
            const finish = await fetch("/api/video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "complete", id: data.id }),
            });
            result = await finish.json();
            if (!finish.ok && finish.status !== 202)
              throw new Error(result.error || "Video processing failed.");
            setMessage(result.message || "Processing video…");
            if (!result.processing) break;
            await wait(2_000);
          }
          if (result.processing)
            throw new Error(
              "The video is still processing. Wait a minute, then refresh this page.",
            );
          setMessage(result.message || "Video uploaded and ready for review.");
          router.refresh();
        } catch (problem) {
          setError(
            problem instanceof TypeError && problem.message === "Failed to fetch"
              ? "The browser could not reach the secure video service. Check your connection, refresh the page and try again."
              : problem instanceof Error
                ? problem.message
                : "Video upload failed.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Property video
        <input
          name="file"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          required
        />
      </label>
      <p className="form-caption">
        MP4, MOV or WebM, up to 100 MB and your plan’s duration limit. Videos
        upload directly to Cloudflare for secure processing and playback.
      </p>
      {message && <p role="status">{message}</p>}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <button className="button secondary" disabled={busy}>
        {busy ? "Processing…" : "Upload video"}
      </button>
    </form>
  );
}
