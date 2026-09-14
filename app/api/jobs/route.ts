import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serviceDb } from "@/lib/supabase";
import { mailer } from "@/lib/email";
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    token.length !== expected.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  )
    return new Response("Unauthorised", { status: 401 });
  try {
    const client = serviceDb();
    const { error } = await client.rpc("run_maintenance");
    if (error) throw error;
    const { data: stale } = await client
      .from("video_uploads")
      .select("id,path")
      .in("status", ["pending", "failed"])
      .lt("created_at", new Date(Date.now() - 7200000).toISOString())
      .limit(50);
    for (const item of stale || []) {
      const { error: cleanupError } = await client.storage
        .from("video-quarantine")
        .remove([item.path]);
      if (!cleanupError)
        await client.from("video_uploads").delete().eq("id", item.id);
    }
    const { data: jobs } = await client
      .from("email_outbox")
      .select("id,notification_id,attempts")
      .eq("status", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .limit(25);
    let sent = 0;
    for (const job of jobs || []) {
      try {
        const { data: n } = await client
          .from("notifications")
          .select("user_id,title,body")
          .eq("id", job.notification_id)
          .single();
        if (!n) continue;
        const {
          data: { user },
        } = await client.auth.admin.getUserById(n.user_id);
        if (!user?.email) continue;
        await mailer.send({
          id: job.id,
          to: user.email,
          subject: n.title,
          text: n.body,
        });
        await client
          .from("email_outbox")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", job.id);
        sent++;
      } catch {
        await client
          .from("email_outbox")
          .update({
            attempts: job.attempts + 1,
            next_attempt_at: new Date(
              Date.now() + Math.min(86400000, 60000 * 2 ** job.attempts),
            ).toISOString(),
          })
          .eq("id", job.id);
      }
    }
    return Response.json({ sent });
  } catch {
    console.error(JSON.stringify({ event: "maintenance_failed" }));
    return new Response("Retry later", { status: 500 });
  }
}
