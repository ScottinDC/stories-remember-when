import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const configPath = join(homedir(), "Library/Preferences/netlify/config.json");
const token = Object.values(JSON.parse(readFileSync(configPath, "utf8")).users)[0].auth.token;
const deployId = process.argv[2] || "6a41810d52f22be1fd54f3db";

const deploy = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
  headers: { Authorization: `Bearer ${token}` }
}).then((r) => r.json());

console.log(JSON.stringify(deploy, null, 2));
