/* eslint-disable @next/next/no-img-element -- Private authenticated images and local QR must not use a shared optimiser. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, configured } from "@/lib/supabase";
import { ActionForm } from "@/components/action-form";
import { money } from "@/lib/domain";
import { UploadForm } from "@/components/upload-form";
export default async function Admin({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!configured()) return null;
  const { section = [] } = await params;
  const tab = section[0] || "overview";
  const c = await db();
  const { data: permissions } = await c.rpc("my_permissions");
  const can = (p: string) => permissions?.includes(p);
  if (tab === "property" && section[1])
    return <PropertyReview id={section[1]} can={can} />;
  if (section.length > 1) notFound();
  if (tab === "overview") {
    const queueNames = [
      ["properties", "Listings for moderation", "moderate", "moderation"],
      ["enquiries", "Enquiries", "support", "enquiries"],
      ["inspections", "Inspections", "verify", "inspections"],
      ["transaction_cases", "Transactions", "transactions", "transactions"],
      ["orders", "Advertising orders", "finance", "payments"],
      ["property_reports", "Property reports", "moderate", "reports"],
    ];
    return (
      <>
        <span className="eyebrow">STAFF WORKSPACE</span>
        <h1>The next action matters.</h1>
        <p>
          Work queues reflect your permissions. All important decisions are
          recorded.
        </p>
        <div className="stat-grid">
          {await Promise.all(
            queueNames
              .filter(([, , p]) => can(p))
              .map(async ([table, title, , path]) => {
                const { count } = await c
                  .from(table)
                  .select("id", { count: "exact", head: true });
                return (
                  <Link className="stat" href={`/admin/${path}`} key={table}>
                    <strong>{count || 0}</strong>
                    <span>{title}</span>
                  </Link>
                );
              }),
          )}
        </div>
      </>
    );
  }
  if (tab === "settings") {
    if (!can("settings")) return <Denied />;
    const [{ data: plans }, { data: locations }] = await Promise.all([
      c.from("listing_plans").select("*").order("price_minor"),
      c.from("locations").select("id,name,kind").order("name"),
    ]);
    return (
      <>
        <h1>Platform configuration</h1>
        <div className="record-list">
          {plans?.map((p) => (
            <section className="panel" key={p.id}>
              <h2 style={{ fontSize: 24 }}>{p.name} advertising</h2>
              <ActionForm action="config" extra={{ kind: "plan", id: p.id }}>
                <div className="form-grid">
                  <label>
                    Price (₦)
                    <input
                      name="price"
                      defaultValue={p.price_minor / 100}
                      required
                    />
                  </label>
                  <label>
                    Duration (days)
                    <input
                      name="duration_days"
                      type="number"
                      min="1"
                      max="365"
                      defaultValue={p.duration_days}
                      required
                    />
                  </label>
                  <label>
                    Photo allowance
                    <input
                      name="photo_limit"
                      type="number"
                      min="1"
                      max="100"
                      defaultValue={p.photo_limit}
                      required
                    />
                  </label>
                  <label>
                    Video allowance
                    <input
                      name="video_limit"
                      type="number"
                      min="0"
                      max="10"
                      defaultValue={p.video_limit}
                      required
                    />
                  </label>
                  <label>
                    Featured days
                    <input
                      name="featured_days"
                      type="number"
                      min="0"
                      defaultValue={p.featured_days}
                      required
                    />
                  </label>
                  <label>
                    Available
                    <select name="active" defaultValue={String(p.active)}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </div>
              </ActionForm>
            </section>
          ))}
          <section className="panel">
            <h2 style={{ fontSize: 24 }}>
              Default commission for new mandates
            </h2>
            <ActionForm action="config" extra={{ kind: "commission" }}>
              <label>
                Basis points (200 = 2%)
                <input
                  name="basis_points"
                  type="number"
                  min="0"
                  max="10000"
                  required
                />
              </label>
              <p className="form-caption">
                Existing accepted mandates retain their agreed rate.
              </p>
            </ActionForm>
          </section>
          <section className="panel">
            <h2 style={{ fontSize: 24 }}>Add a location</h2>
            <ActionForm action="config" extra={{ kind: "location" }}>
              <div className="form-grid">
                <label>
                  Name
                  <input name="name" required />
                </label>
                <label>
                  URL slug
                  <input name="slug" pattern="[a-z0-9-]+" required />
                </label>
                <label>
                  Level
                  <select name="kind">
                    {["state", "lga", "city", "area", "estate"].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Parent
                  <select name="parent_id">
                    <option value="">No parent</option>
                    {locations?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.kind}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Description
                <textarea name="description" />
              </label>
            </ActionForm>
          </section>
        </div>
      </>
    );
  }
  const config: Record<string, { table: string; permission: string }> = {
    moderation: { table: "properties", permission: "moderate" },
    verifications: { table: "properties", permission: "verify" },
    inspections: {
      table: "inspections",
      permission: can("verify") ? "verify" : "inspect",
    },
    enquiries: { table: "enquiries", permission: "support" },
    transactions: { table: "transaction_cases", permission: "transactions" },
    payments: { table: "orders", permission: "finance" },
    reports: { table: "property_reports", permission: "moderate" },
    accounts: { table: "profiles", permission: "compliance" },
    audit: { table: "audit_logs", permission: "audit" },
  };
  const cfg = config[tab];
  if (!cfg) notFound();
  if (!can(cfg.permission)) return <Denied />;
  const filters = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(filters.page) || 1));
  const term = (filters.q || "").replace(/[^a-zA-Z0-9 @+-]/g, "").slice(0, 100);
  let query = c
    .from(cfg.table)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (term) {
    const columns: Record<string, string[]> = {
      properties: ["title", "reference"],
      profiles: ["full_name", "phone"],
      enquiries: ["reference", "message"],
      transaction_cases: ["reference"],
      orders: ["reference"],
      property_reports: ["reason", "message"],
      audit_logs: ["action"],
      inspections: ["notes"],
    };
    query = query.or(
      (columns[cfg.table] || ["id"])
        .map((column) => `${column}.ilike.%${term}%`)
        .join(","),
    );
  }
  if (tab === "moderation")
    query = query.in("status", ["submitted", "under_review", "needs_changes"]);
  const { data: rows, error, count } = await query;
  if (error) throw error;
  return (
    <>
      <h1>{tab[0].toUpperCase() + tab.slice(1)}</h1>
      <p>{count || 0} records, restricted to your role.</p>
      <form className="form-actions" style={{ marginBottom: 24 }}>
        <label style={{ flex: 1 }}>
          Search this queue
          <input
            name="q"
            defaultValue={term}
            placeholder="Reference, name or relevant text"
          />
        </label>
        <button className="button">Search</button>
      </form>
      {tab === "transactions" && (
        <details className="panel" style={{ marginBottom: 20 }}>
          <summary>Create a transaction from an introduction</summary>
          <ActionForm action="transaction" label="Create transaction">
            <label>
              Property ID
              <input name="property_id" required />
            </label>
            <label>
              Buyer ID from enquiry or offer
              <input name="buyer_id" required />
            </label>
            <label>
              Initial summary
              <textarea name="summary" minLength={10} required />
            </label>
          </ActionForm>
        </details>
      )}
      {rows?.length ? (
        <div className="record-list">
          {rows.map((row) => (
            <article className="record" key={row.id}>
              <h3>
                {row.title ||
                  row.reference ||
                  row.full_name ||
                  row.action ||
                  row.reason ||
                  `${tab} · ${String(row.id).slice(0, 8)}`}
              </h3>
              <div className="record-meta">
                {row.status && (
                  <span className="status">
                    {row.status.replaceAll("_", " ")}
                  </span>
                )}
                {row.stage && (
                  <span className="status">
                    {row.stage.replaceAll("_", " ")}
                  </span>
                )}
                <span>
                  {new Date(row.created_at).toLocaleString("en-GB", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </span>
              </div>
              {row.message && <p>{row.message}</p>}
              {row.amount_minor && <p>{money(row.amount_minor)}</p>}
              {row.property_id && (
                <p className="form-caption">Property: {row.property_id}</p>
              )}
              {row.buyer_id && (
                <p className="form-caption">Buyer: {row.buyer_id}</p>
              )}
              {["moderation", "verifications"].includes(tab) && (
                <Link
                  className="button secondary"
                  href={`/admin/property/${row.id}`}
                >
                  Review property
                </Link>
              )}
              {tab === "inspections" && can("inspect") && (
                <UploadForm
                  property={row.property_id}
                  kind="document"
                  staff
                  types={[{ id: "inspection", name: "Inspection evidence" }]}
                />
              )}{" "}
              {tab === "inspections" && (
                <ActionForm
                  action="inspection"
                  extra={{ id: row.id }}
                  label="Update inspection"
                >
                  <label>
                    Status
                    <select name="status">
                      {can("verify") ? (
                        <>
                          <option value="confirmed">Confirm / assign</option>
                          <option value="cancelled">Cancel</option>
                        </>
                      ) : (
                        <option value="completed">
                          Complete assigned inspection
                        </option>
                      )}
                    </select>
                  </label>
                  {can("verify") ? (
                    <>
                      <label>
                        Inspector user ID
                        <input
                          name="inspector_id"
                          defaultValue={row.inspector_id || ""}
                        />
                      </label>
                      <label>
                        Confirmed time (your local time)
                        <input name="preferred_at" type="datetime-local" />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        Evidence document ID
                        <input name="document_id" required />
                      </label>
                      <label>
                        Observations
                        <textarea name="notes" minLength={30} required />
                      </label>
                    </>
                  )}
                </ActionForm>
              )}
              {tab === "transactions" && (
                <ActionForm
                  action="transaction"
                  extra={{ id: row.id }}
                  label="Record milestone"
                >
                  <label>
                    Next stage
                    <select name="stage">
                      {[
                        "offer_submitted",
                        "offer_accepted",
                        "verification_pending",
                        "due_diligence",
                        "professional_review",
                        "contract_stage",
                        "awaiting_completion",
                        "completed",
                        "withdrawn",
                        "failed",
                        "disputed",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Public participant summary
                    <textarea name="summary" minLength={10} required />
                  </label>
                  <label>
                    Sale price on completion (₦)
                    <input name="sale_price" inputMode="decimal" />
                  </label>
                </ActionForm>
              )}
              {["enquiries", "reports"].includes(tab) && (
                <ActionForm
                  action="queue"
                  extra={{
                    id: row.id,
                    kind: tab === "enquiries" ? "enquiry" : "report",
                  }}
                  label="Update queue record"
                >
                  <label>
                    Status
                    <select name="status">
                      {(tab === "enquiries"
                        ? [
                            "new",
                            "contacted",
                            "qualified",
                            "inspection_requested",
                            "inspection_booked",
                            "closed",
                            "spam",
                          ]
                        : [
                            "open",
                            "investigating",
                            "dismissed",
                            "resolved",
                            "escalated",
                          ]
                      ).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned staff ID, if applicable
                    <input name="assigned_to" />
                  </label>
                  <label>
                    Internal note
                    <textarea name="note" minLength={5} required />
                  </label>
                </ActionForm>
              )}
              {tab === "accounts" && (
                <ActionForm
                  action="account-status"
                  extra={{ id: row.id }}
                  label="Update account status"
                >
                  <label>
                    Status
                    <select name="status">
                      {[
                        "active",
                        "restricted",
                        "suspended",
                        "banned",
                        "closed",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Internal reason
                    <textarea name="reason" minLength={10} required />
                  </label>
                </ActionForm>
              )}
              {tab === "audit" && (
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                  {JSON.stringify(
                    {
                      entity: row.entity,
                      entity_id: row.entity_id,
                      actor_id: row.actor_id,
                      metadata: row.metadata,
                    },
                    null,
                    2,
                  )}
                </pre>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No records currently in this queue.</h3>
          <p>New items will appear here when they need your attention.</p>
        </div>
      )}
      <div className="pagination">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`?q=${encodeURIComponent(term)}&page=${page - 1}`}
          >
            Previous
          </Link>
        )}
        <span>Page {page}</span>
        {page * 50 < (count || 0) && (
          <Link
            className="button secondary"
            href={`?q=${encodeURIComponent(term)}&page=${page + 1}`}
          >
            Next
          </Link>
        )}
      </div>
    </>
  );
}
function Denied() {
  return (
    <div className="notice">
      Your role does not have access to this workspace.
    </div>
  );
}
async function PropertyReview({
  id,
  can,
}: {
  id: string;
  can: (p: string) => boolean;
}) {
  if (!can("moderate") && !can("verify")) return <Denied />;
  const c = await db();
  const { data: p } = await c
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const [
    { data: media },
    { data: seller },
    { data: privateDetails },
    { data: documents },
    { data: checks },
    { data: providers },
    { data: audits },
    { data: risks },
  ] = await Promise.all([
    c.from("property_media").select("id,kind,alt").eq("property_id", id),
    c
      .from("profiles")
      .select("id,full_name,seller_type,status,created_at")
      .eq("id", p.seller_id)
      .maybeSingle(),
    c.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    c
      .from("property_documents")
      .select("id,original_name,type_id")
      .eq("property_id", id),
    c.from("property_verifications").select("*").eq("property_id", id),
    c
      .from("professional_providers")
      .select("id,name,profession")
      .eq("credentials_confirmed", true),
    c
      .from("audit_logs")
      .select("id,action,created_at")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    c.from("risk_flags").select("id,reason,status").eq("property_id", id),
  ]);
  return (
    <>
      <span className="eyebrow">
        {p.reference} · REVISION {p.revision}
      </span>
      <h1>{p.title}</h1>
      <p>
        <span className="status">{p.status.replaceAll("_", " ")}</span> ·{" "}
        {money(p.price_minor)}
      </p>
      <div className="record-list">
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>Property and seller</h2>
          <div className="form-grid">
            {media?.map((m) =>
              m.kind === "image" ? (
                <img
                  key={m.id}
                  src={`/api/private-media/${m.id}`}
                  alt={m.alt || "Submitted property photograph"}
                  style={{ width: "100%", borderRadius: 8 }}
                />
              ) : (
                <video
                  key={m.id}
                  src={`/api/private-media/${m.id}`}
                  controls
                  preload="none"
                  style={{ width: "100%" }}
                />
              ),
            )}
          </div>
          <p>{p.description}</p>
          <div className="record-meta">
            <span>{p.category}</span>
            <span>{p.land_sqm} m²</span>
            <span>{p.bedrooms || 0} bedrooms</span>
          </div>
          <p>
            Seller: {seller?.full_name || "Restricted profile"} ·{" "}
            {seller?.seller_type} · {seller?.status}
          </p>
          <p>Private address: {privateDetails?.address || "Not provided"}</p>
          <p>Ownership: {privateDetails?.ownership || "Not provided"}</p>
          <p>Title category: {p.title_type || "Not provided"}</p>
          {risks?.map((r) => (
            <div className="notice" key={r.id}>
              {r.reason}
            </div>
          ))}
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>Authorised documents</h2>
          {can("verify") && (
            <UploadForm
              property={id}
              kind="document"
              staff
              types={[
                { id: "inspection", name: "Inspection evidence" },
                { id: "search", name: "Official search report" },
                { id: "professional", name: "Professional report" },
                { id: "authority", name: "Authority evidence" },
              ]}
            />
          )}
          <p className="form-caption">
            Document access is logged. KYC remains restricted to compliance
            permissions.
          </p>
          {documents?.length ? (
            documents.map((d) => (
              <div className="record" key={d.id}>
                <h3>{d.original_name}</h3>
                <p className="form-caption">
                  {d.type_id} · {d.id}
                </p>
                <ActionForm
                  action="document-link"
                  extra={{ id: d.id }}
                  label="Download authorised copy"
                />
              </div>
            ))
          ) : (
            <p>No documents are visible to your role.</p>
          )}
        </section>
        {can("moderate") && (
          <section className="panel">
            <h2 style={{ fontSize: 24 }}>Moderation decision</h2>
            <ActionForm
              action="moderate"
              extra={{ id }}
              label="Record moderation decision"
            >
              <label>
                Decision
                <select name="decision">
                  <option value="under_review">Start review</option>
                  <option value="live">Approve and publish</option>
                  <option value="needs_changes">Request changes</option>
                  <option value="rejected">Reject</option>
                  <option value="paused">Pause public listing</option>
                </select>
              </label>
              <label>
                Reason / seller instructions
                <textarea name="reason" minLength={5} required />
              </label>
            </ActionForm>
          </section>
        )}
        {can("verify") && (
          <section className="panel">
            <h2 style={{ fontSize: 24 }}>Evidence-based verification</h2>
            {checks?.map((v) => (
              <p key={v.id}>
                {v.type_id} · {v.status} · revision {v.property_revision}
              </p>
            ))}
            <ActionForm
              action="verification"
              extra={{ id }}
              label="Record verification"
            >
              <div className="form-grid">
                <label>
                  Check
                  <select name="type_id">
                    {[
                      "identity",
                      "authority",
                      "site",
                      "documents",
                      "official_search",
                      "survey",
                      "legal",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select name="status">
                    {[
                      "requested",
                      "in_progress",
                      "more_information_required",
                      "completed",
                      "failed",
                      "expired",
                      "cancelled",
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Supporting evidence
                  <select name="document_id">
                    <option value="">Select evidence</option>
                    {documents?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.original_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Professional provider
                  <select name="provider_id">
                    <option value="">Not applicable</option>
                    {providers?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.profession}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Recheck / expiry date
                  <input type="date" name="expires_at" />
                </label>
              </div>
              <label>
                Public summary
                <textarea name="public_summary" required maxLength={3000} />
              </label>
              <label>
                Internal evidence and outcome notes
                <textarea name="internal_notes" required />
              </label>
            </ActionForm>
          </section>
        )}
        {can("moderate") && (
          <details className="panel">
            <summary>Schedule editorial advertising placement</summary>
            <ActionForm
              action="feature"
              extra={{ id }}
              label="Schedule placement"
            >
              <label>
                Start
                <input type="datetime-local" name="starts_at" required />
              </label>
              <label>
                End
                <input type="datetime-local" name="ends_at" required />
              </label>
              <p className="form-caption">This does not change verification.</p>
            </ActionForm>
          </details>
        )}
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>Audit history</h2>
          {audits?.map((a) => (
            <p key={a.id}>
              {a.action} ·{" "}
              {new Date(a.created_at).toLocaleString("en-GB", {
                timeZone: "Africa/Lagos",
              })}{" "}
              WAT
            </p>
          ))}
        </section>
      </div>
    </>
  );
}
