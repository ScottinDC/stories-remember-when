import { isNetlifyRuntime, readRuntimeEnv } from "./runtime-env";

type NetlifyIdentityContext = {
  token?: string;
  user?: {
    email?: string;
    exp?: number;
    sub?: string;
    user_metadata?: {
      email?: string;
    };
    app_metadata?: {
      email?: string;
    };
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

type AuthRequestContext = {
  cookies?: {
    get?: (name: string) => string | undefined;
  };
};

type AccessTokenClaims = {
  email?: string;
  exp?: number;
  user_metadata?: {
    email?: string;
  };
  app_metadata?: {
    email?: string;
  };
};

function decodeBase64Url(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function decodeAccessTokenClaims(token: string): AccessTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    return JSON.parse(decodeBase64Url(parts[1])) as AccessTokenClaims;
  } catch {
    return null;
  }
}

function emailFromClaims(claims: AccessTokenClaims | null) {
  if (!claims) {
    return undefined;
  }
  return (
    claims.email ??
    (typeof claims.user_metadata?.email === "string" ? claims.user_metadata.email : undefined) ??
    (typeof claims.app_metadata?.email === "string" ? claims.app_metadata.email : undefined)
  );
}

function getNetlifyIdentityContext(): NetlifyIdentityContext | null {
  return (globalThis as NetlifyGlobals).netlifyIdentityContext ?? null;
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

export function extractBearerToken(headerValue: string | null | undefined) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }
  const token = headerValue.slice("Bearer ".length).trim();
  return token || null;
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

function readRuntimeCookie(name: string, requestContext?: AuthRequestContext) {
  try {
    const fromHandler = requestContext?.cookies?.get?.(name);
    if (fromHandler) {
      return fromHandler;
    }
  } catch {
    // Ignore cookie API failures and fall back to request parsing.
  }

  return (globalThis as NetlifyGlobals).Netlify?.context?.cookies?.get?.(name) ?? null;
}

function readServerJwt(req?: Request, requestContext?: AuthRequestContext) {
  const bearer = extractBearerToken(req?.headers.get("authorization"));
  if (bearer) {
    return bearer;
  }

  const fromRuntime = readRuntimeCookie("nf_jwt", requestContext);
  if (fromRuntime) {
    return fromRuntime;
  }

  return readCookieHeader(req?.headers.get("cookie"), "nf_jwt");
}

function emailFromIdentityContext(context: NetlifyIdentityContext) {
  const email =
    context.user?.email ??
    (typeof context.user?.user_metadata?.email === "string" ? context.user.user_metadata.email : undefined) ??
    (typeof context.user?.app_metadata?.email === "string" ? context.user.app_metadata.email : undefined);
  if (!email) {
    return null;
  }

  const exp = context.user?.exp;
  if (exp && exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid or expired sign-in.");
  }

  return email;
}

function emailFromJwt(token: string) {
  const claims = decodeAccessTokenClaims(token);
  const email = emailFromClaims(claims);
  if (!email) {
    throw new Error("Token is missing an email claim.");
  }

  if (claims?.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid or expired sign-in.");
  }

  return email;
}

function resolveAuthenticatedEmail(req?: Request, requestContext?: AuthRequestContext): string {
  const token = readServerJwt(req, requestContext);
  if (token) {
    try {
      return emailFromJwt(token);
    } catch (error) {
      const identityContext = getNetlifyIdentityContext();
      const email = identityContext ? emailFromIdentityContext(identityContext) : null;
      if (email) {
        return email;
      }
      throw error;
    }
  }

  const identityContext = getNetlifyIdentityContext();
  const email = identityContext ? emailFromIdentityContext(identityContext) : null;
  if (email) {
    return email;
  }

  throw new Error("Sign in required.");
}

export type AuthResult =
  | { email: string }
  | { status: 401 | 403; error: string };

export async function requireAuth(
  authHeader: string | null | undefined,
  _requestUrl?: string,
  req?: Request,
  requestContext?: AuthRequestContext
): Promise<AuthResult> {
  if (isAuthDisabled()) {
    return { email: "local-dev@remember-when.local" };
  }

  try {
    const email = req
      ? resolveAuthenticatedEmail(req, requestContext)
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
