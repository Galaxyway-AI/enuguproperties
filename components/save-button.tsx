"use client";
import { Heart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function SaveButton({
  id,
  demo = false,
  initialSaved = false,
}: {
  id: string;
  demo?: boolean;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (demo) {
      setMessage("Sample listings cannot be saved.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buyer",
          property: id,
          kind: "save",
          data: {},
        }),
      });
      const data = await r.json();
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      if (!r.ok) throw new Error(data.error);
      setSaved(data.saved);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={`save-button ${saved ? "saved" : ""}`}
        aria-label={saved ? "Remove saved property" : "Save property"}
        aria-pressed={saved}
        onClick={save}
        disabled={busy}
      >
        <Heart size={19} fill={saved ? "currentColor" : "none"} />
      </button>
      {message && (
        <span
          role="status"
          className="card-message"
          onClick={() => setMessage("")}
        >
          {message}
        </span>
      )}
    </>
  );
}
