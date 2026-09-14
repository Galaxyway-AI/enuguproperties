import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
test("native video tools validate H.264 and strip descriptive metadata", async () => {
  const root = resolve("outputs");
  await mkdir(root, { recursive: true });
  const dir = await mkdtemp(join(root, "video-test-"));
  const run = promisify(execFile);
  try {
    assert.ok(ffmpeg);
    const input = join(dir, "input.mp4"),
      output = join(dir, "output.mp4");
    await run(
      ffmpeg,
      [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=128x128:d=1",
        "-c:v",
        "libx264",
        "-metadata",
        "title=private-test-title",
        input,
      ],
      { windowsHide: true, timeout: 30000 },
    );
    await run(
      ffmpeg,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-i",
        input,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c",
        "copy",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-movflags",
        "+faststart",
        output,
      ],
      { windowsHide: true, timeout: 30000 },
    );
    const { stdout } = await run(
      ffprobe.path,
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file",
        "-show_format",
        "-show_streams",
        "-of",
        "json",
        output,
      ],
      { windowsHide: true, timeout: 30000 },
    );
    const result = JSON.parse(stdout);
    assert.equal(result.streams[0].codec_name, "h264");
    assert.ok(Number(result.format.duration) <= 2);
    assert.equal(result.format.tags?.title, undefined);
  } finally {
    const target = resolve(dir);
    assert.ok(target.startsWith(join(root, "video-test-")));
    await rm(target, { recursive: true, force: true });
  }
});
