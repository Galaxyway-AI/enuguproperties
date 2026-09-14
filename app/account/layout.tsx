import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, configured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured())
    return (
      <section className="container section">
        <div className="empty-state">
          <h1 style={{ fontSize: 34, letterSpacing: -1 }}>
            Your account workspace is being prepared.
          </h1>
          <p>
            Secure account services need to be connected before you can create
            listings, upload documents or send requests.
          </p>
          <Link className="button" href="/properties">
            Explore the marketplace
          </Link>
        </div>
      </section>
    );
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <div className="container dashboard">
      <nav className="dashboard-nav" aria-label="Account navigation">
        {[
          "dashboard",
          "listings",
          "saved",
          "enquiries",
          "inspections",
          "offers",
          "transactions",
          "documents",
          "billing",
          "profile",
          "organisation",
          "security",
        ].map((s) => (
          <Link key={s} href={`/account/${s}`}>
            {s[0].toUpperCase() + s.slice(1)}
          </Link>
        ))}
        <Link href="/admin">Staff workspace</Link>
      </nav>
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
