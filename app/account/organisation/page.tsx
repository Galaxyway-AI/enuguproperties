import { db, configured, currentUser } from "@/lib/supabase";
import { ActionForm } from "@/components/action-form";
export default async function Organisation() {
  if (!configured()) return null;
  const user = await currentUser();
  if (!user) return null;
  const { data: org } = await (
    await db()
  )
    .from("organisations")
    .select("*")
    .eq("created_by", user.id)
    .limit(1)
    .maybeSingle();
  return (
    <>
      <h1>Your organisation</h1>
      <p>
        Record the agency, developer or company you represent. These details do
        not confer verified status.
      </p>
      <section className="panel">
        <ActionForm action="organisation">
          <label>
            Organisation name
            <input
              name="name"
              required
              minLength={3}
              maxLength={160}
              defaultValue={org?.name}
            />
          </label>
          <label>
            Organisation type
            <select name="kind" defaultValue={org?.kind || "agency"}>
              <option value="agency">Property agency</option>
              <option value="developer">Developer</option>
              <option value="company">Company</option>
            </select>
          </label>
        </ActionForm>
      </section>
    </>
  );
}
