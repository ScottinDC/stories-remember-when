import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

type RuntimeEnvName =
  | "ALLOWED_EMAILS"
  | "AUTH_DISABLED"
  | "URL"
  | "NETLIFY"
  | "AWS_LAMBDA_FUNCTION_NAME";

// Split keys so esbuild/Netlify bundlers cannot inline build-time empties.
const RUNTIME_ENV_KEY: Record<RuntimeEnvName, string> = {
  ALLOWED_EMAILS: "ALLOW" + "ED_EMAILS",
  AUTH_DISABLED: "AUTH" + "_DISABLED",
  URL: "UR" + "L",
  NETLIFY: "NET" + "LIFY",
  AWS_LAMBDA_FUNCTION_NAME: "AWS" + "_LAMBDA_FUNCTION_NAME"
};

function readRuntimeEnv(name: RuntimeEnvName) {
  const env = globalThis.process?.env;
  if (!env) {
    return undefined;
  }
  return env[RUNTIME_ENV_KEY[name]];
}

function isNetlifyRuntime() {
  return readRuntimeEnv("NETLIFY") === "true" || Boolean(readRuntimeEnv("AWS_LAMBDA_FUNCTION_NAME"));
}

export function isAuthDisabled() {
  if (isNetlifyRuntime()) {
    return false;
  }
  return readRuntimeEnv("AUTH_DISABLED") === "true";
}

export function getAllowedEmails() {
  const raw = readRuntimeEnv("ALLOWED_EMAILS") ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string) {
  const allowed = getAllowedEmails();
  if (allowed.length === 0) {
    return false;
  }
  return allowed.includes(email.trim().toLowerCase());
}

function resolveSiteUrl(requestUrl?: string) {
  const siteUrl = readRuntimeEnv("URL");
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }
  if (requestUrl) {
    const url = new URL(requestUrl);
    return `${url.protocol}//${url.host}`;
  }
  return "";
}

function getJwks(siteUrl: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${siteUrl}/.netlify/identity/.well-known/jwks.json`));
  }
  return jwks;
}

export function extractBearerToken(headerValue: string | null | undefined) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }
  const token = headerValue.slice("Bearer ".length).trim();
  return token || null;
}

export async function verifyAccessToken(token: string, requestUrl?: string) {
  const siteUrl = resolveSiteUrl(requestUrl);
  if (!siteUrl) {
    throw new Error("Could not resolve site URL for auth verification.");
  }

  let email: string | null = null;

  try {
    const { payload } = await jwtVerify(token, getJwks(siteUrl));
    email = typeof payload.email === "string" ? payload.email : null;
  } catch {
    const response = await fetch(`${siteUrl}/.netlify/identity/user`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Invalid or expired sign-in.");
    }

    const user = (await response.json()) as { email?: string };
    email = user.email ?? null;
  }

  if (!email) {
    throw new Error("Token is missing an email claim.");
  }

  if (!isEmailAllowed(email)) {
    throw new Error("This account is not authorized to access Remember When.");
  }

  return { email };
}

export type AuthResult =
  | { email: string }
  | { status: 401 | 403; error: string };

export async function requireAuth(authHeader: string | null | undefined, requestUrl?: string): Promise<AuthResult> {
  if (isAuthDisabled()) {
    return { email: "local-dev@remember-when.local" };
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return { status: 401, error: "Sign in required." };
  }

  try {
    return await verifyAccessToken(token, requestUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid or expired sign-in.";
    const status = message.includes("not authorized") ? 403 : 401;
    return { status, error: message };
  }
}

export function authConfig() {
  const disabled = isAuthDisabled();
  const hasAllowedEmailsKey = Boolean(readRuntimeEnv("ALLOWED_EMAILS"));
  const allowlistCount = getAllowedEmails().length;
  return {
    authRequired: !disabled,
    authConfigured: disabled || allowlistCount > 0,
    allowlistCount,
    hasAllowedEmailsKey
  };
}
