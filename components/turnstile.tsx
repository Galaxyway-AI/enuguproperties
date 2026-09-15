"use client";
import Script from "next/script";
import { useRef, useState } from "react";
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
    };
  }
}
export function Turnstile({
  onToken,
  action,
}: {
  onToken: (token: string) => void;
  action: string;
}) {
  const target = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  function render() {
    const key = document.body.dataset.turnstileSiteKey || "";
    if (!key) {
      setStatus("error");
      return;
    }
    if (!rendered.current && target.current && window.turnstile) {
      window.turnstile.render(target.current, {
        sitekey: key,
        callback: (token) => {
          setStatus("ready");
          onToken(token);
        },
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          setStatus("error");
          onToken("");
        },
        action,
        appearance: "always",
      });
      rendered.current = true;
      setStatus("ready");
    }
  }
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
          The security check could not load. Refresh the page and try again.
        </span>
      )}
    </div>
  );
}
