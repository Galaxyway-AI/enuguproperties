/* eslint-disable @next/next/no-img-element -- Private authenticated images and local QR must not use a shared optimiser. */
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
export function SecurityForm() {
  const [qr, setQr] = useState("");
  const [factor, setFactor] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const client = () =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  return (
    <div className="panel stack-form">
      <h2 style={{ fontSize: 25 }}>Two-factor authentication</h2>
      <p>
        Staff permissions require a verified authenticator code in this session.
      </p>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const c = client();
            const { data: list, error: listError } =
              await c.auth.mfa.listFactors();
            if (listError) throw listError;
            const existing = list.totp.find((f) => f.status === "verified");
            if (existing) {
              setFactor(existing.id);
              setMessage("Enter the current code from your authenticator.");
            } else {
              const { data, error } = await c.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "Enugu Properties staff",
              });
              if (error) throw error;
              setFactor(data.id);
              setQr(data.totp.qr_code);
              setMessage(
                "Scan this code with your authenticator, then enter its six-digit code.",
              );
            }
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Set up or verify authenticator
      </button>
      {qr && (
        /* SVG remains an isolated image, never injected as executable markup. */ <div>
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`}
            width="220"
            height="220"
            alt="Authenticator setup QR code"
          />
        </div>
      )}
      {factor && (
        <form
          className="stack-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const code = String(new FormData(e.currentTarget).get("code"));
            const { error } = await client().auth.mfa.challengeAndVerify({
              factorId: factor,
              code,
            });
            setMessage(
              error
                ? "The code could not be verified. Try the current code."
                : "Authenticator verified. You can open the staff workspace.",
            );
            setBusy(false);
          }}
        >
          <label>
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
            />
          </label>
          <button className="button" disabled={busy}>
            Verify code
          </button>
        </form>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
