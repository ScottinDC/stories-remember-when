import { Storage } from "@google-cloud/storage";
import { readFileSync } from "node:fs";
import { readRuntimeEnv } from "./runtime-env";

let cachedClient: Storage | null = null;

export function getStorageClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const serviceAccountJson = readRuntimeEnv("GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON");
  const credentialsPath = readRuntimeEnv("GOOGLE_APPLICATION_CREDENTIALS");

  if (serviceAccountJson) {
    const credentials = JSON.parse(serviceAccountJson);
    cachedClient = new Storage({
      projectId: readRuntimeEnv("GOOGLE_CLOUD_PROJECT") ?? credentials.project_id,
      credentials
    });
    return cachedClient;
  }

  if (credentialsPath) {
    const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
    cachedClient = new Storage({
      projectId: readRuntimeEnv("GOOGLE_CLOUD_PROJECT") ?? credentials.project_id,
      credentials
    });
    return cachedClient;
  }

  cachedClient = new Storage({
    projectId: readRuntimeEnv("GOOGLE_CLOUD_PROJECT")
  });
  return cachedClient;
}

export function getBucketName() {
  const bucketName = readRuntimeEnv("GOOGLE_CLOUD_STORAGE_BUCKET");
  if (!bucketName) {
    throw new Error("GOOGLE_CLOUD_STORAGE_BUCKET is not configured.");
  }
  return bucketName;
}
