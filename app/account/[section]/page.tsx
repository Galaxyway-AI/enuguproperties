import Link from "next/link";
import { notFound } from "next/navigation";
import { db, currentUser, configured } from "@/lib/supabase";
import { ActionForm } from "@/components/action-form";
import { AuthForm } from "@/components/auth-form";
import { SecurityForm } from "@/components/security-form";
import { money } from "@/lib/domain";
const sections = [
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
  "security",
  "password",
];
export default async function AccountSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  if (!configured()) return null;
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  const c = await db();
  const user = await currentUser();
  if (!user) return null;
  if (!user) return null;
  if (section === "profile") {
    const { data: p } = await c
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return (
      <>
        <h1>Your profile</h1>
        <div className="panel">
          <ActionForm action="profile">
            <label>
              Full name
              <input
                name="full_name"
                defaultValue={p?.full_name}
                required
                minLength={2}
              />
            </label>
            <label>
              Phone number
              <input name="phone" type="tel" defaultValue={p?.phone} required />
            </label>
            <label>
              WhatsApp number
              <input
                name="whatsapp"
                type="tel"
                autoComplete="tel"
                defaultValue={p?.whatsapp}
                maxLength={30}
              />
            </label>
            <label>
              Your account type
              <select name="seller_type" defaultValue={p?.seller_type}>
                <option value="buyer">Buyer</option>
                <option value="owner">Property owner</option>
                <option value="agent">Authorised agent</option>
                <option value="developer">Developer / company</option>
              </select>
            </label>
            <p className="form-caption">
              Contact and identity information is not displayed on public
              listings.
            </p>
          </ActionForm>
        </div>
      </>
    );
  }
  if (section === "security")
    return (
      <>
        <h1>Account security</h1>
        <SecurityForm />
        <button
          className="button secondary"
          style={{ marginTop: 20 }}
          form="sign-out"
        >
          Sign out
        </button>
        <form id="sign-out" action="/auth/signout" method="post" />
      </>
    );
  if (section === "password")
    return (
      <>
        <h1>Update your password</h1>
        <AuthForm mode="update-password" />
      </>
    );
  if (section === "dashboard") {
    const [listings, enquiries, notifications] = await Promise.all([
      c
        .from("properties")
        .select("id,status", { count: "exact" })
        .eq("seller_id", user.id),
      c
        .from("enquiries")
        .select("id", { count: "exact" })
        .eq("buyer_id", user.id),
      c
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    return (
      <>
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">YOUR NEXT CHAPTER</span>
            <h1>Your property workspace</h1>
          </div>
          <Link className="button" href="/account/listings/new">
            List a property
          </Link>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <strong>{listings.count || 0}</strong>
            <span>Your listings</span>
          </div>
          <div className="stat">
            <strong>
              {listings.data?.filter((p) => p.status === "draft").length || 0}
            </strong>
            <span>Drafts to complete</span>
          </div>
          <div className="stat">
            <strong>{enquiries.count || 0}</strong>
            <span>Your enquiries</span>
          </div>
        </div>
        <h2 style={{ fontSize: 25 }}>Latest updates</h2>
        {notifications.data?.length ? (
          <div className="record-list">
            {notifications.data.map((n) => (
              <article className="record" key={n.id}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <small>
                  {new Date(n.created_at).toLocaleString("en-GB", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Your journey starts here.</h3>
            <p>
              Save a property, send an enquiry or create your first listing.
              Updates will appear in this workspace.
            </p>
            <Link href="/properties" className="text-link">
              Browse properties
            </Link>
          </div>
        )}
      </>
    );
  }
  if (section === "listings") {
    const { data: rows, error } = await c
      .from("properties")
      .select("id,title,reference,status,price_minor")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (
      <>
        <div className="dashboard-heading">
          <h1>Your listings</h1>
          <Link className="button" href="/account/listings/new">
            Add a property
          </Link>
        </div>
        {rows?.length ? (
          <div className="record-list">
            {rows.map((p) => (
              <Link
                className="record"
                key={p.id}
                href={`/account/listings/${p.id}`}
              >
                <h3>{p.title}</h3>
                <div className="record-meta">
                  <span>{p.reference}</span>
                  <span>{money(p.price_minor)}</span>
                  <span className="status">
                    {p.status.replaceAll("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title="You haven’t listed a property yet."
            href="/account/listings/new"
            label="List your first property"
          />
        )}
      </>
    );
  }
  if (section === "saved") {
    const { data: saves } = await c
      .from("saved_properties")
      .select("property_id")
      .eq("user_id", user.id)
      .limit(50);
    const { data: rows } = saves?.length
      ? await c
          .from("public_properties")
          .select("id,title,slug,price_minor,status")
          .in(
            "id",
            saves.map((s) => s.property_id),
          )
      : { data: [] };
    return (
      <>
        <h1>Saved properties</h1>
        {rows?.length ? (
          <div className="record-list">
            {rows.map((p) => (
              <article className="record" key={p.id}>
                <Link href={`/property/${p.slug}`}>
                  <h3>{p.title}</h3>
                </Link>
                <p>
                  {money(p.price_minor)} · {p.status}
                </p>
                <ActionForm
                  action="buyer"
                  extra={{ property: p.id, kind: "save" }}
                  label="Remove saved property"
                />
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Save properties you like and compare them here."
            href="/properties"
            label="Explore properties"
          />
        )}
      </>
    );
  }
  const table: Record<string, string> = {
    enquiries: "enquiries",
    inspections: "inspections",
    offers: "offers",
    transactions: "transaction_cases",
    documents: "property_documents",
    billing: "orders",
  };
  const { data: rows, error } = await c
    .from(table[section])
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (
    <>
      <h1>{section[0].toUpperCase() + section.slice(1)}</h1>
      <p>
        Your most recent records. Private information is visible only to
        authorised participants.
      </p>
      {rows?.length ? (
        <div className="record-list">
          {rows.map((row) => (
            <article className="record" key={row.id}>
              <h3>
                {row.reference ||
                  row.original_name ||
                  `${section.slice(0, -1)} · ${row.id.slice(0, 8)}`}
              </h3>
              <div className="record-meta">
                <span className="status">
                  {(row.status || row.stage || "stored").replaceAll("_", " ")}
                </span>
                <span>
                  {new Date(row.created_at).toLocaleDateString("en-GB")}
                </span>
                {row.amount_minor && <strong>{money(row.amount_minor)}</strong>}
              </div>
              {row.message && <p>{row.message}</p>}
              {row.conditions && <p>{row.conditions}</p>}
              {row.preferred_at && (
                <p>
                  Requested:{" "}
                  {new Date(row.preferred_at).toLocaleString("en-GB", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </p>
              )}
              {section === "documents" && (
                <ActionForm
                  action="document-link"
                  extra={{ id: row.id }}
                  label="Download authorised copy"
                />
              )}
              {section === "offers" && row.buyer_id !== user.id && (
                <ActionForm
                  action="offer-response"
                  extra={{ id: row.id }}
                  label="Respond to offer"
                >
                  <label>
                    Response
                    <select name="status">
                      <option value="accepted">Accept</option>
                      <option value="rejected">Reject</option>
                      <option value="countered">Counter</option>
                    </select>
                  </label>
                  <label>
                    Counter amount (₦), if applicable
                    <input name="amount" inputMode="decimal" />
                  </label>
                  <label>
                    Message
                    <input name="message" required minLength={5} />
                  </label>
                </ActionForm>
              )}
              {section === "transactions" && <Timeline id={row.id} />}
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={`No ${section} to show yet.`}
          href="/properties"
          label="Explore properties"
        />
      )}
    </>
  );
}
function Empty({
  title,
  href,
  label,
}: {
  title: string;
  href: string;
  label: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <Link className="button secondary" href={href}>
        {label}
      </Link>
    </div>
  );
}
async function Timeline({ id }: { id: string }) {
  const { data } = await (
    await db()
  )
    .from("transaction_events")
    .select("id,stage,summary,created_at")
    .eq("transaction_id", id)
    .order("created_at");
  return (
    <ol>
      {data?.map((e) => (
        <li key={e.id}>
          <strong>{e.stage.replaceAll("_", " ")}</strong> · {e.summary}
          <p className="form-caption">
            {new Date(e.created_at).toLocaleDateString("en-GB")}
          </p>
        </li>
      ))}
    </ol>
  );
}
