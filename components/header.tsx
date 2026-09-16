"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
export function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/session", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((session: { signedIn?: boolean } | null) =>
        setSignedIn(Boolean(session?.signedIn)),
      )
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setSignedIn(false);
      });
    return () => controller.abort();
  }, [pathname]);
  const links = [
    ["/properties?purpose=sale", "Buy"],
    ["/properties?purpose=rent", "Rent"],
    ["/properties?purpose=short-let", "Short lets"],
    ["/areas", "Explore Enugu"],
    ["/verification", "Our verification"],
  ];
  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="Enugu Properties home">
          <Image
            className="brand-logo"
            src="/logo_long.png"
            alt=""
            width={2172}
            height={724}
            priority
          />
        </Link>
        <nav
          aria-label="Main navigation"
          className={open ? "nav-links open" : "nav-links"}
        >
          {links.map(([href, label]) => (
            <Link
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? "page" : undefined}
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
          <div className="mobile-auth-actions">
            {signedIn ? (
              <Link onClick={() => setOpen(false)} className="button" href="/account/dashboard">
                My account
              </Link>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} className="button" href="/register">
                  Register
                </Link>
                <Link onClick={() => setOpen(false)} className="button secondary" href="/login">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className="nav-actions">
          {signedIn ? (
            <Link className="login-link" href="/account/dashboard">My account</Link>
          ) : (
            <>
              <Link className="login-link" href="/login">Sign in</Link>
              <Link className="register-link" href="/register">Register</Link>
            </>
          )}
          <Link className="button small" href="/sell">
            List a property <ArrowUpRight size={16} />
          </Link>
          <button
            type="button"
            className="icon-button menu-button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
