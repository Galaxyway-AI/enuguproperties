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
            author: "Enugu Properties Editorial Team",
            seo_title: "",
            meta_description: "",
            social_image: "",
            indexable: true,
            canonical_override: "",
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
                Author or editorial team
                <input name="author" defaultValue={page.author || "Enugu Properties Editorial Team"} required minLength={2} maxLength={120} />
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
              <div className="form-grid">
                <label>
                  SEO title override
                  <input name="seo_title" defaultValue={page.seo_title || ""} maxLength={160} placeholder="Leave blank to use the page title" />
                </label>
                <label>
                  Meta description override
                  <textarea name="meta_description" defaultValue={page.meta_description || ""} maxLength={320} placeholder="Leave blank to use the introduction" />
                </label>
                <label>
                  Social image URL
                  <input name="social_image" type="url" defaultValue={page.social_image || ""} maxLength={500} />
                </label>
                <label>
                  Search indexing
                  <select name="indexable" defaultValue={String(page.indexable ?? true)}><option value="true">Index</option><option value="false">Noindex</option></select>
                </label>
              </div>
              <label>
                Canonical override
                <input name="canonical_override" type="url" defaultValue={page.canonical_override || ""} placeholder="Normally leave blank" />
              </label>
              <div className="seo-preview panel">
                <strong>Search preview</strong>
                <span>{page.seo_title || page.title || "Page title"} | Enugu Properties</span>
                <small>enuguproperties.com/{page.slug || "page-slug"}</small>
                <p>{page.meta_description || page.description || "The page introduction will be used as the search description."}</p>
              </div>
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
