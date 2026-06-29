import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const localEnv = join(homedir(), ".remember-when", ".env");
if (existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config();
}

import { getBucketName, getStorageClient } from "../server/gcs-client";
import { getOrCreateDefaultThread } from "../server/db";

async function main() {
  const storage = getStorageClient();
  const bucket = getBucketName();
  const [exists] = await storage.bucket(bucket).exists();
  console.log(`GCS bucket "${bucket}": ${exists ? "connected" : "missing"}`);

  const interview = await getOrCreateDefaultThread();
  console.log(`Interview loaded: ${interview.nodes.length} questions`);

  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY: not set (recording save will fail until added)");
  } else {
    console.log("OPENAI_API_KEY: set");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
