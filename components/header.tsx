"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X, Building2 } from "lucide-react";
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [
    ["/properties", "Find a property"],
    ["/areas", "Explore Enugu"],
    ["/verification", "Our verification"],
    ["/buying-from-abroad", "Buying from abroad"],
  ];
  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="Enugu Properties home">
          <span className="brand-symbol">
            <Building2 size={27} />
          </span>
          <span>
            enugu<span className="brand-small">PROPERTIES</span>
          </span>
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
        </nav>
        <div className="nav-actions">
          <Link className="login-link" href="/login">
            Sign in
          </Link>
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
