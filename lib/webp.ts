export type WebpDetails = { width: number; height: number };

function uint24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function dimensionsFromVp8(payload: Uint8Array): WebpDetails | null {
  if (
    payload.length < 10 ||
    payload[3] !== 0x9d ||
    payload[4] !== 0x01 ||
    payload[5] !== 0x2a
  )
    return null;
  return {
    width: (payload[6] | (payload[7] << 8)) & 0x3fff,
    height: (payload[8] | (payload[9] << 8)) & 0x3fff,
  };
}

function dimensionsFromVp8l(payload: Uint8Array): WebpDetails | null {
  if (payload.length < 5 || payload[0] !== 0x2f) return null;
  return {
    width: 1 + payload[1] + ((payload[2] & 0x3f) << 8),
    height:
      1 + (payload[2] >> 6) + (payload[3] << 2) + ((payload[4] & 0x0f) << 10),
  };
}

export function validateMetadataFreeWebp(bytes: Uint8Array): WebpDetails {
  if (
    bytes.length < 20 ||
    new TextDecoder("ascii").decode(bytes.subarray(0, 4)) !== "RIFF" ||
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      4,
      true,
    ) !==
      bytes.length - 8 ||
    new TextDecoder("ascii").decode(bytes.subarray(8, 12)) !== "WEBP"
  )
    throw new Error("Invalid WebP container.");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder("ascii");
  let offset = 12;
  let dimensions: WebpDetails | null = null;
  let imageChunks = 0;

  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error("Truncated WebP chunk.");
    const type = decoder.decode(bytes.subarray(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + size;
    if (end > bytes.length) throw new Error("Truncated WebP payload.");
    const payload = bytes.subarray(start, end);

    if (type === "VP8X") {
      if (payload.length !== 10 || dimensions)
        throw new Error("Invalid extended WebP header.");
      // Canvas output may include alpha and an output colour profile. Reject
      // descriptive/location metadata and animation.
      if (payload[0] & (0x08 | 0x04 | 0x02))
        throw new Error(
          "WebP descriptive metadata or animation is not allowed.",
        );
      dimensions = {
        width: 1 + uint24(payload, 4),
        height: 1 + uint24(payload, 7),
      };
    } else if (type === "VP8 ") {
      imageChunks += 1;
      dimensions ||= dimensionsFromVp8(payload);
    } else if (type === "VP8L") {
      imageChunks += 1;
      dimensions ||= dimensionsFromVp8l(payload);
    } else if (type === "ICCP") {
      if (payload.length > 1_048_576)
        throw new Error("WebP colour profile is too large.");
    } else if (type !== "ALPH") {
      throw new Error(`Unsupported WebP chunk: ${type}`);
    }

    offset = end + (size % 2);
  }

  if (offset !== bytes.length || imageChunks !== 1 || !dimensions)
    throw new Error("WebP image data is incomplete.");
  if (
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width * dimensions.height > 40_000_000
  )
    throw new Error("Image dimensions are not supported.");
  return dimensions;
}
