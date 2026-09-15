import { NextRequest } from "next/server";
import { configured, db } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("detail") !== "operations")
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (!configured())
    return Response.json({ status: "unconfigured" }, { status: 503 });
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const { data: permissions } = await client.rpc("my_permissions");
  if (!Array.isArray(permissions) || !permissions.includes("audit"))
    return new Response("Forbidden", { status: 403 });

  const [latestJob, failedEmail, quarantine] = await Promise.all([
    client
      .from("job_runs")
      .select(
        "job_name,status,started_at,finished_at,processed_count,duration_ms",
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("attempts", 3),
    client
      .from("property_documents")
      .select("id", { count: "exact", head: true })
      .in("scan_status", ["quarantined", "manual_review"]),
  ]);
  const degraded = Boolean(
    latestJob.error || failedEmail.error || quarantine.error,
  );
  return Response.json(
    {
      status: degraded ? "degraded" : "ok",
      database: "reachable",
      latestJob: latestJob.data || null,
      emailRetries: failedEmail.count || 0,
      documentReviewQueue: quarantine.count || 0,
    },
    {
      status: degraded ? 503 : 200,
      headers: { "Cache-Control": "private,no-store" },
    },
  );
}
