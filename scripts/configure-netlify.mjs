import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const configPath = join(homedir(), "Library/Preferences/netlify/config.json");
const netlifyConfig = JSON.parse(readFileSync(configPath, "utf8"));
const token = Object.values(netlifyConfig.users)[0].auth.token;

const rememberWhenDir = join(homedir(), ".remember-when");
const serviceAccountCandidates = [
  join(rememberWhenDir, "service-account.json"),
  join(process.cwd(), ".secrets/remember-when-uploader.json")
];
const serviceAccountPath = serviceAccountCandidates.find((path) => {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
});
if (!serviceAccountPath) {
  throw new Error(
    `Could not read service account from ${serviceAccountCandidates.join(" or ")}`
  );
}
const serviceAccountJson = readFileSync(serviceAccountPath, "utf8");

function parseEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index === -1) {
      continue;
    }
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return values;
}

const envCandidates = [join(rememberWhenDir, ".env"), join(process.cwd(), ".env")];
const localEnv = (() => {
  for (const path of envCandidates) {
    try {
      return parseEnvFile(path);
    } catch {
      continue;
    }
  }
  return {};
})();

const envVars = {
  DATABASE_BACKEND: "gcs",
  OPENAI_MODEL: localEnv.OPENAI_MODEL || "gpt-4.1-mini",
  OPENAI_TRANSCRIPTION_MODEL: localEnv.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
  GOOGLE_CLOUD_PROJECT: localEnv.GOOGLE_CLOUD_PROJECT || "remember-when-500816",
  GOOGLE_CLOUD_STORAGE_BUCKET: localEnv.GOOGLE_CLOUD_STORAGE_BUCKET || "remember-when-500816-audio",
  GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON: serviceAccountJson,
  SECRETS_SCAN_ENABLED: "false",
  SECRETS_SCAN_OMIT_KEYS: "GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON,OPENAI_API_KEY"
};

if (localEnv.OPENAI_API_KEY) {
  envVars.OPENAI_API_KEY = localEnv.OPENAI_API_KEY;
}

if (localEnv.ALLOWED_EMAILS) {
  envVars.ALLOWED_EMAILS = localEnv.ALLOWED_EMAILS;
}

const scopes = ["builds", "functions", "runtime", "post_processing"];
const contexts = ["production", "deploy-preview", "branch-deploy", "dev"];

function buildValues(value) {
  return contexts.map((context) => ({ context, value }));
}

async function netlifyRequest(path, options = {}) {
  const response = await fetch(`https://api.netlify.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

async function upsertEnvVar(accountId, siteId, key, value) {
  const isSecret = key.includes("KEY") || key.includes("JSON") || key.includes("SECRET");
  const payload = {
    key,
    scopes: isSecret ? ["builds", "functions", "runtime"] : scopes,
    is_secret: isSecret,
    values: buildValues(value)
  };

  const existing = await netlifyRequest(`/api/v1/accounts/${accountId}/env/${encodeURIComponent(key)}?site_id=${siteId}`).catch(() => null);
  if (existing) {
    await netlifyRequest(`/api/v1/accounts/${accountId}/env/${encodeURIComponent(key)}?site_id=${siteId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  } else {
    await netlifyRequest(`/api/v1/accounts/${accountId}/env?site_id=${siteId}`, {
      method: "POST",
      body: JSON.stringify([payload])
    });
  }
}

async function main() {
  const sites = await netlifyRequest("/api/v1/sites");
  const site =
    sites.find((entry) => entry.name === "stories-remember-when") ??
    sites.find((entry) => entry.ssl_url?.includes("stories-remember-when"));

  if (!site) {
    throw new Error("Could not find stories-remember-when site.");
  }

  const accountId = site.account_id;
  const siteId = site.id;
  console.log(`Site: ${site.name} (${site.ssl_url || site.url})`);

  const existing = await netlifyRequest(`/api/v1/accounts/${accountId}/env?site_id=${siteId}`);
  const existingKeys = new Set((existing ?? []).map((entry) => entry.key));
  console.log(`Existing env vars: ${existingKeys.size}`);

  if (!envVars.OPENAI_API_KEY && existingKeys.has("OPENAI_API_KEY")) {
    console.log("Keeping existing OPENAI_API_KEY from Netlify.");
    delete envVars.OPENAI_API_KEY;
  } else if (!envVars.OPENAI_API_KEY) {
    console.log("WARNING: OPENAI_API_KEY is missing locally and not yet set in Netlify.");
    delete envVars.OPENAI_API_KEY;
  }

  if (!envVars.ALLOWED_EMAILS) {
    if (existingKeys.has("ALLOWED_EMAILS")) {
      console.log("Keeping existing ALLOWED_EMAILS from Netlify.");
    } else {
      console.log("WARNING: ALLOWED_EMAILS is missing locally and not yet set in Netlify.");
    }
  }

  for (const [key, value] of Object.entries(envVars)) {
    await upsertEnvVar(accountId, siteId, key, value);
    console.log(`Set ${key}`);
  }

  console.log("\nNetlify env synced. Deploy manually when ready (no deploy was triggered):");
  console.log("  1. Pause auto-builds in Netlify if you want to avoid surprise deploys.");
  console.log("  2. Run: netlify deploy --prod");
  console.log("  3. Verify /api/health shows hasAllowedEmailsKey:true and allowlistCount > 0.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
