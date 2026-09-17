import { ActionForm } from "@/components/action-form";
import { money } from "@/lib/domain";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Promotion = {
  id: string;
  code: string;
  name: string;
  discount_kind: "percent" | "fixed" | "free";
  discount_value: number;
  plan_id: string | null;
  starts_at: string;
  ends_at: string | null;
  max_redemptions: number | null;
  per_user_limit: number;
  first_listing_only: boolean;
  automatic: boolean;
  restricted_user_id: string | null;
  active: boolean;
};

const dateInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export default async function Promotions() {
  const c = await db();
  const { data: permissions } = await c.rpc("my_permissions");
  if (!permissions?.includes("settings"))
    return <div className="notice error">Settings permission is required.</div>;

  const [{ data: promotions }, { data: redemptions }, { data: plans }] =
    await Promise.all([
      c.from("discount_promotions").select("*").order("created_at", {
        ascending: false,
      }),
      c
        .from("promotion_redemptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      c
        .from("listing_plans")
        .select("id,name,price_minor")
        .gt("price_minor", 0)
        .order("price_minor"),
    ]);

  const userIds = [...new Set((redemptions || []).map((r) => r.user_id))];
  const propertyIds = [
    ...new Set((redemptions || []).map((r) => r.property_id)),
  ];
  const [{ data: users }, { data: properties }] = await Promise.all([
    userIds.length
      ? c.from("profiles").select("id,full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? c.from("properties").select("id,reference,title").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
  ]);
  const userNames = new Map(users?.map((u) => [u.id, u.full_name]) || []);
  const propertyNames = new Map(
    properties?.map((p) => [p.id, `${p.reference} · ${p.title}`]) || [],
  );
  const redeemed = (redemptions || []).filter((r) => r.status === "redeemed");
  const totalDiscount = redeemed.reduce(
    (sum, row) => sum + Number(row.discount_minor),
    0,
  );
  const freeCount = redeemed.filter(
    (row) => Number(row.final_amount_minor) === 0,
  ).length;

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">ADVERTISING OFFERS</span>
          <h1>Promotions</h1>
          <p>Create automatic offers or codes and monitor every redemption.</p>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <strong>{promotions?.filter((p) => p.active).length || 0}</strong>
          <span>Active promotions</span>
        </div>
        <div className="stat">
          <strong>{redeemed.length}</strong>
          <span>Completed redemptions</span>
        </div>
        <div className="stat">
          <strong>{freeCount}</strong>
          <span>Free adverts issued</span>
        </div>
        <div className="stat">
          <strong>{money(totalDiscount)}</strong>
          <span>Total discounts</span>
        </div>
      </div>

      <section className="panel">
        <h2 style={{ fontSize: 25 }}>Create a promotion</h2>
        <PromotionForm plans={plans || []} />
      </section>

      <h2 style={{ fontSize: 25 }}>Current promotions</h2>
      <div className="record-list">
        {(promotions as Promotion[] | null)?.map((promotion) => (
          <section className="panel" key={promotion.id}>
            <div className="record-meta" style={{ marginBottom: 16 }}>
              <span className="status">{promotion.code}</span>
              <strong>{promotion.name}</strong>
              <span>{promotion.active ? "Active" : "Disabled"}</span>
              {promotion.automatic && <span>Automatic</span>}
              {promotion.first_listing_only && <span>First advert only</span>}
            </div>
            <PromotionForm promotion={promotion} plans={plans || []} />
          </section>
        ))}
      </div>

      <h2 style={{ fontSize: 25 }}>Redemption report</h2>
      <p>The latest 100 reserved, completed, cancelled and refunded offers.</p>
      {redemptions?.length ? (
        <div className="record-list">
          {redemptions.map((row) => (
            <article className="record" key={row.id}>
              <div className="record-meta">
                <span className="status">{row.status}</span>
                <strong>{row.code}</strong>
                <span>{new Date(row.created_at).toLocaleString("en-GB")}</span>
              </div>
              <h3>{propertyNames.get(row.property_id) || row.property_id}</h3>
              <p>User: {userNames.get(row.user_id) || row.user_id}</p>
              <p>
                Original {money(row.original_amount_minor)} · Discount{" "}
                {money(row.discount_minor)} · Paid{" "}
                {money(row.final_amount_minor)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No promotions have been redeemed yet.</div>
      )}
    </>
  );
}

function PromotionForm({
  promotion,
  plans,
}: {
  promotion?: Promotion;
  plans: { id: string; name: string; price_minor: number }[];
}) {
  const value = promotion
    ? promotion.discount_kind === "percent"
      ? promotion.discount_value / 100
      : promotion.discount_kind === "fixed"
        ? promotion.discount_value / 100
        : 0
    : 100;
  return (
    <ActionForm
      action="promotion-admin"
      extra={{
        id: promotion?.id,
        restrictedUserId: promotion?.restricted_user_id,
      }}
      label={promotion ? "Save promotion" : "Create promotion"}
    >
      <div className="form-grid">
        <label>
          Promotion code
          <input
            name="code"
            defaultValue={promotion?.code}
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,29}"
            placeholder="WELCOME50"
            required
          />
        </label>
        <label>
          Promotion name
          <input
            name="name"
            defaultValue={promotion?.name}
            maxLength={120}
            placeholder="Welcome discount"
            required
          />
        </label>
        <label>
          Discount type
          <select
            name="discount_kind"
            defaultValue={promotion?.discount_kind || "percent"}
          >
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed naira amount</option>
            <option value="free">Completely free</option>
          </select>
        </label>
        <label>
          Discount value
          <input
            name="discount_value"
            type="number"
            min="0"
            step="1"
            defaultValue={value}
            required
          />
          <small>
            Enter 50 for 50%, or 5000 for ₦5,000. Free ignores this value.
          </small>
        </label>
        <label>
          Eligible plan
          <select name="plan_id" defaultValue={promotion?.plan_id || ""}>
            <option value="">All paid plans</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} · {money(plan.price_minor)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Maximum total uses
          <input
            name="max_redemptions"
            type="number"
            min="1"
            defaultValue={promotion?.max_redemptions || ""}
            placeholder="Unlimited"
          />
        </label>
        <label>
          Uses per account
          <input
            name="per_user_limit"
            type="number"
            min="1"
            max="100"
            defaultValue={promotion?.per_user_limit || 1}
            required
          />
        </label>
        <label>
          Starts
          <input
            name="starts_at"
            type="datetime-local"
            defaultValue={dateInput(promotion?.starts_at)}
          />
        </label>
        <label>
          Ends
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={dateInput(promotion?.ends_at)}
          />
        </label>
        <label>
          Restricted account email (optional)
          <input
            name="restricted_email"
            type="email"
            placeholder={
              promotion?.restricted_user_id
                ? "Current account remains unless replaced"
                : "customer@example.com"
            }
          />
        </label>
        <label>
          Status
          <select
            name="active"
            defaultValue={String(promotion?.active ?? true)}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="first_listing_only"
          defaultChecked={promotion?.first_listing_only}
        />
        Only valid for the account’s first property advert
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="automatic"
          defaultChecked={promotion?.automatic}
        />
        Apply automatically when the rules match (no code required)
      </label>
    </ActionForm>
  );
}
