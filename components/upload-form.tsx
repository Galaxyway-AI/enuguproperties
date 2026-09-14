"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function UploadForm({
  property,
  kind,
  types = [],
  staff = false,
}: {
  property: string;
  kind: "image" | "document";
  types?: { id: string; name: string }[];
  staff?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const form = e.currentTarget;
        const data = new FormData(form);
        data.set("property", property);
        data.set("kind", kind);
        data.set("staff", String(staff));
        try {
          const r = await fetch("/api/uploads", { method: "POST", body: data });
          const result = await r.json();
          if (!r.ok) throw new Error(result.error);
          setMessage(result.message);
          form.reset();
          router.refresh();
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Upload failed. Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {kind === "document" && (
        <label>
          Document category
          <select name="type">
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {kind === "image" ? "Property photograph" : "Private evidence"}
        <input
          type="file"
          name="file"
          accept={
            kind === "image"
              ? "image/jpeg,image/png,image/webp"
              : "image/jpeg,image/png,image/webp,application/pdf"
          }
          required
        />
      </label>
      <p className="form-caption">
        Maximum 12 MB.{" "}
        {kind === "document"
          ? "Evidence is private and is not published on your listing."
          : "Images are optimised and location metadata is removed."}
      </p>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="notice success" role="status">
          {message}
        </div>
      )}
      <button className="button secondary" disabled={busy}>
        {busy ? "Uploading…" : "Upload securely"}
      </button>
    </form>
  );
}
