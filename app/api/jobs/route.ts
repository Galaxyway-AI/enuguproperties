import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { mailer } from "@/lib/email";
import { serverQuery } from "@/lib/server-db";
import { deleteMedia } from "@/lib/storage";
import { deleteVideo } from "@/lib/stream";
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
    const started = Date.now();
    const [run] = await serverQuery<{ id: number }>(
      "insert into public.job_runs(job_name,status) values('maintenance','running') returning id",
    );
    if (!run) throw new Error("Job run could not be recorded");
    try {
      const [maintenance] = await serverQuery<{ maintained: number }>(
        "select public.run_maintenance() as maintained",
      );
      const stale = await serverQuery<{ id: string; path: string }>(
        "select id,path from public.video_uploads where status in ('pending','failed') and created_at < now()-interval '2 hours' order by created_at limit 50",
      );
      for (const item of stale) {
        if (item.path.startsWith("stream:"))
          await deleteVideo(item.path.slice("stream:".length)).catch(
            () => undefined,
          );
        else await deleteMedia("video-quarantine", item.path);
        await serverQuery("delete from public.video_uploads where id=$1", [
          item.id,
        ]);
      }
      const jobs = await serverQuery<{
        id: string;
        attempts: number;
        email: string;
        title: string;
        body: string;
      }>(
        `select o.id,o.attempts,u.email,n.title,n.body
         from public.email_outbox o
         join public.notifications n on n.id=o.notification_id
         join neon_auth.user u on u.id=n.user_id::text
         where o.status='pending' and o.next_attempt_at<=now()
         order by o.next_attempt_at limit 25`,
      );
      let sent = 0;
      for (const job of jobs) {
        try {
          await mailer.send({
            id: job.id,
            to: job.email,
            subject: job.title,
            text: job.body,
          });
          await serverQuery(
            "update public.email_outbox set status='sent',sent_at=now() where id=$1",
            [job.id],
          );
          sent++;
        } catch {
          const nextAttempt = new Date(
            Date.now() + Math.min(86400000, 60000 * 2 ** job.attempts),
          ).toISOString();
          await serverQuery(
            "update public.email_outbox set attempts=attempts+1,next_attempt_at=$2 where id=$1",
            [job.id, nextAttempt],
          );
        }
      }
      const maintained = Number(maintenance?.maintained || 0);
      await serverQuery(
        "update public.job_runs set status='succeeded',finished_at=now(),processed_count=$2,duration_ms=$3 where id=$1",
        [run.id, maintained + sent, Date.now() - started],
      );
      return Response.json({ sent, maintained });
    } catch (error) {
      await serverQuery(
        "update public.job_runs set status='failed',finished_at=now(),duration_ms=$2,error_summary=$3 where id=$1",
        [
          run.id,
          Date.now() - started,
          error instanceof Error ? error.name.slice(0, 120) : "Unknown",
        ],
      );
      throw error;
    }
  } catch {
    console.error(JSON.stringify({ event: "maintenance_failed" }));
    return new Response("Retry later", { status: 500 });
  }
}
