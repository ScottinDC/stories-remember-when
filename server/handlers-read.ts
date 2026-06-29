import { authConfig } from "./auth";
import { storageConfig } from "./runtime-env";
import { readJsonFromGcs } from "./storage";
import { getOrCreateDefaultThread } from "./store-gcs";

const CACHE_TTL_MS = 15_000;
let cachedInterview: { value: Awaited<ReturnType<typeof getOrCreateDefaultThread>>; at: number } | null = null;

export async function handleHealth() {
  const storage = storageConfig();
  let storageReachable = false;
  let storageError: string | undefined;

  if (storage.storageConfigured) {
    try {
      await readJsonFromGcs("app/interview-state.json");
      storageReachable = true;
    } catch (error) {
      storageError = error instanceof Error ? error.message : "Could not reach cloud storage.";
    }
  }

  return {
    ok: true,
    ...authConfig(),
    ...storage,
    storageReachable,
    storageError
  };
}

export async function handleGetInterview() {
  if (cachedInterview && Date.now() - cachedInterview.at < CACHE_TTL_MS) {
    return cachedInterview.value;
  }

  const value = await getOrCreateDefaultThread();
  cachedInterview = { value, at: Date.now() };
  return value;
}
