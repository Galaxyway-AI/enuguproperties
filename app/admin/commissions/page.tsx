import { configured, db } from "@/lib/supabase";
import { money } from "@/lib/domain";
import { ActionForm } from "@/components/action-form";
export default async function Commissions() {
  if (!configured()) return null;
  const c = await db();
  const { data: p } = await c.rpc("my_permissions");
  if (!p?.includes("finance"))
    return <div className="notice">Finance permission required.</div>;
  const canAgree = p.includes("transactions");
  const [{ data: rows }, { data: properties }, { data: agreements }, { data: mandates }, { data: confirmed }, { data: awaiting }, { data: qualifications }] = await Promise.all([
    c.from("commissions").select("*").order("id", { ascending: false }).limit(50),
    canAgree ? c.from("properties").select("id,reference,title,status,listing_purpose").eq("listing_purpose", "sale").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
    c.from("commission_agreements").select("id,property_id,basis_points,status,accepted_at").order("proposed_at", { ascending: false }).limit(100),
    canAgree ? c.from("marketing_mandates").select("id,property_id,kind,basis_points,acceptance_id").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    canAgree ? c.from("legacy_commission_confirmations").select("mandate_id") : Promise.resolve({ data: [] }),
    canAgree ? c.from("transaction_cases").select("id,reference,property_id,created_at").eq("stage", "awaiting_completion").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    canAgree ? c.from("commission_qualifications").select("transaction_id") : Promise.resolve({ data: [] }),
  ]);
  const propertyNames = new Map((properties || []).map((property) => [property.id, `${property.reference} · ${property.title}`]));
  const acceptedProperties = new Set((agreements || []).filter((agreement) => agreement.status === "accepted").map((agreement) => agreement.property_id));
  const confirmedMandates = new Set((confirmed || []).map((item) => item.mandate_id));
  const confirmedQualifications = new Set((qualifications || []).map((item) => item.transaction_id));
  return (
    <>
      <h1>Sales commission</h1>
      <p>
        The seller must separately accept an exact negotiated rate and written
        service terms. An advert alone does not create a commission obligation.
      </p>
      {canAgree && <section className="panel">
        <h2>Propose a sales agreement</h2>
        <p>Agree the service scope with the seller first. A proposal is not binding until that seller reviews and accepts it in their account. An accepted agreement cannot be edited here.</p>
        <ActionForm action="propose-commission" label="Send rate and terms for seller acceptance">
          <label>Property for sale
            <select name="property_id" required defaultValue="">
              <option value="" disabled>Choose a property</option>
              {(properties || []).filter((property) => !acceptedProperties.has(property.id) && !["sold", "withdrawn", "expired", "rejected"].includes(property.status)).map((property) =>
                <option key={property.id} value={property.id}>{property.reference} · {property.title}</option>)}
            </select>
          </label>
          <label>Negotiated sales commission (%)
            <input name="rate" type="number" min="2" max="10" step="0.01" required placeholder="For example, 4.00" />
          </label>
          <label>Services Enugu Properties will provide
            <textarea name="service_scope" minLength={20} maxLength={2000} required placeholder="Describe the agreed marketing, buyer introduction or sale coordination services." />
          </label>
          <label>Which completed sale qualifies for commission?
            <textarea name="qualifying_conditions" minLength={20} maxLength={2000} required placeholder="State the qualifying buyer introduction, completion conditions and any limits." />
          </label>
          <label>Who pays and when payment is due
            <textarea name="payment_terms" minLength={8} maxLength={500} required placeholder="For example: Seller pays after a qualifying completed sale, under the separately agreed terms." />
          </label>
        </ActionForm>
      </section>}
      {agreements?.length ? <section className="panel">
        <h2>Recorded proposals and agreements</h2>
        <div className="record-list">{agreements.map((agreement) => <div key={agreement.id}>
          <strong>{propertyNames.get(agreement.property_id) || agreement.property_id}</strong> · {(agreement.basis_points / 100).toFixed(2)}% · {agreement.status}
          {agreement.accepted_at && <span> · accepted {new Date(agreement.accepted_at).toLocaleDateString("en-GB")}</span>}
        </div>)}</div>
      </section> : null}
      {canAgree && (mandates || []).filter((mandate) => mandate.acceptance_id && !confirmedMandates.has(mandate.id) && !acceptedProperties.has(mandate.property_id)).length > 0 && <section className="panel">
        <h2>Historical mandates requiring signed-agreement evidence</h2>
        <p>Older adverts could create a 2% mandate automatically. Confirm one only if you have a separately signed agreement for its original rate. Its recorded rate will not change.</p>
        <div className="record-list">{(mandates || []).filter((mandate) => mandate.acceptance_id && !confirmedMandates.has(mandate.id) && !acceptedProperties.has(mandate.property_id)).map((mandate) => <div key={mandate.id}>
          <strong>{propertyNames.get(mandate.property_id) || mandate.property_id}</strong> · {mandate.kind === "percentage" ? `${((mandate.basis_points || 0) / 100).toFixed(2)}%` : mandate.kind}
          <ActionForm action="confirm-legacy-commission" extra={{ id: mandate.id }} label="Confirm existing signed mandate">
            <label>Signed agreement or document reference
              <input name="reference" minLength={8} maxLength={200} required />
            </label>
          </ActionForm>
        </div>)}</div>
      </section>}
      {canAgree && (awaiting || []).some((transaction) => acceptedProperties.has(transaction.property_id)) && <section className="panel">
        <h2>Confirm a qualifying sale</h2>
        <p>Before recording commission, confirm that the buyer and completed sale meet the seller&apos;s accepted terms. Only agreements accepted before this transaction began can apply. This records evidence; it does not charge a card.</p>
        <div className="record-list">{(awaiting || []).filter((transaction) => acceptedProperties.has(transaction.property_id)).map((transaction) => <div key={transaction.id}>
          <strong>{transaction.reference}</strong> · {propertyNames.get(transaction.property_id) || transaction.property_id}
          {confirmedQualifications.has(transaction.id) ? <p className="notice success">Qualifying sale confirmed. Complete the transaction with its final sale price.</p> : <ActionForm action="confirm-qualifying-sale" extra={{ id: transaction.id }} label="Confirm this qualifying sale">
            <label>Evidence that this sale meets the accepted conditions
              <textarea name="evidence" minLength={12} maxLength={1000} required placeholder="Record the buyer introduction, agreed services and completion evidence." />
            </label>
          </ActionForm>}
        </div>)}</div>
      </section>}
      <h2>Commission accounting</h2>
      <p>Record invoicing and externally confirmed settlement. This action does not charge a card.</p>
      <div className="record-list">
        {rows?.length ? (
          rows.map((r) => (
            <section key={r.id} className="panel">
              <h2 style={{ fontSize: 25 }}>{money(r.amount_minor)}</h2>
              <p>
                Sale: {money(r.sale_price_minor)} · {r.status}
              </p>
              {r.basis_snapshot?.basis_points != null && <p>Agreed rate: {(r.basis_snapshot.basis_points / 100).toFixed(2)}%</p>}
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
