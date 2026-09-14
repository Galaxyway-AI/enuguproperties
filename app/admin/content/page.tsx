import { db, configured } from "@/lib/supabase";
import { ActionForm } from "@/components/action-form";
export default async function ContentEditor() {
  if (!configured()) return null;
  const c = await db();
  const { data: p } = await c.rpc("my_permissions");
  if (!p?.includes("content"))
    return <div className="notice">Content permission is required.</div>;
  const { data: pages } = await c
    .from("content_pages")
    .select("*")
    .order("slug");
  return (
    <>
      <h1>Editorial content</h1>
      <p>
        Published text replaces the corresponding informational page. Use plain
        text; HTML is not executed.
      </p>
      <div className="record-list">
        {[
          ...(pages || []),
          {
            slug: "",
            title: "",
            description: "",
            content: "",
            published: false,
          },
        ].map((page, i) => (
          <section className="panel" key={i}>
            <h2 style={{ fontSize: 23 }}>{page.title || "Create a page"}</h2>
            <ActionForm action="content" label="Save editorial page">
              <label>
                Page slug
                <input
                  name="slug"
                  defaultValue={page.slug}
                  required
                  pattern="[a-z0-9-]+"
                />
              </label>
              <label>
                Title
                <input
                  name="title"
                  defaultValue={page.title}
                  required
                  minLength={3}
                />
              </label>
              <label>
                Introduction
                <textarea name="description" defaultValue={page.description} />
              </label>
              <label>
                Page content
                <textarea
                  name="content"
                  defaultValue={page.content}
                  required
                  minLength={30}
                  rows={12}
                />
              </label>
              <label>
                Publication
                <select name="published" defaultValue={String(page.published)}>
                  <option value="false">Draft</option>
                  <option value="true">Published</option>
                </select>
              </label>
            </ActionForm>
          </section>
        ))}
      </div>
    </>
  );
}
