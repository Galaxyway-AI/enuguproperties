import { configured, db } from "@/lib/supabase";
import { money } from "@/lib/domain";
import { ActionForm } from "@/components/action-form";
export default async function Commissions() {
  if (!configured()) return null;
  const c = await db();
  const { data: p } = await c.rpc("my_permissions");
  if (!p?.includes("finance"))
    return <div className="notice">Finance permission required.</div>;
  const { data: rows } = await c.from("commissions").select("*").limit(50);
  return (
    <>
      <h1>Commission accounting</h1>
      <p>
        Record invoicing and externally confirmed settlement. This action does
        not charge a card.
      </p>
      <div className="record-list">
        {rows?.length ? (
          rows.map((r) => (
            <section key={r.id} className="panel">
              <h2 style={{ fontSize: 25 }}>{money(r.amount_minor)}</h2>
              <p>
                Sale: {money(r.sale_price_minor)} · {r.status}
              </p>
              <ActionForm
                action="commission"
                extra={{ id: r.id }}
                label="Record accounting update"
              >
                <label>
                  Status
                  <select name="status" defaultValue={r.status}>
                    {[
                      "due",
                      "invoiced",
                      "partially_paid",
                      "paid",
                      "waived",
                      "disputed",
                      "written_off",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Invoice / reconciliation reference
                  <input name="reference" required minLength={3} />
                </label>
              </ActionForm>
            </section>
          ))
        ) : (
          <div className="empty-state">No commission records yet.</div>
        )}
      </div>
    </>
  );
}
