import Link from "next/link";
export default function NotFound() {
  return (
    <section className="container section">
      <div className="empty-state">
        <span className="eyebrow">404 · PAGE NOT FOUND</span>
        <h1 style={{ fontSize: 36, letterSpacing: -1 }}>
          Let’s find your way back.
        </h1>
        <p>
          This page may have moved or the property may not be publicly
          available.
        </p>
        <Link className="button" href="/properties">
          Browse properties
        </Link>
      </div>
    </section>
  );
}
