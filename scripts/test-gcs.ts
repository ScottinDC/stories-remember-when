import "dotenv/config";
import { getBucketName, getStorageClient } from "../server/gcs-client";
import { uploadAudioToGcs } from "../server/storage";

async function main() {
  const storage = getStorageClient();
  const bucket = getBucketName();
  const [exists] = await storage.bucket(bucket).exists();
  console.log(`Bucket "${bucket}" exists: ${exists}`);

  const uploaded = await uploadAudioToGcs({
    buffer: Buffer.from("remember-when connectivity test"),
    threadId: "connectivity-test",
    questionId: "probe",
    extension: "txt",
    contentType: "text/plain"
  });

  await storage.bucket(bucket).file(uploaded.objectName).delete();
  console.log("Upload and delete succeeded.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
