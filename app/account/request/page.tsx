import { notFound } from "next/navigation";
import { db, configured } from "@/lib/supabase";
import { ActionForm } from "@/components/action-form";
import { features } from "@/lib/business";
export default async function Request({
  searchParams,
}: {
  searchParams: Promise<{ property: string; kind: string }>;
}) {
  if (!configured()) return null;
  const { property, kind } = await searchParams;
  if (!["enquire", "inspection", "offer", "report"].includes(kind)) notFound();
  if (kind === "offer" && !features.offers) notFound();
  if (kind === "enquire" && !features.enquiries) notFound();
  if (kind === "inspection" && !features.inspections) notFound();
  const { data: p } = await (
    await db()
  )
    .from("public_properties")
    .select("id,title,reference")
    .eq("id", property)
    .maybeSingle();
  if (!p) notFound();
  return (
    <>
      <span className="eyebrow">{p.reference}</span>
      <h1>
        {
          {
            enquire: "Ask about this property",
            inspection: "Request an inspection",
            offer: "Make a private offer",
            report: "Report a concern",
          }[kind]
        }
      </h1>
      <p>{p.title}</p>
      <div className="panel">
        <ActionForm
          action="buyer"
          extra={{ property, kind }}
          label="Send request"
          bot
        >
          {kind === "inspection" && (
            <div className="form-grid">
              <label>
                Preferred date and time (your local time)
                <input type="datetime-local" name="preferred_at" required />
              </label>
              <label>
                Number attending
                <input
                  type="number"
                  name="attendees"
                  min="1"
                  max="20"
                  defaultValue="1"
                  required
                />
              </label>
              <label>
                Are you based outside Nigeria?
                <select name="overseas">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
            </div>
          )}
          {kind === "offer" && (
            <label>
              Offer amount (₦)
              <input
                name="amount"
                inputMode="decimal"
                pattern="[0-9]+([.][0-9]{1,2})?"
                required
              />
            </label>
          )}
          {kind === "report" && (
            <label>
              Reason
              <select name="reason">
                {[
                  "Incorrect information",
                  "Property does not exist",
                  "Authority concern",
                  "Duplicate listing",
                  "Misleading photographs",
                  "Already sold",
                  "Suspicious documents",
                  "Fraud/scam concern",
                  "Incorrect price",
                  "Other",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            {kind === "offer"
              ? "Conditions, timing and message"
              : "Your message"}
            <textarea name="message" required minLength={10} maxLength={5000} />
          </label>
          <p className="form-caption">
            Your request is private.{" "}
            {kind === "offer"
              ? "An accepted offer is not a completed sale. No property payment is collected here."
              : "The team will review your request before confirming arrangements."}
          </p>
        </ActionForm>
      </div>
    </>
  );
}
