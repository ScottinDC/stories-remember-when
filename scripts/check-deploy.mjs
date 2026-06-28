import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const configPath = join(homedir(), "Library/Preferences/netlify/config.json");
const netlifyConfig = JSON.parse(readFileSync(configPath, "utf8"));
const token = Object.values(netlifyConfig.users)[0].auth.token;

async function netlifyRequest(path) {
  const response = await fetch(`https://api.netlify.com${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
}

const siteId = "31a7abc0-7ab9-4440-92de-7ea0bd08df59";
const deploys = await netlifyRequest(`/api/v1/sites/${siteId}/deploys?per_page=3`);
for (const deploy of deploys) {
  console.log(deploy.id, deploy.state, deploy.context, deploy.branch, deploy.error_message || "ok");
  console.log("  created:", deploy.created_at);
  console.log("  published:", deploy.published_at || "not yet");
  console.log("  commit:", deploy.commit_ref?.slice(0, 8), deploy.title || "");
}
