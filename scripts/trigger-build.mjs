import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const configPath = join(homedir(), "Library/Preferences/netlify/config.json");
const netlifyConfig = JSON.parse(readFileSync(configPath, "utf8"));
const token = Object.values(netlifyConfig.users)[0].auth.token;

async function netlifyRequest(path, options = {}) {
  const response = await fetch(`https://api.netlify.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${JSON.stringify(body)}`);
  }
  return body;
}

const siteId = "31a7abc0-7ab9-4440-92de-7ea0bd08df59";
const build = await netlifyRequest(`/api/v1/sites/${siteId}/builds`, {
  method: "POST",
  body: JSON.stringify({ clear_cache: true })
});

console.log("Build triggered:", build.id, build.done, build.error || "ok");
