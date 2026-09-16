"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function prepareImage(file: File) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error("Choose an image smaller than 40 megapixels.");
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob) throw new Error("This browser could not prepare the image.");
    const name = file.name.replace(/\.[^.]+$/, "") || "property-photo";
    return new File([blob], `${name}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
export function UploadForm({
  property,
  kind,
  types = [],
  staff = false,
  currentCount = 0,
  limit,
}: {
  property: string;
  kind: "image" | "document";
  types?: { id: string; name: string }[];
  staff?: boolean;
  currentCount?: number;
  limit?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const allowanceReached =
    kind === "image" && limit !== undefined && currentCount >= limit;
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
          const selected = data.get("file");
          if (selected instanceof File && selected.type.startsWith("image/"))
            data.set("file", await prepareImage(selected));
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
          disabled={allowanceReached}
        />
      </label>
      <p className="form-caption">
        Maximum 12 MB.{" "}
        {kind === "document"
          ? "Evidence is private and is not published on your listing."
          : "Images are optimised and location metadata is removed."}
      </p>
      {kind === "image" && limit !== undefined && (
        <div
          className={allowanceReached ? "notice error" : "notice"}
          role={allowanceReached ? "alert" : "status"}
        >
          {allowanceReached
            ? `You have reached this plan’s maximum of ${limit} photographs. Delete a photograph or choose a plan with a higher allowance.`
            : `${currentCount} of ${limit} photographs used. You can add ${limit - currentCount} more.`}
        </div>
      )}
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
      <button className="button secondary" disabled={busy || allowanceReached}>
        {busy ? "Uploading…" : "Upload securely"}
      </button>
    </form>
  );
}
