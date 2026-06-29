import { Storage } from "@google-cloud/storage";
import { readFileSync } from "node:fs";
import { readRuntimeEnv } from "./runtime-env";

let cachedClient: Storage | null = null;

type ServiceAccountCredentials = {
  project_id?: string;
  private_key?: string;
  client_email?: string;
};

function normalizePrivateKey(credentials: ServiceAccountCredentials) {
  if (!credentials.private_key?.includes("\\n")) {
    return credentials;
  }
  return {
    ...credentials,
    private_key: credentials.private_key.replace(/\\n/g, "\n")
  };
}

function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(raw.replace(/\\n/g, "\n"));
  }

  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  return normalizePrivateKey(parsed as ServiceAccountCredentials);
}

export function getStorageClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const serviceAccountJson = readRuntimeEnv("GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON");
  const credentialsPath = readRuntimeEnv("GOOGLE_APPLICATION_CREDENTIALS");

  if (serviceAccountJson) {
    const credentials = parseServiceAccountJson(serviceAccountJson);
    cachedClient = new Storage({
      projectId: readRuntimeEnv("GOOGLE_CLOUD_PROJECT") ?? credentials.project_id,
      credentials
    });
    return cachedClient;
  }

  if (credentialsPath) {
    const credentials = normalizePrivateKey(
      JSON.parse(readFileSync(credentialsPath, "utf8")) as ServiceAccountCredentials
    );
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
