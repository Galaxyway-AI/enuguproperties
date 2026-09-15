import test from "node:test";
import assert from "node:assert/strict";
import {
  createEvidenceToken,
  verifyEvidenceToken,
} from "../lib/signed-media-core";

test("private evidence tokens bind document, user, expiry and signature", () => {
  const previous = process.env.MEDIA_SIGNING_SECRET;
  process.env.MEDIA_SIGNING_SECRET = "test-secret-with-at-least-thirty-two-characters";
  try {
    const token = createEvidenceToken("document-a", "user-a", 60);
    assert.equal(verifyEvidenceToken(token, "document-a", "user-a"), true);
    assert.equal(verifyEvidenceToken(token, "document-b", "user-a"), false);
    assert.equal(verifyEvidenceToken(token, "document-a", "user-b"), false);
    assert.equal(verifyEvidenceToken(`${token.slice(0, -1)}x`, "document-a", "user-a"), false);
    assert.equal(
      verifyEvidenceToken(
        createEvidenceToken("document-a", "user-a", -1),
        "document-a",
        "user-a",
      ),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.MEDIA_SIGNING_SECRET;
    else process.env.MEDIA_SIGNING_SECRET = previous;
  }
});
