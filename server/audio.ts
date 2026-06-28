import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PreparedAudio = {
  buffer: Buffer;
  filename: string;
  contentType: string;
  extension: string;
};

export async function prepareAudioForUpload(buffer: Buffer, mimeType: string): Promise<PreparedAudio> {
  if (process.env.NETLIFY) {
    return {
      buffer,
      filename: mimeType.includes("mp4") ? "answer.m4a" : "answer.webm",
      contentType: mimeType || "audio/webm",
      extension: mimeType.includes("mp4") ? "m4a" : "webm"
    };
  }

  try {
    const mp3Buffer = await convertToMp3(buffer);
    return {
      buffer: mp3Buffer,
      filename: "answer.mp3",
      contentType: "audio/mpeg",
      extension: "mp3"
    };
  } catch {
    return {
      buffer,
      filename: mimeType.includes("mp4") ? "answer.m4a" : "answer.webm",
      contentType: mimeType || "audio/webm",
      extension: mimeType.includes("mp4") ? "m4a" : "webm"
    };
  }
}

async function convertToMp3(buffer: Buffer) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "remember-when-"));
  const inputPath = path.join(tmpDir, "input.audio");
  const outputPath = path.join(tmpDir, "answer.mp3");

  try {
    await writeFile(inputPath, buffer);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outputPath
    ]);
    return await readFile(outputPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
