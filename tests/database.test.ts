import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL trust boundaries and lifecycle", async (t) => {
  const sql = new PGlite();
  await sql.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1'))$$;
 grant usage on schema auth to anon,authenticated,service_role; grant execute on all functions in schema auth to anon,authenticated,service_role;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  for (const f of [
    "0001_foundation.sql",
    "0002_workflows.sql",
    "0003_storage.sql",
    "0004_operations.sql",
    "0005_release_controls.sql",
    "0006_property_details.sql",
    "0007_beta_operations.sql",
    "0012_registration_activation.sql",
    "0013_staff_access.sql",
  ]) {
    const migration = (
      await readFile(`supabase/migrations/${f}`, "utf8")
    ).replace("create extension if not exists pgcrypto;", "");
    await sql.exec(migration);
  }
  await sql.exec(await readFile("supabase/seed.sql", "utf8"));
  await sql.exec(
    `grant usage on schema public to anon,authenticated,service_role; grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;`,
  );
  const seller = "10000000-0000-4000-8000-000000000001",
    other = "10000000-0000-4000-8000-000000000002",
    staff = "10000000-0000-4000-8000-000000000003",
    buyer = "10000000-0000-4000-8000-000000000004";
  await sql.exec(
    `insert into auth.users(id) values('${seller}'),('${other}'),('${staff}'),('${buyer}'); update public.profiles set full_name='Test account',phone='+234000000000'; insert into public.user_roles values('${staff}','super_admin');`,
  );
  await t.test("only assigned staff receive staff permissions", async () => {
    await sql.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${staff}',false); select set_config('request.jwt.claim.aal','aal1',false);`,
    );
    assert.ok(
      (await sql.query("select public.my_permissions() permission")).rows
        .length > 0,
    );
    await sql.exec(
      `select set_config('request.jwt.claim.sub','${seller}',false);`,
    );
    assert.deepEqual(
      (await sql.query("select public.my_permissions() permission")).rows,
      [],
    );
    await sql.exec("reset role");
  });
  await t.test(
    "registration records profile details and immutable legal versions",
    async () => {
      await sql.exec(`
        insert into public.agreement_versions(kind,version,content,sha256,legal_approved,active)
        values
          ('terms','registration-test','Terms','terms-hash',true,true),
          ('privacy','registration-test','Privacy','privacy-hash',true,true);
        select app_private.complete_registration(
          '${other}','Ada Okafor','+2348012345678','agent'
        );
      `);
      const profile = (
        await sql.query<{
          full_name: string;
          phone: string;
          seller_type: string;
        }>(
          "select full_name,phone,seller_type from public.profiles where id=$1",
          [other],
        )
      ).rows[0];
      assert.deepEqual(profile, {
        full_name: "Ada Okafor",
        phone: "+2348012345678",
        seller_type: "agent",
      });
      assert.equal(
        (
          await sql.query(
            "select id from public.agreement_acceptances where user_id=$1 and property_id is null",
            [other],
          )
        ).rows.length,
        2,
      );
      assert.equal(
        (
          await sql.query(
            "select id from public.audit_logs where actor_id=$1 and action='account_registered'",
            [other],
          )
        ).rows.length,
        1,
      );
    },
  );
  async function as(id: string, aal = "aal1", role = "authenticated") {
    await sql.exec(
      `reset role; set request.jwt.claim.sub='${id}';set request.jwt.claim.aal='${aal}';set role ${role};`,
    );
  }
  const area = (
    await sql.query<{ id: string }>(
      `select id from public.locations where slug='emene'`,
    )
  ).rows[0].id;
  const payload = {
    title: "Test residential land",
    category: "land",
    property_type: "residential-land",
    location_id: area,
    description:
      "A sufficiently detailed and factual test property description for moderation.",
    price_minor: 1800000000,
    land_sqm: 500,
    ownership: "owner",
    address: "Private test street",
    latitude: "6.4",
    longitude: "7.5",
    features: [],
    negotiable: true,
    details: {
      intended_use: "residential",
      topography: "level",
      fenced: true,
      development_status: "serviced",
      road_access: "paved",
    },
  };
  await as(seller);
  const property = (
    await sql.query<{ id: string }>(
      "select public.save_property(null,$1::jsonb) id",
      [JSON.stringify(payload)],
    )
  ).rows[0].id;
  await t.test(
    "property category and structured details are validated in PostgreSQL",
    async () => {
      await as(seller);
      await assert.rejects(
        sql.query("select public.save_property(null,$1::jsonb)", [
          JSON.stringify({
            ...payload,
            title: "Invalid category combination",
            property_type: "detached-house",
          }),
        ]),
      );
      await assert.rejects(
        sql.query("select public.save_property(null,$1::jsonb)", [
          JSON.stringify({
            ...payload,
            title: "Invalid structured details",
            details: { ...payload.details, topography: "unknown" },
          }),
        ]),
      );
    },
  );
  await t.test(
    "draft owner cannot directly publish, feature, verify or self-assign a role",
    async () => {
      await assert.rejects(
        sql.exec(
          `update public.properties set status='live' where id='${property}'`,
        ),
      );
      await assert.rejects(
        sql.exec(
          `insert into public.user_roles values('${seller}','super_admin')`,
        ),
      );
      await assert.rejects(
        sql.query("select public.moderate_property($1,$2,$3)", [
          property,
          "live",
          "Approve this",
        ]),
      );
      await assert.rejects(
        sql.query(
          "select public.feature_property($1,now(),now()+interval '7 days')",
          [property],
        ),
      );
      await assert.rejects(
        sql.query(
          "select public.record_verification($1,'documents','completed','Bad verification attempt','No evidence',null,null,null)",
          [property],
        ),
      );
    },
  );
  await t.test(
    "other seller cannot read private property or update draft",
    async () => {
      await as(other);
      assert.equal(
        (
          await sql.query("select * from public.properties where id=$1", [
            property,
          ])
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await sql.query(
            "select * from public.property_private where property_id=$1",
            [property],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        sql.query("select public.save_property($1,$2::jsonb)", [
          property,
          JSON.stringify(payload),
        ]),
      );
    },
  );
  await t.test(
    "only assigned compliance staff can classify beta participants",
    async () => {
      await as(seller);
      await assert.rejects(
        sql.query(
          "select public.set_beta_participant($1,true,'beta_customer','Seller cannot grant beta access')",
          [other],
        ),
      );
      await as(staff);
      await sql.query(
        "select public.set_beta_participant($1,true,'beta_customer','Approved for controlled beta onboarding')",
        [other],
      );
      const profile = (
        await sql.query<{ beta_participant: boolean; beta_kind: string }>(
          "select beta_participant,beta_kind from public.profiles where id=$1",
          [other],
        )
      ).rows[0];
      assert.equal(profile.beta_participant, true);
      assert.equal(profile.beta_kind, "beta_customer");
    },
  );
  const path = `${seller}/${property}/test.webp`;
  await as("", "aal1", "service_role");
  const document = (
    await sql.query<{ id: string }>(
      `select public.attach_upload($1,$2,$3,'document','authority','Authority.webp','image/webp',100,'testhash') id`,
      [property, seller, path],
    )
  ).rows[0].id;
  await t.test(
    "quarantined evidence cannot support a completed verification",
    async () => {
      await as(staff, "aal2");
      await assert.rejects(
        sql.query(
          `select public.record_verification($1,'authority','completed','Marketing authority evidence reviewed','Supporting authority document reviewed by staff',$2,null,null)`,
          [property, document],
        ),
      );
      await as("", "aal1", "service_role");
    },
  );
  await sql.query(
    "select public.set_document_scan_status($1,'clean','test-scanner')",
    [document],
  );
  await as(staff, "aal2");
  await assert.rejects(
    sql.query(
      `select public.record_verification($1,'legal','completed','Premature legal review','Feature is not operational',$2,null,null)`,
      [property, document],
    ),
  );
  await as("", "aal1", "service_role");
  await sql.query(
    `select public.attach_upload($1,$2,$3,'image',null,'Photograph','image/webp',100,'hash')`,
    [property, seller, path + "image"],
  );
  await t.test(
    "private evidence is invisible to a buyer and unrelated seller",
    async () => {
      for (const id of [buyer, other]) {
        await as(id);
        assert.equal(
          (await sql.query("select * from public.property_documents")).rows
            .length,
          0,
        );
      }
    },
  );
  await t.test(
    "plan photo limits are enforced inside the locked database mutation",
    async () => {
      await as("", "aal1", "service_role");
      for (let i = 0; i < 3; i++)
        await sql.query(
          `select public.attach_upload($1,$2,$3,'image',null,'Photo','image/webp',100,'hash')`,
          [property, seller, path + i],
        );
      await assert.rejects(
        sql.query(
          `select public.attach_upload($1,$2,$3,'image',null,'Photo','image/webp',100,'hash')`,
          [property, seller, path + "excess"],
        ),
      );
    },
  );
  await t.test(
    "submission is blocked without approved legal agreement",
    async () => {
      await as(seller);
      await assert.rejects(
        sql.query("select public.submit_property($1,$2)", [property, other]),
      );
    },
  );
  await sql.exec("reset role");
  const agreement = (
    await sql.query<{ id: string }>(
      `insert into public.agreement_versions(kind,version,content,sha256,legal_approved,active) values('seller','test-only','Test agreement only','testhash',true,true) returning id`,
    )
  ).rows[0].id;
  await as(seller);
  await sql.query("select public.submit_property($1,$2)", [
    property,
    agreement,
  ]);
  await t.test(
    "assigned staff can approve a listing through review",
    async () => {
      await as(staff);
      await sql.query(
        "select public.moderate_property($1,'under_review','Checking evidence')",
        [property],
      );
      await sql.query(
        "select public.moderate_property($1,'live','Reviewed supplied listing evidence')",
        [property],
      );
    },
  );
  await t.test(
    "public projection excludes precise location and account identity",
    async () => {
      await as("", "aal1", "anon");
      const row = (
        await sql.query<Row>(
          "select * from public.public_properties where id=$1",
          [property],
        )
      ).rows[0];
      assert.ok(row);
      for (const key of [
        "seller_id",
        "latitude",
        "longitude",
        "address",
        "internal_notes",
        "title_type",
      ])
        assert.equal(key in row, false);
      assert.equal(row.property_type, "residential-land");
      assert.equal(row.negotiable, true);
      assert.deepEqual(row.details, {
        intended_use: "residential",
        topography: "level",
        fenced: true,
        development_status: "serviced",
        road_access: "paved",
      });
      await assert.rejects(sql.query("select * from public.property_private"));
    },
  );
  await t.test(
    "site badge cannot be granted without a completed inspection",
    async () => {
      await as(staff, "aal2");
      await assert.rejects(
        sql.query(
          `select public.record_verification($1,'site','completed','Physical inspection completed today','Detailed evidence review performed today',$2,null,null)`,
          [property, document],
        ),
      );
    },
  );
  await t.test(
    "material edit preserves revision, withdraws public listing and expires checks",
    async () => {
      await as(staff, "aal2");
      await sql.query(
        `select public.record_verification($1,'authority','completed','Marketing authority evidence reviewed','Supporting authority document reviewed by staff',$2,null,null)`,
        [property, document],
      );
      await as(seller);
      await sql.query("select public.save_property($1,$2::jsonb)", [
        property,
        JSON.stringify({ ...payload, price_minor: 1750000000 }),
      ]);
      assert.equal(
        (
          await sql.query<{ status: string }>(
            "select status from public.properties where id=$1",
            [property],
          )
        ).rows[0].status,
        "under_review",
      );
      await as(staff, "aal2");
      assert.equal(
        (
          await sql.query<{ status: string }>(
            "select status from public.property_verifications where property_id=$1",
            [property],
          )
        ).rows[0].status,
        "expired",
      );
      assert.equal(
        (
          await sql.query(
            "select * from public.property_revisions where property_id=$1",
            [property],
          )
        ).rows.length,
        1,
      );
      await as("", "aal1", "anon");
      assert.equal(
        (
          await sql.query(
            "select * from public.public_properties where id=$1",
            [property],
          )
        ).rows.length,
        0,
      );
    },
  );
  await t.test(
    "payment fulfilment is server-only, amount checked and idempotent",
    async () => {
      await as(seller);
      const second = (
        await sql.query<{ id: string }>(
          "select public.save_property(null,$1::jsonb) id",
          [JSON.stringify({ ...payload, title: "Second test property" })],
        )
      ).rows[0].id;
      await sql.query("select public.select_plan($1,'plus')", [second]);
      const order = (
        await sql.query<{ reference: string }>(
          "select (public.create_order($1)).*",
          [second],
        )
      ).rows[0];
      await assert.rejects(
        sql.query(
          `select public.fulfil_payment($1,'provider-1',500000,'NGN')`,
          [order.reference],
        ),
      );
      await as("", "aal1", "service_role");
      await assert.rejects(
        sql.query(`select public.fulfil_payment($1,'provider-1',1,'NGN')`, [
          order.reference,
        ]),
      );
      await sql.query(
        `select public.fulfil_payment($1,'provider-1',500000,'NGN')`,
        [order.reference],
      );
      await sql.query(
        `select public.fulfil_payment($1,'provider-1',500000,'NGN')`,
        [order.reference],
      );
      assert.equal(
        (
          await sql.query<{ status: string }>(
            "select status from public.properties where id=$1",
            [second],
          )
        ).rows[0].status,
        "draft",
      );
      assert.equal(
        (
          await sql.query(
            `select * from public.audit_logs where action='payment_paid'`,
          )
        ).rows.length,
        1,
      );
    },
  );
  await t.test(
    "rate limits are persistent and expiry job is idempotent",
    async () => {
      await as("", "aal1", "service_role");
      assert.equal(
        (
          await sql.query<{ allowed: boolean }>(
            `select public.consume_rate_limit('test',1,60) allowed`,
          )
        ).rows[0].allowed,
        true,
      );
      assert.equal(
        (
          await sql.query<{ allowed: boolean }>(
            `select public.consume_rate_limit('test',1,60) allowed`,
          )
        ).rows[0].allowed,
        false,
      );
      await sql.exec(
        `update public.properties set status='live',expires_at=now()-interval '1 day' where id='${property}'`,
      );
      assert.equal(
        (await sql.query<{ n: number }>("select public.run_maintenance() n"))
          .rows[0].n,
        1,
      );
      assert.equal(
        (await sql.query<{ n: number }>("select public.run_maintenance() n"))
          .rows[0].n,
        0,
      );
    },
  );
  await t.test(
    "buyer enquiry, inspection evidence and site verification form a recorded chain",
    async () => {
      await as("", "aal1", "service_role");
      await sql.query(
        "update public.properties set status='live',expires_at=now()+interval '30 days' where id=$1",
        [property],
      );
      await as(buyer);
      await sql.query("select public.buyer_action($1,'enquire',$2::jsonb)", [
        property,
        JSON.stringify({ message: "I would like to inspect this property." }),
      ]);
      const inspection = (
        await sql.query<{ id: string }>(
          "select public.buyer_action($1,'inspection',$2::jsonb) id",
          [
            property,
            JSON.stringify({
              preferred_at: new Date(Date.now() + 86400000).toISOString(),
              attendees: 1,
              message: "Please arrange an inspection.",
            }),
          ],
        )
      ).rows[0].id;
      await as(staff, "aal2");
      await sql.query(
        "select public.manage_inspection($1,'confirmed',$2,null,'',null)",
        [inspection, staff],
      );
      await assert.rejects(
        sql.query(
          "select public.manage_inspection($1,'completed',null,null,'Detailed physical inspection observations from today',$2)",
          [inspection, document],
        ),
      );
      await as("", "aal1", "service_role");
      const evidence = (
        await sql.query<{ id: string }>(
          "select public.attach_staff_evidence($1,$2,'staff/inspection.webp','inspection','Inspection.webp','image/webp','hash') id",
          [property, staff],
        )
      ).rows[0].id;
      await sql.query(
        "select public.set_document_scan_status($1,'clean','test-scanner')",
        [evidence],
      );
      await as(staff, "aal2");
      await sql.query(
        "select public.manage_inspection($1,'completed',null,null,'Detailed physical inspection observations from today',$2)",
        [inspection, evidence],
      );
      await sql.query(
        "select public.record_verification($1,'site','completed','A recorded physical inspection was completed','Staff reviewed the inspection evidence and observations',$2,null,null)",
        [property, evidence],
      );
      await as("", "aal1", "anon");
      const checks = (
        await sql.query<{ checks: { type: string }[] }>(
          "select checks from public.public_properties where id=$1",
          [property],
        )
      ).rows[0].checks;
      assert.ok(checks.some((c) => c.type === "site"));
    },
  );
  await t.test(
    "transaction stages cannot be skipped and completion calculates agreed commission",
    async () => {
      await as(staff, "aal2");
      const transaction = (
        await sql.query<{ id: string }>(
          "select public.manage_transaction(null,$1,$2,'buyer_qualified','Recorded introduction reviewed by staff',null) id",
          [property, buyer],
        )
      ).rows[0].id;
      await assert.rejects(
        sql.query(
          "select public.manage_transaction($1,null,null,'completed','Attempt to skip professional review',2000000000)",
          [transaction],
        ),
      );
      for (const stage of [
        "offer_submitted",
        "offer_accepted",
        "verification_pending",
        "due_diligence",
        "professional_review",
        "contract_stage",
        "awaiting_completion",
        "completed",
      ])
        await sql.query(
          "select public.manage_transaction($1,null,null,$2,$3,$4)",
          [
            transaction,
            stage,
            "Recorded milestone: " + stage,
            stage === "completed" ? 2000000000 : null,
          ],
        );
      const fee = (
        await sql.query<{ amount_minor: number }>(
          "select amount_minor from public.commissions where transaction_id=$1",
          [transaction],
        )
      ).rows[0];
      assert.equal(fee.amount_minor, 40000000);
      await assert.rejects(
        sql.query(
          "select public.manage_transaction($1,null,null,'completed','Attempted duplicate completion',2000000000)",
          [transaction],
        ),
      );
    },
  );
  await t.test(
    "historical audit, accepted agreements and offers cannot be overwritten",
    async () => {
      await as("", "aal1", "service_role");
      await assert.rejects(
        sql.exec("update public.audit_logs set action='rewritten'"),
      );
      await assert.rejects(
        sql.exec("delete from public.agreement_acceptances"),
      );
      await assert.rejects(
        sql.exec(
          "update public.agreement_versions set content='Rewritten terms'",
        ),
      );
    },
  );
  await t.test(
    "video reservations enforce plan allowance and duration before publication",
    async () => {
      await as(seller);
      const videoProperty = (
        await sql.query<{ id: string }>(
          "select public.save_property(null,$1::jsonb) id",
          [JSON.stringify({ ...payload, title: "Video validation example" })],
        )
      ).rows[0].id;
      await sql.query("select public.select_plan($1,'plus')", [videoProperty]);
      await as("", "aal1", "service_role");
      const upload = (
        await sql.query<{ id: string }>(
          "select public.reserve_video($1,$2,'video/quarantine.mp4',100) id",
          [videoProperty, seller],
        )
      ).rows[0].id;
      await assert.rejects(
        sql.query("select public.reserve_video($1,$2,'video/excess.mp4',100)", [
          videoProperty,
          seller,
        ]),
      );
      await sql.query(
        "update public.video_uploads set status='processing' where id=$1",
        [upload],
      );
      await assert.rejects(
        sql.query("select public.finish_video($1,'video/final.mp4',100,121)", [
          upload,
        ]),
      );
      await sql.query(
        "select public.finish_video($1,'video/final.mp4',100,60)",
        [upload],
      );
      assert.equal(
        (
          await sql.query(
            "select * from public.property_media where property_id=$1 and kind='video'",
            [videoProperty],
          )
        ).rows.length,
        1,
      );
    },
  );
  await t.test(
    "anonymous pricing still works when a plan is disabled",
    async () => {
      await as("", "aal1", "service_role");
      await sql.exec(
        "update public.listing_plans set active=false where id='premium'",
      );
      await as("", "aal1", "anon");
      const rows = (await sql.query("select * from public.listing_plans")).rows;
      assert.equal(rows.length, 2);
    },
  );
  await t.test(
    "a buyer can remove a saved property after it is sold",
    async () => {
      await as("", "aal1", "service_role");
      await sql.query(
        "insert into public.saved_properties(user_id,property_id) values($1,$2)",
        [buyer, property],
      );
      await as(buyer);
      await sql.query("select public.buyer_action($1,'save','{}')", [property]);
      assert.equal(
        (
          await sql.query(
            "select * from public.saved_properties where property_id=$1",
            [property],
          )
        ).rows.length,
        0,
      );
    },
  );
  await sql.close();
});
type Row = Record<string, unknown>;
