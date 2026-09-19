import { after, NextRequest } from "next/server";
import { z } from "zod";
import { db, configured } from "@/lib/supabase";
import { serverQuery } from "@/lib/server-db";
import { createEvidenceToken } from "@/lib/signed-media";
import { appUrl, business, features } from "@/lib/business";
import {
  sameOrigin,
  rateLimit,
  checkBot,
  errorResponse,
  HttpError,
  validationErrorMessage,
  databaseActionErrorMessage,
} from "@/lib/security";
import { toMinor } from "@/lib/domain";
import { kora } from "@/lib/payments";
import { notifyIndexNow, notifyIndexNowForProperty } from "@/lib/indexnow";
import {
  mailer,
  safelyRunOperationsTask,
  safelySendOperationsAlert,
} from "@/lib/email";
const uuid = (v: unknown) => z.uuid().parse(v);
const text = (v: unknown, min = 1, max = 5000, label = "This field") => {
  if (typeof v !== "string") throw new HttpError(400, `${label} is required.`);
  if (v.length < min)
    throw new HttpError(
      400,
      `${label} must contain at least ${min} ${min === 1 ? "character" : "characters"}.`,
    );
  if (v.length > max)
    throw new HttpError(
      400,
      `${label} must contain no more than ${max} characters.`,
    );
  return v;
};
const optionalId = (v: unknown) => (v ? uuid(v) : null);
const optionalNumber = (v: unknown, minimum: number, maximum: number) =>
  v === "" || v === null || v === undefined
    ? null
    : z.coerce.number().min(minimum).max(maximum).parse(v);
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    if (!configured())
      throw new HttpError(
        503,
        "This service is awaiting setup. Nothing has been submitted.",
      );
    if (Number(request.headers.get("content-length") || 0) > 40000)
      throw new HttpError(413, "Request is too large.");
    const body = await request.json();
    const action = text(body.action, 1, 40);
    const data = body.data || {};
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (action === "contact") {
      await checkBot(body.token, "contact", request.url);
      const email = z.email().parse(data.email);
      const category = text(data.category, 3, 60).replace(/[\r\n]+/g, " ");
      const message = text(data.message, 20, 5000, "Your message");
      await rateLimit(`contact:${email}`, 3, 600);
      const [ticket] = await serverQuery<{ reference: string }>(
        "insert into public.support_tickets(user_id,email,category,message) values($1,$2,$3,$4) returning reference",
        [user?.id || null, email, category, message],
      );
      if (!ticket) throw new Error("Support ticket was not recorded.");
      await mailer.send({
        id: `contact-${ticket.reference}`,
        to: process.env.CONTACT_RECIPIENT_EMAIL || business.supportEmail,
        replyTo: business.supportEmail,
        subject: `Contact enquiry ${ticket.reference}: ${category}`,
        text: `From: ${email}\nCategory: ${category}\nReference: ${ticket.reference}\n\n${message}`,
        accountLink: false,
      });
      return Response.json({
        message: `Your message has been sent. Reference: ${ticket.reference}.`,
      });
    }
    if (!user) throw new HttpError(401, "Please sign in to continue.");
    await rateLimit(`action:${user.id}:${action}`, 30, 60);
    let result: unknown = null;
    async function rpc(name: string, args: Record<string, unknown>) {
      const { data, error } = await client.rpc(name, args);
      if (error) throw new HttpError(400, databaseActionErrorMessage(error));
      return data;
    }
    if (action === "profile")
      await rpc("update_profile", {
        p_name: text(data.full_name, 2, 120),
        p_phone: text(data.phone, 6, 30),
        p_whatsapp: text(data.whatsapp || "", 0, 30),
        p_type: z
          .enum(["owner", "agent", "developer", "buyer"])
          .parse(data.seller_type),
      });
    else if (action === "save-property") {
      if (!features.freeListings)
        throw new HttpError(
          503,
          "Property listing is temporarily unavailable.",
        );
      const payload = {
        ...data,
        title: text(data.title, 5, 160, "Property title"),
        description: text(data.description || "", 0, 15000),
        category: z
          .enum(["houses", "land", "commercial", "new-developments"])
          .parse(data.category),
        listing_purpose: z
          .enum(["sale", "rent", "short-let"])
          .parse(data.listing_purpose || "sale"),
        location_id: uuid(data.location_id),
        property_type: z
          .string()
          .min(2)
          .max(80)
          .regex(/^[a-z0-9-]+$/)
          .parse(data.property_type),
        price_minor: toMinor(String(data.price)),
        land_sqm: z.coerce
          .number()
          .positive()
          .max(100000000)
          .parse(data.land_sqm),
        bedrooms: optionalNumber(data.bedrooms, 0, 100),
        bathrooms: optionalNumber(data.bathrooms, 0, 100),
        toilets: optionalNumber(data.toilets, 0, 100),
        living_rooms: optionalNumber(data.living_rooms, 0, 50),
        parking_spaces: optionalNumber(data.parking_spaces, 0, 200),
        building_sqm: optionalNumber(data.building_sqm, 1, 100000000),
        negotiable: data.negotiable === "on",
        property_condition: z
          .enum([
            "",
            "new",
            "excellent",
            "good",
            "renovation-required",
            "under-construction",
          ])
          .parse(data.property_condition || ""),
        furnishing: z
          .enum(["", "unfurnished", "part-furnished", "furnished"])
          .parse(data.furnishing || ""),
        details: {
          floors: optionalNumber(data.floors, 1, 100),
          year_built: optionalNumber(
            data.year_built,
            1900,
            new Date().getFullYear() + 10,
          ),
          intended_use: z
            .enum([
              "",
              "residential",
              "commercial",
              "mixed-use",
              "agricultural",
            ])
            .parse(data.intended_use || ""),
          topography: z
            .enum(["", "level", "sloping", "undulating"])
            .parse(data.topography || ""),
          fenced:
            data.fenced === "true"
              ? true
              : data.fenced === "false"
                ? false
                : null,
          development_status: z
            .enum(["", "undeveloped", "partly-developed", "serviced"])
            .parse(data.development_status || ""),
          road_access: z
            .enum(["", "paved", "unpaved", "limited"])
            .parse(data.road_access || ""),
        },
        features:
          typeof data.features === "string"
            ? data.features
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
                .slice(0, 30)
            : [],
      };
      result = await rpc("save_property", {
        p_id: optionalId(body.id),
        p_data: payload,
      });
    } else if (action === "plan")
      await rpc("select_plan", {
        p_id: uuid(body.id),
        p_plan: text(data.plan_id, 1, 40),
      });
    else if (action === "begin-listing-revision") {
      const propertyId = uuid(body.id);
      await rpc("begin_approved_listing_revision", { p_id: propertyId });
      return Response.json({
        ok: true,
        url: `/account/listings/${propertyId}/edit`,
      });
    } else if (action === "listing-availability") {
      const propertyId = uuid(body.id);
      const availability = z
        .enum(["available", "sold", "rented"])
        .parse(data.availability_status);
      await rpc("set_listing_availability", {
        p_id: propertyId,
        p_availability: availability,
      });
      after(() => notifyIndexNowForProperty(propertyId));
      return Response.json({
        ok: true,
        message:
          availability === "available"
            ? "The advert is available again. The badge has been removed."
            : `The advert is now marked ${availability}. Visitors can see the badge immediately.`,
      });
    } else if (action === "submit") {
      if (data.accepted !== "on")
        throw new HttpError(400, "Confirm the seller declaration.");
      const propertyId = uuid(body.id);
      await rpc("submit_property", {
        p_id: propertyId,
        p_agreement: uuid(data.agreement_id),
      });
      after(() =>
        safelyRunOperationsTask(`listing-${propertyId}`, async () => {
          const [property] = await serverQuery<{
            reference: string;
            title: string;
            revision: number;
            published_at: string | null;
          }>(
            "select reference,title,revision,published_at::text from public.properties where id=$1",
            [propertyId],
          );
          if (!property) return;
          const isRevision = Boolean(property.published_at);
          await safelySendOperationsAlert({
            id: `listing-${propertyId}-${property.revision}`,
            subject: isRevision
              ? `Edited advert awaiting review: ${property.reference}`
              : `New advert awaiting review: ${property.reference}`,
            text: `${property.title}\n\nSeller: ${user.email || "Account email unavailable"}\nReference: ${property.reference}\n\n${isRevision ? "An approved advert was edited and resubmitted." : "A new advert was submitted."} It is ready for moderation.`,
            adminPath: `/admin/property/${propertyId}`,
          });
        }),
      );
    } else if (action === "checkout") {
      if (!features.paidListings)
        throw new HttpError(
          503,
          "Paid advertising plans are launching shortly.",
        );
      const order = await rpc("create_order", {
        p_property: uuid(body.id),
        p_code: text(data.promotion_code || "", 0, 30),
      });
      if (order.amount_minor === 0 && order.status === "paid")
        return Response.json({
          ok: true,
          message:
            "Your free advertising offer has been applied. You can now submit the listing for review.",
        });
      if (!process.env.KORAPAY_SECRET_KEY)
        throw new HttpError(503, "Advertising checkout is not available yet.");
      const url = await kora.initialise({
        reference: order.reference,
        amount_minor: order.amount_minor,
        email: user.email!,
        purpose: "listing",
      });
      return Response.json({ url });
    } else if (action === "checkout-featured") {
      if (!features.paidListings)
        throw new HttpError(
          503,
          "Featured advertising checkout is temporarily unavailable.",
        );
      const order = await rpc("create_featured_order", {
        p_property: uuid(body.id),
      });
      if (!process.env.KORAPAY_SECRET_KEY)
        throw new HttpError(
          503,
          "Featured advertising checkout is not available yet.",
        );
      const url = await kora.initialise({
        reference: order.reference,
        amount_minor: order.amount_minor,
        email: user.email!,
        purpose: "featured",
      });
      return Response.json({ url });
    } else if (action === "buyer") {
      const kind = z
        .enum(["save", "enquire", "inspection", "offer", "report"])
        .parse(body.kind);
      if (kind === "enquire" && !features.enquiries)
        throw new HttpError(
          503,
          "Property enquiries are temporarily unavailable.",
        );
      if (kind === "inspection" && !features.inspections)
        throw new HttpError(
          503,
          "Inspection requests are temporarily unavailable.",
        );
      if (kind === "offer" && !features.offers)
        throw new HttpError(404, "Offers are not available.");
      if (kind !== "save") await checkBot(body.token, "buyer", request.url);
      if (kind === "offer") data.amount_minor = toMinor(String(data.amount));
      if (kind !== "save") text(data.message, kind === "inspection" ? 0 : 10);
      result = await rpc("buyer_action", {
        p_property: uuid(body.property),
        p_action: kind,
        p_data: data,
      });
      if (kind === "save") {
        const { data: saved } = await client
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", user.id)
          .eq("property_id", body.property)
          .maybeSingle();
        return Response.json({
          ok: true,
          saved: Boolean(saved),
          message: saved
            ? "Property saved."
            : "Property removed from saved properties.",
        });
      }
      const requestId = z.uuid().safeParse(result);
      if (requestId.success) {
        const propertyId = uuid(body.property);
        const alertDetails = {
          enquire: {
            subject: "New property enquiry",
            path: "/admin/enquiries",
            label: "Enquiry",
          },
          inspection: {
            subject: "New inspection request",
            path: "/admin/inspections",
            label: "Inspection request",
          },
          offer: {
            subject: "New property offer",
            path: "/admin/transactions",
            label: "Offer",
          },
          report: {
            subject: "New property report",
            path: "/admin/reports",
            label: "Report",
          },
        }[kind];
        if (alertDetails)
          after(() =>
            safelyRunOperationsTask(`${kind}-${requestId.data}`, async () => {
              const [property] = await serverQuery<{
                reference: string;
                title: string;
                buyer_name: string;
              }>(
                `select property.reference,property.title,coalesce(profile.full_name,'') buyer_name
               from public.properties property
               left join public.profiles profile on profile.id=$2
               where property.id=$1`,
                [propertyId, user.id],
              );
              if (!property) return;
              const message = String(data.message || "").trim();
              await safelySendOperationsAlert({
                id: `${kind}-${requestId.data}`,
                subject: `${alertDetails.subject}: ${property.reference}`,
                text: `${alertDetails.label} received for ${property.title}.\n\nProperty: ${property.reference}\nFrom: ${property.buyer_name || "Registered user"} (${user.email || "email unavailable"})${message ? `\n\nMessage:\n${message}` : ""}`,
                adminPath: alertDetails.path,
              });
            }),
          );
      }
    } else if (action === "moderate") {
      const propertyId = uuid(body.id);
      const decision = text(data.decision, 3, 30);
      const reason = text(data.reason, 5, 2000, "Decision reason");
      await rpc("moderate_property", {
        p_id: propertyId,
        p_decision: decision,
        p_reason: reason,
      });
      after(() => notifyIndexNowForProperty(propertyId));
      let emailed = false;
      try {
        const [notice] = await serverQuery<{
          review_id: string;
          notification_id: string | null;
          email: string;
          reference: string;
          title: string;
        }>(
          `select review.id::text review_id,
                (select notification.id::text
                 from public.notifications notification
                 where notification.user_id=property.seller_id
                   and notification.kind='listing_update'
                   and notification.created_at>=review.created_at
                 order by notification.created_at desc limit 1) notification_id,
                account.email,property.reference,property.title
         from public.properties property
         join neon_auth."user" account on account.id=property.seller_id::text
         join lateral (
           select id,created_at from public.moderation_reviews
           where property_id=property.id order by created_at desc limit 1
         ) review on true
         where property.id=$1`,
          [propertyId],
        );
        if (notice) {
          await mailer.send({
            id: `moderation-${notice.review_id}`,
            to: notice.email,
            subject: `Listing review: ${notice.reference}`,
            text: `${notice.title}\n\nDecision: ${decision.replaceAll("_", " ")}\n\n${reason}`,
          });
          emailed = true;
          if (notice.notification_id)
            await serverQuery(
              "update public.email_outbox set status='sent',sent_at=now() where notification_id=$1",
              [notice.notification_id],
            );
        }
      } catch (notificationError) {
        console.error(
          JSON.stringify({
            event: "moderation_notification_queued",
            type:
              notificationError instanceof Error
                ? notificationError.name
                : "Unknown",
          }),
        );
      }
      return Response.json({
        ok: true,
        message: emailed
          ? "Decision recorded and emailed to the seller."
          : "Decision recorded. The seller has been notified in their account and the email is queued.",
      });
    } else if (action === "verification")
      result = await rpc("record_verification", {
        p_property: uuid(body.id),
        p_type: text(data.type_id, 1, 40),
        p_status: text(data.status, 3, 40),
        p_summary: text(data.public_summary, 0, 3000),
        p_notes: text(data.internal_notes, 0, 5000),
        p_document: optionalId(data.document_id),
        p_provider: optionalId(data.provider_id),
        p_expiry: data.expires_at
          ? new Date(data.expires_at).toISOString()
          : null,
      });
    else if (action === "inspection")
      await rpc("manage_inspection", {
        p_id: uuid(body.id),
        p_status: text(data.status, 3, 30),
        p_inspector: optionalId(data.inspector_id),
        p_at: data.preferred_at
          ? new Date(data.preferred_at).toISOString()
          : null,
        p_notes: data.notes || "",
        p_document: optionalId(data.document_id),
      });
    else if (action === "offer-response") {
      if (!features.offers)
        throw new HttpError(404, "Offers are not available.");
      await rpc("respond_offer", {
        p_id: uuid(body.id),
        p_status: text(data.status, 3, 30),
        p_amount: data.amount ? toMinor(data.amount) : null,
        p_message: text(data.message, 5),
      });
    } else if (action === "transaction") {
      if (!features.transactionCases)
        throw new HttpError(404, "Transaction cases are not available.");
      result = await rpc("manage_transaction", {
        p_id: optionalId(body.id),
        p_property: optionalId(data.property_id),
        p_buyer: optionalId(data.buyer_id),
        p_stage: text(data.stage || "buyer_qualified"),
        p_summary: text(data.summary, 10),
        p_sale: data.sale_price ? toMinor(data.sale_price) : null,
      });
    } else if (action === "promotion-admin") {
      const discountKind = z
        .enum(["percent", "fixed", "free"])
        .parse(data.discount_kind);
      const discountValue =
        discountKind === "free"
          ? 0
          : discountKind === "percent"
            ? z.coerce
                .number()
                .int()
                .min(1)
                .max(100)
                .parse(data.discount_value) * 100
            : toMinor(String(data.discount_value));
      let restrictedUserId = body.restrictedUserId
        ? uuid(body.restrictedUserId)
        : "";
      const restrictedEmail = String(data.restricted_email || "").trim();
      if (restrictedEmail) {
        const email = z.email().parse(restrictedEmail);
        const [account] = await serverQuery<{ id: string }>(
          `select id from neon_auth."user" where lower(email)=lower($1) limit 1`,
          [email],
        );
        if (!account)
          throw new HttpError(
            400,
            "No registered account was found for that restricted email address.",
          );
        restrictedUserId = account.id;
      }
      await rpc("manage_promotion", {
        p_id: optionalId(body.id),
        p_data: {
          code: text(data.code, 3, 30, "Promotion code").toUpperCase(),
          name: text(data.name, 3, 120, "Promotion name"),
          discount_kind: discountKind,
          discount_value: discountValue,
          plan_id: z.enum(["", "plus", "premium"]).parse(data.plan_id || ""),
          starts_at: data.starts_at || "",
          ends_at: data.ends_at || "",
          max_redemptions: optionalNumber(data.max_redemptions, 1, 1000000),
          per_user_limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .parse(data.per_user_limit || 1),
          first_listing_only: data.first_listing_only === "on",
          automatic: data.automatic === "on",
          restricted_user_id: restrictedUserId,
          active: data.active === "true",
        },
      });
      return Response.json({
        ok: true,
        message:
          "Promotion saved and is ready to use under its configured rules.",
      });
    } else if (action === "config")
      await rpc("admin_config", {
        p_kind: text(body.kind, 1, 30),
        p_id: String(body.id || ""),
        p_data: {
          ...data,
          ...(body.kind === "plan"
            ? { price_minor: toMinor(String(data.price)) }
            : {}),
        },
      });
    else if (action === "feature")
      await rpc("feature_property", {
        p_id: uuid(body.id),
        p_start: new Date(data.starts_at).toISOString(),
        p_end: new Date(data.ends_at).toISOString(),
      });
    else if (action === "account-status")
      await rpc("set_account_status", {
        p_id: uuid(body.id),
        p_status: text(data.status),
        p_reason: text(data.reason, 10),
      });
    else if (action === "beta-participant")
      await rpc("set_beta_participant", {
        p_id: uuid(body.id),
        p_enabled: data.enabled === "true",
        p_kind: z
          .enum(["test_seller", "test_buyer", "beta_customer", "staff_qa"])
          .parse(data.kind),
        p_reason: text(data.reason, 10, 500),
      });
    else if (action === "queue")
      await rpc("update_queue", {
        p_kind: text(body.kind),
        p_id: uuid(body.id),
        p_status: text(data.status),
        p_note: text(data.note, 5),
        p_assignee: optionalId(data.assigned_to),
      });
    else if (action === "organisation")
      result = await rpc("save_organisation", {
        p_name: text(data.name, 3, 160),
        p_kind: text(data.kind, 3, 30),
      });
    else if (action === "commission")
      await rpc("update_commission", {
        p_id: uuid(body.id),
        p_status: text(data.status),
        p_reference: text(data.reference, 3, 200),
      });
    else if (action === "content")
      {
      const slug = text(data.slug, 1, 120);
      await rpc("save_content", {
        p_slug: slug,
        p_title: text(data.title, 3, 160),
        p_description: text(data.description, 0, 500),
        p_content: text(data.content, 30, 20000),
        p_published: data.published === "true",
        p_author: text(data.author || "Enugu Properties Editorial Team", 2, 120, "Author"),
        p_seo_title: text(data.seo_title || "", 0, 160),
        p_meta_description: text(data.meta_description || "", 0, 320),
        p_social_image: text(data.social_image || "", 0, 500),
        p_indexable: data.indexable !== "false",
        p_canonical_override: text(data.canonical_override || "", 0, 500),
      });
      if (data.published === "true") after(() => notifyIndexNow([`/${slug}`, "/sitemap.xml"]));
      }
    else if (action === "document-link") {
      const { data: document, error } = await client
        .from("property_documents")
        .select("id,storage_path,scan_status")
        .eq("id", uuid(body.id))
        .single();
      if (error || !document)
        throw new HttpError(403, "Document access is not permitted.");
      if (document.scan_status !== "clean")
        throw new HttpError(
          423,
          "This document is still in security review and cannot be opened.",
        );
      await serverQuery(
        "insert into public.audit_logs(actor_id,action,entity,entity_id) values($1,'document_link_issued','document',$2)",
        [user.id, document.id],
      );
      const token = createEvidenceToken(document.id, user.id);
      return Response.json({
        url: appUrl(
          `/api/private-evidence/${document.id}?token=${encodeURIComponent(token)}`,
        ),
      });
    } else throw new HttpError(400, "Unknown action.");
    return Response.json({
      ok: true,
      id: result,
      message:
        action === "submit"
          ? "Your listing is awaiting moderation."
          : action === "buyer"
            ? "Your request has been recorded."
            : "Your changes have been saved.",
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        { error: validationErrorMessage(e) },
        { status: 400 },
      );
    return errorResponse(e);
  }
}
