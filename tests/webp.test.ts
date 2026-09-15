import assert from "node:assert/strict";
import test from "node:test";
import { validateMetadataFreeWebp } from "../lib/webp";

function chunk(type: string, payload: number[]) {
  const result = Buffer.alloc(8 + payload.length + (payload.length % 2));
  result.write(type, 0, "ascii");
  result.writeUInt32LE(payload.length, 4);
  Buffer.from(payload).copy(result, 8);
  return result;
}

function webp(...chunks: Buffer[]) {
  const body = Buffer.concat([Buffer.from("WEBP"), ...chunks]);
  const result = Buffer.alloc(8 + body.length);
  result.write("RIFF", 0, "ascii");
  result.writeUInt32LE(body.length, 4);
  body.copy(result, 8);
  return result;
}

test("accepts one metadata-free WebP image", () => {
  const image = webp(
    chunk("VP8X", [0, 0, 0, 0, 99, 0, 0, 49, 0, 0]),
    chunk("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 100, 0, 50, 0]),
  );
  assert.deepEqual(validateMetadataFreeWebp(image), { width: 100, height: 50 });
});

test("rejects WebP metadata and animation", () => {
  for (const flag of [0x20, 0x08, 0x04, 0x02]) {
    const image = webp(
      chunk("VP8X", [flag, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      chunk("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0]),
    );
    assert.throws(() => validateMetadataFreeWebp(image));
  }
});

test("rejects trailing or unrecognised data", () => {
  const image = webp(
    chunk("VP8 ", [0, 0, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0]),
    chunk("EXIF", [1, 2, 3]),
  );
  assert.throws(() => validateMetadataFreeWebp(image));
  assert.throws(() =>
    validateMetadataFreeWebp(Buffer.concat([image, Buffer.from("x")])),
  );
});
