import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { approvedLegalDocuments } from "../lib/legal-documents.generated";

test("approved legal source files match their published immutable snapshots", async () => {
  for (const document of Object.values(approvedLegalDocuments)) {
    const source = (await readFile(`content/legal/${document.sourceFile}`, "utf8"))
      .replaceAll("\r\n", "\n");
    assert.equal(source, document.markdown);
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      document.sha256,
    );
    const commissionVersion = document.kind === "seller" || document.kind === "terms";
    assert.equal(document.version, commissionVersion ? "2026-10-13" : "2026-09-14");
    assert.match(source, commissionVersion ? /13 October 2026/ : /14 September 2026/);
  }
});
