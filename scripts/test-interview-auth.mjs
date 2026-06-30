#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const netlifyToken = Object.values(
  JSON.parse(readFileSync(join(homedir(), "Library/Preferences/netlify/config.json"), "utf8")).users
)[0].auth.token;
const siteId = "31a7abc0-7ab9-4440-92de-7ea0bd08df59";
const base = process.env.E2E_PRODUCTION_URL ?? "https://stories-remember-when.netlify.app";

const envRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, {
  headers: { Authorization: `Bearer ${netlifyToken}` }
});
const env = await envRes.json();
const allowed =
  env
    .find((item) => item.key === "ALLOWED_EMAILS")
    ?.values?.[0]?.value?.split(",")
    .map((email) => email.trim())
    .filter(Boolean) ?? [];

if (allowed.length === 0) {
  throw new Error("No ALLOWED_EMAILS found in Netlify env.");
}

const email = allowed[0];
const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 3600 })
).toString("base64url");
const jwt = `${header}.${payload}.`;

const start = Date.now();
const response = await fetch(`${base}/api/interview`, {
  headers: {
    Authorization: `Bearer ${jwt}`,
    Cookie: `nf_jwt=${encodeURIComponent(jwt)}`
  }
});
const body = await response.text();
const elapsed = Date.now() - start;

console.log("status:", response.status);
console.log("elapsed ms:", elapsed);
console.log("content-type:", response.headers.get("content-type"));
console.log("internal error:", /Internal Error/i.test(body));
console.log("body head:", body.slice(0, 400));
