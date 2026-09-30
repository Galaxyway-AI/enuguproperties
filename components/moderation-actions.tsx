"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModerationActions({
  id,
  options,
}: {
  id: string;
  options: [string, string][];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function decide(decision: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "moderate", id, data: { decision, reason: note.trim() } }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The decision could not be recorded. Please try again.");
      setMessage(result.message || "Decision recorded and the seller notified.");
      setNote("");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The decision could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="stack-form">
    <div className="moderation-actions" role="group" aria-label="Moderation decisions">
      {options.map(([value, label]) => <button
        key={value}
        type="button"
        className={`button ${value === "live" ? "" : value === "rejected" ? "danger" : "secondary"}`}
        disabled={busy}
        onClick={() => void decide(value)}
      >{busy ? "Recording…" : label}</button>)}
    </div>
    <details>
      <summary>Add a note to the seller (optional)</summary>
      <label>Decision note
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Explain changes needed or why you declined the advert." />
      </label>
    </details>
    <p className="form-caption">A short default message is sent when no note is added. Every decision is recorded in review and audit history.</p>
    {message && <div className="notice success" role="status">{message}</div>}
    {error && <div className="notice error" role="alert">{error}</div>}
  </div>;
}
