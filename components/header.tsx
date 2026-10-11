"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import styles from "./site-navigation.module.css";

const propertyLinks = [
  ["/property-for-sale/enugu", "Buy"],
  ["/property-for-rent/enugu", "Rent"],
  ["/short-lets/enugu", "Short lets"],
  ["/about", "About us"],
] as const;

const helpLinks = [
  ["/how-it-works", "How it works"],
  ["/faq", "Frequently asked questions"],
  ["/verification", "Understand verification"],
  ["/contact", "Contact the team"],
  ["/buying-from-abroad", "Diaspora support"],
  ["/areas", "Explore Enugu"],
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (!open && !helpOpen) return;

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setHelpOpen(false);
      (open ? menuButtonRef : helpButtonRef).current?.focus();
    }

    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setOpen(false);
        setHelpOpen(false);
      }
    }

    document.addEventListener("keydown", dismissOnEscape);
    document.addEventListener("pointerdown", dismissOutside);
    return () => {
      document.removeEventListener("keydown", dismissOnEscape);
      document.removeEventListener("pointerdown", dismissOutside);
    };
  }, [open, helpOpen]);

  function closeNavigation() {
    setOpen(false);
    setHelpOpen(false);
  }

  function renderHelpLinks() {
    return helpLinks.map(([href, label]) => (
      <li key={href}>
        <Link
          href={href}
          onClick={closeNavigation}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      </li>
    ));
  }

  return (
    <header className={`site-header ${styles.header}`} ref={headerRef}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={`brand ${styles.brand}`} aria-label="Enugu Properties home" onClick={closeNavigation}>
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
          id="main-navigation"
          aria-label="Main navigation"
          className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`}
        >
          <div className={styles.mobileAuth}>
            {signedIn ? (
              <Link onClick={closeNavigation} className="button" href="/account/dashboard">
                My account
              </Link>
            ) : (
              <>
                <Link onClick={closeNavigation} className="button" href="/register">
                  Register
                </Link>
                <Link onClick={closeNavigation} className="button secondary" href="/login">
                  Sign in
                </Link>
              </>
            )}
          </div>
          <ul className={styles.mainLinks}>
            {propertyLinks.map(([href, label]) => (
              <li key={href}>
                <Link
                  onClick={closeNavigation}
                  aria-current={pathname === href ? "page" : undefined}
                  href={href}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li
              className={styles.desktopHelp}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setHelpOpen(false);
              }}
            >
              <button
                className={styles.helpButton}
                type="button"
                ref={helpButtonRef}
                aria-expanded={helpOpen}
                aria-controls="help-navigation"
                onClick={() => setHelpOpen((value) => !value)}
              >
                Help <ChevronDown size={15} aria-hidden="true" />
              </button>
              <ul id="help-navigation" className={styles.helpLinks} hidden={!helpOpen}>
                {renderHelpLinks()}
              </ul>
            </li>
          </ul>
          <div className={styles.mobileHelp}>
            <h2>Help and information</h2>
            <ul>{renderHelpLinks()}</ul>
          </div>
        </nav>
        <div className={styles.actions}>
          <div className={styles.desktopAuth}>
            {signedIn ? (
              <Link href="/account/dashboard">My account</Link>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link className={styles.register} href="/register">Register</Link>
              </>
            )}
          </div>
          <Link className={`button small ${styles.listButton}`} href="/sell" onClick={closeNavigation}>
            List a property <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            ref={menuButtonRef}
            className={`icon-button ${styles.menuButton}`}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => {
              setOpen((value) => !value);
              setHelpOpen(false);
            }}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
