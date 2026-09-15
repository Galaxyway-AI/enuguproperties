"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Turnstile } from "./turnstile";
export function ActionForm({
  action,
  extra = {},
  children,
  label = "Save changes",
  bot = false,
  replaceOnSuccess = false,
  successTitle = "Completed",
}: {
  action: string;
  extra?: Record<string, unknown>;
  children?: React.ReactNode;
  label?: string;
  bot?: boolean;
  replaceOnSuccess?: boolean;
  successTitle?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();
  if (message && replaceOnSuccess)
    return (
      <div className="notice success submission-success" role="status">
        <h2>{successTitle}</h2>
        <p>{message}</p>
      </div>
    );
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const fields: Record<string, FormDataEntryValue> = Object.fromEntries(
            new FormData(e.currentTarget),
          );
          for (const key of ["preferred_at", "starts_at", "ends_at"]) {
            if (typeof fields[key] === "string" && fields[key])
              fields[key] = new Date(fields[key]).toISOString();
          }
          const r = await fetch("/api/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...extra, data: fields, token }),
          });
          const result = await r.json();
          if (!r.ok) throw new Error(result.error);
          if (result.url) window.location.href = result.url;
          else {
            setMessage(result.message || "Your changes have been saved.");
            router.refresh();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {bot && <Turnstile onToken={setToken} action={action} />}
      <div aria-live="polite">
        {message && <div className="notice success">{message}</div>}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </div>
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
    </form>
  );
}
