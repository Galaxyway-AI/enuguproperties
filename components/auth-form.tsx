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
  if (message && mode === "register")
    return (
      <div className="notice success submission-success" role="status">
        <h2>Account created</h2>
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
        <>
          <div className="form-grid two">
            <label>
              First name
              <input
                name="firstName"
                autoComplete="given-name"
                required
                minLength={1}
                maxLength={60}
              />
            </label>
            <label>
              Last name
              <input
                name="lastName"
                autoComplete="family-name"
                required
                minLength={1}
                maxLength={60}
              />
            </label>
          </div>
          <label>
            Telephone
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              minLength={6}
              maxLength={30}
            />
          </label>
          <label>
            Who are you listing or searching as?
            <select name="sellerType" defaultValue="buyer" required>
              <option value="buyer">Buyer</option>
              <option value="owner">Property owner</option>
              <option value="agent">Authorised agent</option>
              <option value="developer">Developer / company</option>
            </select>
          </label>
        </>
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
        <>
          <label className="checkbox-row">
            <input name="acceptTerms" type="checkbox" required />
            <span>
              I have read and agree to the{" "}
              <Link href="/legal/terms" target="_blank">
                Terms of Use
              </Link>
              .
            </span>
          </label>
          <label className="checkbox-row">
            <input name="acknowledgePrivacy" type="checkbox" required />
            <span>
              I acknowledge the{" "}
              <Link href="/legal/privacy" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <p className="form-caption">
            Seller Terms and the property-specific marketing mandate are
            accepted separately before a listing is submitted.
          </p>
        </>
      )}
      <Turnstile onToken={setToken} action={mode} />
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
