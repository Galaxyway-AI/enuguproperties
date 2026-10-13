import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const sizes = [16, 32, 48, 96];
const images = await Promise.all(
  sizes.map((size) =>
    sharp("app/icon.png")
      .resize(size, size)
      .png()
      .toBuffer(),
  ),
);

const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);

let offset = directory.length;
for (const [index, image] of images.entries()) {
  const entry = 6 + index * 16;
  directory.writeUInt8(sizes[index], entry);
  directory.writeUInt8(sizes[index], entry + 1);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
}

await writeFile("public/favicon.ico", Buffer.concat([directory, ...images]));
