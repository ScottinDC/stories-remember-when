import { isNetlifyRuntime, readRuntimeEnv } from "./runtime-env";

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

async function resolveAuthenticatedEmail(): Promise<string> {
  if (isNetlifyRuntime()) {
    const { getUser } = await import("@netlify/identity");
    const user = await getUser();
    if (!user?.email) {
      throw new Error("Sign in required.");
    }
    return user.email;
  }

  throw new Error("Sign in required.");
}

export type AuthResult =
  | { email: string }
  | { status: 401 | 403; error: string };

export async function requireAuth(authHeader: string | null | undefined, _requestUrl?: string): Promise<AuthResult> {
  if (isAuthDisabled()) {
    return { email: "local-dev@remember-when.local" };
  }

  if (isNetlifyRuntime()) {
    try {
      const email = await resolveAuthenticatedEmail();
      if (!isEmailAllowed(email)) {
        return { status: 403, error: "This account is not authorized to access Remember When." };
      }
      return { email };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid or expired sign-in.";
      const status = message.includes("not authorized") ? 403 : 401;
      return { status, error: message };
    }
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return { status: 401, error: "Sign in required." };
  }

  return { status: 401, error: "Sign in required." };
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
