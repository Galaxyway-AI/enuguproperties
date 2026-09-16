import Link from "next/link";
import { db, currentUser, configured } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Staff workspace",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!configured() || !user)
    return (
      <section className="container section">
        <div className="empty-state">
          <h1 style={{ fontSize: 34, letterSpacing: -1 }}>
            Staff sign-in required.
          </h1>
          <p>
            This workspace is restricted to authorised Enugu Properties staff.
          </p>
          <Link className="button" href="/login?next=/admin">
            Sign in
          </Link>
        </div>
      </section>
    );
  const { data: permissions } = await (await db()).rpc("my_permissions");
  if (!permissions?.length)
    return (
      <section className="container section">
        <div className="empty-state">
          <h2>Staff access is not assigned.</h2>
          <p>
            This account is signed in but does not have an active staff role.
          </p>
          <Link className="button" href="/account/dashboard">
            Return to your account
          </Link>
        </div>
      </section>
    );
  const nav = [
    ["", "Overview", ""],
    ["moderation", "Moderation", "moderate"],
    ["verifications", "Verification", "verify"],
    ["inspections", "Inspections", "inspect"],
    ["enquiries", "Enquiries", "support"],
    ["transactions", "Transactions", "transactions"],
    ["payments", "Payments", "finance"],
    ["commissions", "Commissions", "finance"],
    ["support", "Support", "support"],
    ["reports", "Reports", "moderate"],
    ["accounts", "Accounts", "compliance"],
    ["settings", "Settings", "settings"],
    ["content", "Editorial content", "content"],
    ["audit", "Audit history", "audit"],
  ];
  return (
    <div className="container dashboard">
      <nav className="dashboard-nav" aria-label="Staff navigation">
        {nav
          .filter(
            ([, , p]) =>
              !p ||
              permissions.includes(p) ||
              (p === "inspect" && permissions.includes("verify")),
          )
          .map(([path, title]) => (
            <Link key={path} href={`/admin${path ? "/" + path : ""}`}>
              {title}
            </Link>
          ))}
        <Link href="/account/dashboard">My account</Link>
        <form
          className="admin-signout-form"
          action="/auth/signout"
          method="post"
        >
          <button className="button admin-signout" type="submit">
            Sign out
          </button>
        </form>
      </nav>
      <div className="dashboard-content">{children}</div>
    </div>
  );
}
