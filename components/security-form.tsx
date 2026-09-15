"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Setup = { configured: boolean; secret?: string; uri?: string };

export function SecurityForm() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function request(body: Record<string, string>) {
    const response = await fetch("/api/staff-mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Please try again.");
    return result;
  }

  return (
    <div className="panel stack-form">
      <h2 style={{ fontSize: 25 }}>Two-factor authentication</h2>
      <p>
        Staff permissions require a verified authenticator code for each
        eight-hour staff session.
      </p>
      {!setup && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = (await request({ action: "start" })) as Setup;
              setSetup(result);
              setMessage(
                result.configured
                  ? "Enter the current code from your authenticator app."
                  : "Add the setup key to your authenticator app, then enter its six-digit code.",
              );
            } catch (problem) {
              setError(
                problem instanceof Error
                  ? problem.message
                  : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Preparing…" : "Set up or verify authenticator"}
        </button>
      )}
      {setup?.secret && (
        <div className="notice">
          <strong>Authenticator setup key</strong>
          <p className="code-value">
            {setup.secret.match(/.{1,4}/g)?.join(" ")}
          </p>
          {setup.uri && <a href={setup.uri}>Open in an authenticator app</a>}
        </div>
      )}
      {setup && (
        <form
          className="stack-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const code = String(
                new FormData(event.currentTarget).get("code"),
              );
              const result = await request({ action: "verify", code });
              setMessage(result.message);
              router.push("/admin");
              router.refresh();
            } catch (problem) {
              setError(
                problem instanceof Error
                  ? problem.message
                  : "Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Verifying…" : "Verify code"}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
