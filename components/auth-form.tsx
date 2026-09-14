"use client";
import { useState } from "react";
import Link from "next/link";
import { Turnstile } from "./turnstile";
import { safeNext } from "@/lib/domain";
export function AuthForm({
  mode,
  next,
  resetToken,
}: {
  mode: "login" | "register" | "reset" | "update-password";
  next?: string;
  resetToken?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const r = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...data,
              action: mode,
              token,
              resetToken,
            }),
          });
          const result = await r.json();
          if (!r.ok) throw new Error(result.error);
          if (mode === "login") window.location.href = safeNext(next || null);
          else setMessage(result.message);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {mode === "register" && (
        <label>
          Full name
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
          />
        </label>
      )}
      {mode !== "update-password" && (
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
      )}
      {mode !== "reset" && (
        <label>
          {mode === "update-password" ? "New password" : "Password"}
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={12}
            maxLength={128}
            required
          />
          <span className="form-caption">Use at least 12 characters.</span>
        </label>
      )}
      {mode === "register" && (
        <p className="form-caption">
          Your account starts with basic details. Read our{" "}
          <Link href="/legal/privacy">privacy notice</Link>. Seller agreements
          are accepted separately before listing submission.
        </p>
      )}
      <Turnstile onToken={setToken} />
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
      <button className="button" disabled={busy}>
        {busy
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : mode === "register"
              ? "Create account"
              : mode === "reset"
                ? "Send recovery link"
                : "Update password"}
      </button>
      {mode === "login" && (
        <>
          <p className="form-caption">
            <Link href="/reset-password">Forgot your password?</Link>
          </p>
          <p className="form-caption">
            New to Enugu Properties?{" "}
            <Link href="/register">Create an account</Link>
          </p>
        </>
      )}
      {mode === "register" && (
        <p className="form-caption">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      )}
    </form>
  );
}
