"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          action: string;
          appearance: "always";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}
export function Turnstile({
  onToken,
  action,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  action: string;
  resetKey?: number;
}) {
  const target = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const widgetId = useRef<string | undefined>(undefined);
  const previousResetKey = useRef(resetKey);
  const [canReset, setCanReset] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "ready" | "verified" | "expired" | "error"
  >("loading");

  const reset = useCallback(() => {
    onToken("");
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      setStatus("ready");
    }
  }, [onToken]);

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    reset();
  }, [reset, resetKey]);

  const render = useCallback(() => {
    const key = document.body.dataset.turnstileSiteKey || "";
    if (!key) {
      setStatus("error");
      return;
    }
    if (!rendered.current && target.current && window.turnstile) {
      widgetId.current = window.turnstile.render(target.current, {
        sitekey: key,
        callback: (token) => {
          setStatus("verified");
          onToken(token);
        },
        "expired-callback": () => {
          setStatus("expired");
          onToken("");
          window.setTimeout(reset, 0);
        },
        "error-callback": () => {
          setStatus("error");
          onToken("");
        },
        action,
        appearance: "always",
      });
      rendered.current = true;
      setCanReset(true);
      setStatus("ready");
    }
  }, [action, onToken, reset]);
  return (
    <div className="turnstile-shell">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
        onError={() => setStatus("error")}
      />
      <div ref={target} data-turnstile-action={action} />
      {status === "loading" && (
        <span className="turnstile-status" role="status">
          Loading security check…
        </span>
      )}
      {status === "error" && (
        <span className="turnstile-status error" role="alert">
          The security check could not load. Use the reset button to try again.
        </span>
      )}
      {status === "expired" && (
        <span className="turnstile-status error" role="alert">
          The security check expired and is being reset.
        </span>
      )}
      {canReset && (
        <button
          className="button secondary small turnstile-reset"
          type="button"
          onClick={reset}
        >
          Reset security check
        </button>
      )}
    </div>
  );
}
