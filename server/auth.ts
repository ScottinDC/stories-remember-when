import { decodeJwt } from "jose";
import { isNetlifyRuntime, readRuntimeEnv } from "./runtime-env";

type NetlifyIdentityContext = {
  token?: string;
  user?: {
    email?: string;
    exp?: number;
  };
};

type NetlifyGlobals = {
  netlifyIdentityContext?: NetlifyIdentityContext;
  Netlify?: {
    context?: {
      cookies?: {
        get?: (name: string) => string | undefined;
      };
    };
  };
};

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

export function extractBearerToken(headerValue: string | null | undefined) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }
  const token = headerValue.slice("Bearer ".length).trim();
  return token || null;
}

function getNetlifyIdentityContext(): NetlifyIdentityContext | null {
  const context = (globalThis as NetlifyGlobals).netlifyIdentityContext;
  return context ?? null;
}

function readCookieHeader(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const match = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`).exec(cookieHeader);
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function readServerJwt(req?: Request) {
  const bearer = extractBearerToken(req?.headers.get("authorization"));
  if (bearer) {
    return bearer;
  }

  const netlifyCookies = (globalThis as NetlifyGlobals).Netlify?.context?.cookies;
  const fromRuntime = netlifyCookies?.get?.("nf_jwt");
  if (fromRuntime) {
    return fromRuntime;
  }

  const fromCookieHeader = readCookieHeader(req?.headers.get("cookie"), "nf_jwt");
  if (fromCookieHeader) {
    return fromCookieHeader;
  }

  const identityContext = getNetlifyIdentityContext();
  if (identityContext?.user?.email && identityContext.token) {
    return identityContext.token;
  }

  return null;
}

function emailFromJwt(token: string) {
  let payload: ReturnType<typeof decodeJwt>;
  try {
    payload = decodeJwt(token);
  } catch {
    throw new Error("Invalid or expired sign-in.");
  }

  const email =
    typeof payload.email === "string"
      ? payload.email
      : typeof (payload as { user_metadata?: { email?: string } }).user_metadata?.email === "string"
        ? (payload as { user_metadata: { email: string } }).user_metadata.email
        : null;
  if (!email) {
    throw new Error("Token is missing an email claim.");
  }

  const exp = typeof payload.exp === "number" ? payload.exp : null;
  if (exp && exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid or expired sign-in.");
  }

  return email;
}

function resolveAuthenticatedEmail(req?: Request): string {
  const identityContext = getNetlifyIdentityContext();
  if (identityContext?.user?.email) {
    const exp = identityContext.user.exp;
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Invalid or expired sign-in.");
    }
    return identityContext.user.email;
  }

  const token = readServerJwt(req);
  if (!token) {
    throw new Error("Sign in required.");
  }

  return emailFromJwt(token);
}

export type AuthResult =
  | { email: string }
  | { status: 401 | 403; error: string };

export async function requireAuth(
  authHeader: string | null | undefined,
  _requestUrl?: string,
  req?: Request
): Promise<AuthResult> {
  if (isAuthDisabled()) {
    return { email: "local-dev@remember-when.local" };
  }

  try {
    const email = req
      ? resolveAuthenticatedEmail(req)
      : emailFromJwt(extractBearerToken(authHeader) ?? (() => { throw new Error("Sign in required."); })());
    if (!isEmailAllowed(email)) {
      return {
        status: 403,
        error: `This Google account (${email}) is not on the approved family list. Ask the site owner to add it to ALLOWED_EMAILS in Netlify.`
      };
    }
    return { email };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid or expired sign-in.";
    const status = message.includes("approved family list") ? 403 : 401;
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
