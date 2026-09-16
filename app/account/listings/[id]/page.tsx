/* eslint-disable @next/next/no-img-element -- Private authenticated images and local QR must not use a shared optimiser. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, currentUser, configured } from "@/lib/supabase";
import { getPlans } from "@/lib/catalogue";
import { money } from "@/lib/domain";
import { ActionForm } from "@/components/action-form";
import { UploadForm } from "@/components/upload-form";
import { VideoUpload } from "@/components/video-upload";
import { MediaDeleteButton } from "@/components/media-delete-button";
import { features } from "@/lib/business";
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
  const [plans, docs, media, types, agreement, reviews, profile] =
    await Promise.all([
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
      client
        .from("profiles")
        .select("full_name,phone")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
  const selectedPlan = plans.find((plan) => plan.id === p.plan_id);
  const imageCount =
    media.data?.filter((item) => item.kind === "image").length || 0;
  const editable = ["draft", "needs_changes"].includes(p.status);
  const approved = ["live", "paused", "under_offer"].includes(p.status);
  const reviewLocked = ["submitted", "under_review"].includes(p.status);
  const submissionBlockers = [
    ...(profile.data?.full_name?.trim().length > 1 &&
    profile.data?.phone?.trim().length > 5
      ? []
      : ["Add your full name and phone number on the Profile page."]),
    ...(p.description?.trim().length >= 50
      ? []
      : ["Expand the property description to at least 50 characters."]),
    ...(media.data?.some((item) => item.kind === "image")
      ? []
      : ["Upload at least one property photograph."]),
  ];
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">{p.reference}</span>
          <h1>{p.title}</h1>
          <span className="status">{p.status.replaceAll("_", " ")}</span>
        </div>
        {editable ? (
          <Link
            className="button secondary"
            href={`/account/listings/${id}/edit`}
          >
            Edit details
          </Link>
        ) : approved ? (
          <ActionForm
            action="begin-listing-revision"
            extra={{ id }}
            label="Edit approved listing"
          />
        ) : null}
      </div>
      {reviewLocked && (
        <div className="notice" role="status">
          <strong>This listing is locked while staff review it.</strong>
          <p>
            Check every detail and photograph before submitting. If you make
            changes after approval, the revised listing must be submitted and
            approved again before it returns to the live marketplace.
          </p>
        </div>
      )}
      {(editable || approved) && (
        <div className="notice" role="status">
          <strong>Prepare everything before you submit.</strong>
          <p>
            You may change details and photographs while preparing this version.
            Submission locks editing until staff complete their review. Changes
            to an approved listing also require a fresh review.
          </p>
        </div>
      )}
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
                <div className="upload-row-content">
                  <span>
                    {m.alt || "Property photograph"} · {m.kind}
                  </span>
                  {m.kind === "image" && (editable || approved) && (
                    <MediaDeleteButton
                      id={m.id}
                      name={m.alt || "this photograph"}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          {(editable || approved) && (
            <>
              <UploadForm
                property={id}
                kind="image"
                currentCount={imageCount}
                limit={selectedPlan?.photo_limit}
              />
              {features.video && p.plan_id !== "free" && (
                <VideoUpload property={id} />
              )}
            </>
          )}
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>
            3. Private ownership and authority evidence (optional)
          </h2>
          <p>
            You can submit your listing without documents. Add any evidence you
            already have if you would like the team to review it privately.
            Staff may request evidence later when it is needed.
          </p>
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
          {(editable || approved) && (
            <UploadForm
              property={id}
              kind="document"
              types={types.data || []}
            />
          )}
        </section>
        <section className="panel">
          <h2 style={{ fontSize: 24 }}>4. Payment and submission</h2>
          {p.plan_id !== "free" && features.paidListings && (
            <ActionForm
              action="checkout"
              extra={{ id }}
              label="Open secure advertising checkout"
            />
          )}
          {p.plan_id !== "free" && !features.paidListings && (
            <div className="notice">
              Paid advertising plans are launching shortly. Select the Free plan
              or contact our property team for early access.
            </div>
          )}
          {reviewLocked ? (
            <div className="notice success" role="status">
              This listing has been submitted and is awaiting review.
            </div>
          ) : agreement.data &&
            ["draft", "needs_changes", "payment_pending"].includes(p.status) ? (
            <>
              {submissionBlockers.length > 0 && (
                <div className="notice" role="status">
                  <strong>Complete these items before submission:</strong>
                  <ul>
                    {submissionBlockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <details style={{ marginBlock: 20 }}>
                <summary>
                  Read seller agreement · {agreement.data.version}
                </summary>
                <p style={{ whiteSpace: "pre-line" }}>
                  {agreement.data.content}
                </p>
              </details>
              {submissionBlockers.length === 0 && (
                <ActionForm
                  action="submit"
                  extra={{ id }}
                  label="Submit for review"
                  replaceOnSuccess
                  successTitle="Listing submitted"
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
              )}
            </>
          ) : !agreement.data ? (
            <div className="notice">
              Submission opens after professionally reviewed seller terms are
              configured. You can prepare your draft and evidence now.
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
