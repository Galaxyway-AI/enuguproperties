"use client";
import Script from "next/script";
import { useRef } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        },
      ) => string;
    };
  }
}
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!key) return null;
  function render() {
    if (!rendered.current && target.current && window.turnstile) {
      window.turnstile.render(target.current, {
        sitekey: key!,
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
      rendered.current = true;
    }
  }
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
      />
      <div ref={target} />
    </>
  );
}
