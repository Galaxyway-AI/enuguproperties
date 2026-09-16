"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MediaDeleteButton({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  return (
    <div className="media-delete">
      <button
        type="button"
        className="button secondary small"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              `Remove ${name}? You can upload a replacement before submitting.`,
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            const response = await fetch(
              `/api/uploads?id=${encodeURIComponent(id)}`,
              {
                method: "DELETE",
              },
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok)
              throw new Error(
                result.error ||
                  "The photograph could not be removed. Please try again.",
              );
            router.refresh();
          } catch (problem) {
            setError(
              problem instanceof Error
                ? problem.message
                : "The photograph could not be removed. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Removing…" : "Delete photograph"}
      </button>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
