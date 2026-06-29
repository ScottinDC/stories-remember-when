import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { isNetlifyRuntime, readRuntimeEnv } from "./runtime-env";

let cachedJwks: ReturnType<typeof createLocalJWKSet> | null = null;

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

export function extractBearerToken(headerValue: string | null | undefined) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }
  const token = headerValue.slice("Bearer ".length).trim();
  return token || null;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getIdentityJwks(siteUrl: string) {
  if (cachedJwks) {
    return cachedJwks;
  }

  const response = await fetchWithTimeout(
    `${siteUrl}/.netlify/identity/.well-known/jwks.json`,
    {
      headers: {
        Accept: "application/json"
      }
    },
    5000
  );

  if (!response.ok) {
    throw new Error("Could not load identity public keys.");
  }

  const jwks = (await response.json()) as JSONWebKeySet;
  cachedJwks = createLocalJWKSet(jwks);
  return cachedJwks;
}

async function verifyIdentityToken(token: string, siteUrl: string) {
  const jwks = await getIdentityJwks(siteUrl);
  const issuer = `${siteUrl}/.netlify/identity`;

  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    clockTolerance: 30
  });

  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email) {
    throw new Error("Token is missing an email claim.");
  }

  return email;
}

export async function verifyAccessToken(token: string, requestUrl?: string) {
  const siteUrl = resolveSiteUrl(requestUrl);
  if (!siteUrl) {
    throw new Error("Could not resolve site URL for auth verification.");
  }

  const email = await verifyIdentityToken(token, siteUrl);

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
