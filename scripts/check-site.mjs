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
  return response.json();
}

const siteId = "31a7abc0-7ab9-4440-92de-7ea0bd08df59";
const site = await netlifyRequest(`/api/v1/sites/${siteId}`);
console.log("name:", site.name);
console.log("repo:", site.build_settings?.repo_url);
console.log("branch:", site.build_settings?.repo_branch);
console.log("provider:", site.build_settings?.repo_provider);
console.log("cmd:", site.build_settings?.cmd);
console.log("dir:", site.build_settings?.dir);
console.log("functions:", site.build_settings?.functions_dir);
