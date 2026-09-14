"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function VideoUpload({ property }: { property: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const file = new FormData(e.currentTarget).get("file");
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
            }),
          });
          const data = await prepare.json();
          if (!prepare.ok) throw new Error(data.error);
          const c = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          );
          setMessage("Uploading directly to private storage…");
          const { error: uploadError } = await c.storage
            .from("video-quarantine")
            .uploadToSignedUrl(data.path, data.token, file, {
              contentType: "video/mp4",
            });
          if (uploadError)
            throw new Error(
              "Upload interrupted. Please try again after the pending reservation expires.",
            );
          setMessage("Checking video content and removing metadata…");
          const finish = await fetch("/api/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "complete", id: data.id }),
          });
          const result = await finish.json();
          if (!finish.ok) throw new Error(result.error);
          setMessage(result.message);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Video upload failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Property video
        <input name="file" type="file" accept="video/mp4" required />
      </label>
      <p className="form-caption">
        H.264 MP4, up to 100 MB and your plan’s duration limit. Videos go
        directly to private storage before validation.
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
