/* eslint-disable @next/next/no-img-element -- Private authenticated images and local QR must not use a shared optimiser. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, currentUser, configured } from "@/lib/supabase";
import { getPlans } from "@/lib/catalogue";
import { money } from "@/lib/domain";
import { ActionForm } from "@/components/action-form";
import { UploadForm } from "@/components/upload-form";
import { VideoUpload } from "@/components/video-upload";
export default async function Listing({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured()) return null;
  const { id } = await params;
  const client = await db();
  const user = await currentUser();
  if (!user) return null;
  const { data: p } = await client
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user!.id)
    .maybeSingle();
  if (!p) notFound();
  const [plans, docs, media, types, agreement, reviews] = await Promise.all([
    getPlans(),
    client
      .from("property_documents")
      .select("id,original_name,type_id")
      .eq("property_id", id),
    client.from("property_media").select("id,alt,kind").eq("property_id", id),
    client.from("document_types").select("*"),
    client
      .from("agreement_versions")
      .select("id,version,content")
      .eq("kind", "seller")
      .eq("active", true)
      .eq("legal_approved", true)
      .limit(1)
      .maybeSingle(),
    client
      .from("moderation_reviews")
      .select("decision,reason,created_at")
      .eq("property_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">{p.reference}</span>
          <h1>{p.title}</h1>
          <span className="status">{p.status.replaceAll("_", " ")}</span>
        </div>
        <Link
          className="button secondary"
          href={`/account/listings/${id}/edit`}
        >
          Edit details
        </Link>
      </div>
      {reviews.data?.map((r) => (
        <div key={r.created_at} className="notice">
          <strong>{r.decision.replaceAll("_", " ")}</strong>
          <p>{r.reason}</p>
        </div>
      ))}
      <div className="record-list">
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>1. Advertising plan</h2>
          <ActionForm action="plan" extra={{ id }} label="Save plan">
            <label>
              Choose your plan
              <select name="plan_id" defaultValue={p.plan_id}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {money(plan.price_minor)} ·{" "}
                    {plan.duration_days} days · {plan.photo_limit} photos
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>
          <p className="form-caption">
            Advertising never purchases verification or publication approval.
          </p>
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>2. Property photographs</h2>
          <div className="upload-list">
            {media.data?.map((m) => (
              <div key={m.id} className="upload-row">
                {m.kind === "image" && (
                  <img
                    src={`/api/private-media/${m.id}`}
                    alt={m.alt || "Submitted photograph"}
                    style={{
                      width: 160,
                      height: 100,
                      display: "block",
                      borderRadius: 5,
                    }}
                  />
                )}
                {m.alt || "Property photograph"} · {m.kind}
              </div>
            ))}
          </div>
          {["draft", "needs_changes"].includes(p.status) && (
            <>
              <UploadForm property={id} kind="image" />
              {p.plan_id !== "free" && <VideoUpload property={id} />}
            </>
          )}
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>
            3. Private ownership and authority evidence
          </h2>
          <div className="upload-list">
            {docs.data?.map((d) => (
              <div className="upload-row" key={d.id}>
                {d.original_name}
                <ActionForm
                  action="document-link"
                  extra={{ id: d.id }}
                  label="Download authorised copy"
                />
              </div>
            ))}
          </div>
          {["draft", "needs_changes"].includes(p.status) && (
            <UploadForm
              property={id}
              kind="document"
              types={types.data || []}
            />
          )}
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>4. Payment and submission</h2>
          {p.plan_id !== "free" && (
            <ActionForm
              action="checkout"
              extra={{ id }}
              label="Open secure advertising checkout"
            />
          )}
          {agreement.data ? (
            <>
              <details style={{ marginBlock: 20 }}>
                <summary>
                  Read seller agreement · {agreement.data.version}
                </summary>
                <p style={{ whiteSpace: "pre-line" }}>
                  {agreement.data.content}
                </p>
              </details>
              <ActionForm
                action="submit"
                extra={{ id }}
                label="Submit for review"
              >
                <input
                  type="hidden"
                  name="agreement_id"
                  value={agreement.data.id}
                />
                <label className="checkbox-label">
                  <input type="checkbox" name="accepted" required />I confirm
                  that this information is accurate, I have authority to
                  advertise this property and I accept the seller agreement
                  shown above.
                </label>
              </ActionForm>
            </>
          ) : (
            <div className="notice">
              Submission opens after professionally reviewed seller terms are
              configured. You can prepare your draft and evidence now.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
