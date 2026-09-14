"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="container section">
      <div className="empty-state">
        <h2>We couldn’t load this page.</h2>
        <p>Please try again. Your saved account information is unchanged.</p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </section>
  );
}
