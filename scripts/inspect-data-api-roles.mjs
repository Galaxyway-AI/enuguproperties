import pg from "pg";

const requiredHost = "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (new URL(process.env.DATABASE_URL).hostname !== requiredHost)
  throw new Error("Refusing inspection: this is not the confirmed staging endpoint");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows: roles } = await client.query(`
    select rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolbypassrls
    from pg_roles
    where rolname in ('anon', 'anonymous', 'authenticated', 'service_role', 'anonymous_legacy', 'authenticated_legacy')
    order by rolname
  `);
  const { rows: memberships } = await client.query(`
    select member.rolname member, granted.rolname granted_role
    from pg_auth_members membership
    join pg_roles member on member.oid = membership.member
    join pg_roles granted on granted.oid = membership.roleid
    where member.rolname in ('anonymous', 'authenticated')
       or granted.rolname in ('anonymous_legacy', 'authenticated_legacy')
    order by member.rolname, granted.rolname
  `);
  const { rows: policies } = await client.query(`
    select role_name, count(*)::int policy_count
    from pg_policies, unnest(roles) role_name
    where role_name in ('anonymous', 'authenticated', 'anonymous_legacy', 'authenticated_legacy')
    group by role_name
    order by role_name
  `);
  const { rows: authSchemas } = await client.query(`
    select namespace.nspname schema_name,
           pg_get_userbyid(namespace.nspowner) owner,
           namespace.nspacl acl,
           coalesce(jsonb_agg(procedure.proname order by procedure.proname)
             filter (where procedure.proname is not null), '[]'::jsonb) functions
    from pg_namespace namespace
    left join pg_proc procedure on procedure.pronamespace = namespace.oid
    where namespace.nspname in ('auth', 'app_auth')
    group by namespace.nspname, namespace.nspowner, namespace.nspacl
    order by namespace.nspname
  `);
  const { rows: privileges } = await client.query(`
    select role_name, object_name,
      has_table_privilege(role_name, 'public.' || object_name, 'select') can_select
    from unnest(array['anonymous','authenticated','anonymous_legacy','authenticated_legacy']) role_name
    cross join unnest(array['public_properties','locations','profiles','property_private','property_documents','schema_migrations']) object_name
    where to_regclass('public.' || object_name) is not null
    order by role_name, object_name
  `);
  const { rows: schemaPrivileges } = await client.query(`
    select role_name, schema_name, has_schema_privilege(role_name, schema_name, 'usage') can_use
    from unnest(array['anonymous','authenticated','anonymous_legacy','authenticated_legacy']) role_name
    cross join unnest(array['auth','app_auth','public']) schema_name
    order by role_name, schema_name
  `);
  const { rows: rls } = await client.query(`
    select class.relname object_name, class.relrowsecurity rls_enabled
    from pg_class class
    join pg_namespace namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname in ('schema_migrations', 'profiles', 'property_private', 'property_documents')
    order by class.relname
  `);
  console.log(
    JSON.stringify(
      { roles, memberships, policies, authSchemas, privileges, schemaPrivileges, rls },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
