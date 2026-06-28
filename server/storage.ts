import { randomUUID } from "node:crypto";
import { getBucketName, getStorageClient } from "./gcs-client";

export async function readJsonFromGcs<T>(objectName: string): Promise<T | null> {
  const storage = getStorageClient();
  const file = storage.bucket(getBucketName()).file(objectName);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    const [contents] = await file.download();
    return JSON.parse(contents.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeJsonToGcs(objectName: string, value: unknown) {
  const storage = getStorageClient();
  const file = storage.bucket(getBucketName()).file(objectName);
  await file.save(JSON.stringify(value, null, 2), {
    resumable: false,
    contentType: "application/json"
  });
}

export async function uploadAudioToGcs(input: {
  buffer: Buffer;
  threadId: string;
  questionId: string;
  extension?: string;
  contentType?: string;
}) {
  const extension = input.extension ?? "webm";
  const contentType = input.contentType ?? "audio/webm";
  const storage = getStorageClient();
  const objectName = `threads/${input.threadId}/${input.questionId}/${Date.now()}-${randomUUID()}.${extension}`;
  const file = storage.bucket(getBucketName()).file(objectName);

  await file.save(input.buffer, {
    resumable: false,
    contentType,
    metadata: {
      metadata: {
        threadId: input.threadId,
        questionId: input.questionId
      }
    },
    preconditionOpts: {
      ifGenerationMatch: 0
    }
  });

  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365
  });

  return {
    objectName,
    url: signedUrl
  };
}
