import { NextRequest } from "next/server";
import { z } from "zod";
import { db, configured, serviceDb } from "@/lib/supabase";
import {
  sameOrigin,
  rateLimit,
  checkBot,
  errorResponse,
  HttpError,
} from "@/lib/security";
import { toMinor } from "@/lib/domain";
import { paystack } from "@/lib/payments";
const uuid = (v: unknown) => z.uuid().parse(v);
const text = (v: unknown, min = 1, max = 5000) =>
  z.string().min(min).max(max).parse(v);
const optionalId = (v: unknown) => (v ? uuid(v) : null);
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
      await checkBot(body.token);
      const email = z.email().parse(data.email);
      await rateLimit(`contact:${email}`, 3, 600);
      const { data: ticket, error } = await serviceDb()
        .from("support_tickets")
        .insert({
          user_id: user?.id || null,
          email,
          category: text(data.category, 3, 60),
          message: text(data.message, 20),
        })
        .select("reference")
        .single();
      if (error) throw error;
      return Response.json({
        message: `Your enquiry is recorded. Reference: ${ticket.reference}.`,
      });
    }
    if (!user) throw new HttpError(401, "Please sign in to continue.");
    await rateLimit(`action:${user.id}:${action}`, 30, 60);
    let result: unknown = null;
    async function rpc(name: string, args: Record<string, unknown>) {
      const { data, error } = await client.rpc(name, args);
      if (error)
        throw new HttpError(
          400,
          error.code === "P0001"
            ? error.message
            : "Check your information and try again.",
        );
      return data;
    }
    if (action === "profile")
      await rpc("update_profile", {
        p_name: text(data.full_name, 2, 120),
        p_phone: text(data.phone, 6, 30),
        p_type: z
          .enum(["owner", "agent", "developer", "buyer"])
          .parse(data.seller_type),
      });
    else if (action === "save-property") {
      const payload = {
        ...data,
        title: text(data.title, 5, 160),
        description: text(data.description || "", 0, 15000),
        category: z
          .enum(["houses", "land", "commercial", "new-developments"])
          .parse(data.category),
        location_id: uuid(data.location_id),
        price_minor: toMinor(String(data.price)),
        land_sqm: z.coerce
          .number()
          .positive()
          .max(100000000)
          .parse(data.land_sqm),
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
    else if (action === "submit") {
      if (data.accepted !== "on")
        throw new HttpError(400, "Confirm the seller declaration.");
      await rpc("submit_property", {
        p_id: uuid(body.id),
        p_agreement: uuid(data.agreement_id),
      });
    } else if (action === "checkout") {
      if (!process.env.PAYSTACK_SECRET_KEY)
        throw new HttpError(503, "Advertising checkout is not available yet.");
      const order = await rpc("create_order", { p_property: uuid(body.id) });
      const url = await paystack.initialise({
        reference: order.reference,
        amount_minor: order.amount_minor,
        email: user.email!,
      });
      return Response.json({ url });
    } else if (action === "buyer") {
      const kind = z
        .enum(["save", "enquire", "inspection", "offer", "report"])
        .parse(body.kind);
      if (kind !== "save") await checkBot(body.token);
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
    } else if (action === "moderate")
      await rpc("moderate_property", {
        p_id: uuid(body.id),
        p_decision: text(data.decision, 3, 30),
        p_reason: text(data.reason, 5, 2000),
      });
    else if (action === "verification")
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
    else if (action === "offer-response")
      await rpc("respond_offer", {
        p_id: uuid(body.id),
        p_status: text(data.status, 3, 30),
        p_amount: data.amount ? toMinor(data.amount) : null,
        p_message: text(data.message, 5),
      });
    else if (action === "transaction")
      result = await rpc("manage_transaction", {
        p_id: optionalId(body.id),
        p_property: optionalId(data.property_id),
        p_buyer: optionalId(data.buyer_id),
        p_stage: text(data.stage || "buyer_qualified"),
        p_summary: text(data.summary, 10),
        p_sale: data.sale_price ? toMinor(data.sale_price) : null,
      });
    else if (action === "config")
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
      await rpc("save_content", {
        p_slug: text(data.slug, 1, 120),
        p_title: text(data.title, 3, 160),
        p_description: text(data.description, 0, 500),
        p_content: text(data.content, 30, 20000),
        p_published: data.published === "true",
      });
    else if (action === "document-link") {
      const { data: document, error } = await client
        .from("property_documents")
        .select("id,storage_path")
        .eq("id", uuid(body.id))
        .single();
      if (error || !document)
        throw new HttpError(403, "Document access is not permitted.");
      const service = serviceDb();
      const { error: auditError } = await service.from("audit_logs").insert({
        actor_id: user.id,
        action: "document_viewed",
        entity: "document",
        entity_id: document.id,
      });
      if (auditError) throw auditError;
      const { data: signed, error: signError } = await service.storage
        .from("private-evidence")
        .createSignedUrl(document.storage_path, 60, { download: true });
      if (signError) throw signError;
      return Response.json({ url: signed.signedUrl });
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
      return Response.json({ error: e.issues[0].message }, { status: 400 });
    return errorResponse(e);
  }
}
