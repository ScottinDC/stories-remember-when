import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

function createStorageClient() {
  const serviceAccountJson = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson);
    return new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT ?? credentials.project_id,
      credentials
    });
  }

  return new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT
  });
}

export async function uploadAudioToGcs(input: {
  buffer: Buffer;
  threadId: string;
  questionId: string;
}) {
  if (!bucketName) {
    throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET is not configured.");
  }

  const storage = createStorageClient();
  const objectName = `threads/${input.threadId}/${input.questionId}/${Date.now()}-${randomUUID()}.mp3`;
  const file = storage.bucket(bucketName).file(objectName);

  await file.save(input.buffer, {
    resumable: false,
    contentType: "audio/mpeg",
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
