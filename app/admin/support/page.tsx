import { configured, db } from "@/lib/supabase";
import { ActionForm } from "@/components/action-form";
export default async function Support() {
  if (!configured()) return null;
  const c = await db();
  const { data: p } = await c.rpc("my_permissions");
  if (!p?.includes("support"))
    return <div className="notice">Support permission required.</div>;
  const { data: rows } = await c
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  return (
    <>
      <h1>Support requests</h1>
      <div className="record-list">
        {rows?.length ? (
          rows.map((r) => (
            <section key={r.id} className="panel">
              <h2 style={{ fontSize: 24 }}>
                {r.reference} · {r.category}
              </h2>
              <p>{r.email}</p>
              <p>{r.message}</p>
              <ActionForm
                action="queue"
                extra={{ id: r.id, kind: "support" }}
                label="Update support case"
              >
                <label>
                  Status
                  <select name="status" defaultValue={r.status}>
                    {["open", "assigned", "resolved", "closed"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Assigned staff ID
                  <input
                    name="assigned_to"
                    defaultValue={r.assigned_to || ""}
                  />
                </label>
                <label>
                  Resolution / internal note
                  <textarea name="note" minLength={5} required />
                </label>
              </ActionForm>
            </section>
          ))
        ) : (
          <div className="empty-state">No open support requests.</div>
        )}
      </div>
    </>
  );
}
