import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function envVar(name: "ALLOWED_EMAILS" | "AUTH_DISABLED" | "URL") {
  // Dynamic access so Netlify's function bundler cannot inline build-time empties.
  return process.env[name];
}

export function isAuthDisabled() {
  return envVar("AUTH_DISABLED") === "true";
}

export function getAllowedEmails() {
  const raw = envVar("ALLOWED_EMAILS") ?? "";
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
  const siteUrl = envVar("URL");
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
  const allowlistCount = getAllowedEmails().length;
  return {
    authRequired: !disabled,
    authConfigured: disabled || allowlistCount > 0,
    allowlistCount
  };
}
