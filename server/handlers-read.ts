import { authConfig } from "./auth";
import { storageConfig } from "./runtime-env";
import { readJsonFromGcs } from "./storage";
import { getOrCreateDefaultThread } from "./db";

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
  return getOrCreateDefaultThread();
}
