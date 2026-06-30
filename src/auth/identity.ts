const TOKEN_STORAGE_KEY = "remember-when.auth-token";
const OAUTH_RETURN_KEY = "remember-when.oauth-return";
const OAUTH_ERROR_KEY = "remember-when.oauth-error";
export const INVALID_STORED_TOKEN_MESSAGE =
  "Google sign-in returned a token the app could not read. Try again.";

export type AuthUser = {
  email: string;
};

export type AuthConfig = {
  authRequired: boolean;
  authConfigured: boolean;
  allowlistCount?: number;
  hasAllowedEmailsKey?: boolean;
};

export type AuthConfigStatus = "loading" | "loaded" | "failed";

export type SessionVerifyResult =
  | { ok: true; email: string }
  | { ok: false; status: number; error: string };

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
  return atob(padded);
}

function readCookieToken(name: string) {
  const match = new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`).exec(document.cookie);
  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
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

function readOAuthReturnParams() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    return new URLSearchParams(hash);
  }

  const query = window.location.search.replace(/^\?/, "");
  if (query) {
    return new URLSearchParams(query);
  }

  return null;
}

function storeOAuthTokens(accessToken: string, refreshToken?: string | null) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  sessionStorage.setItem(OAUTH_RETURN_KEY, "1");
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (accessToken.length < 3500) {
    document.cookie = `nf_jwt=${encodeURIComponent(accessToken)}; Path=/; SameSite=Lax${secure}`;
  }
  if (refreshToken && refreshToken.length < 3500) {
    document.cookie = `nf_refresh=${encodeURIComponent(refreshToken)}; Path=/; SameSite=Lax${secure}`;
  }
}

function captureOAuthReturnFromUrl() {
  if (sessionStorage.getItem(TOKEN_STORAGE_KEY)) {
    return;
  }

  const params = readOAuthReturnParams();
  if (!params) {
    return;
  }

  const error = params.get("error");
  if (error) {
    const description = params.get("error_description");
    sessionStorage.setItem(
      OAUTH_ERROR_KEY,
      description?.replace(/\+/g, " ") ?? error.replace(/_/g, " ")
    );
    window.history.replaceState(null, "", window.location.pathname);
    return;
  }

  const accessToken = params.get("access_token");
  if (accessToken) {
    storeOAuthTokens(accessToken, params.get("refresh_token"));
    window.history.replaceState(null, "", window.location.pathname);
    return;
  }

  if (params.get("code")) {
    sessionStorage.setItem(OAUTH_RETURN_KEY, "1");
    window.history.replaceState(null, "", window.location.pathname);
  }
}

if (typeof window !== "undefined") {
  captureOAuthReturnFromUrl();
}

export function userFromAccessToken(token: string): AuthUser | null {
  const claims = decodeAccessTokenClaims(token);
  const email = emailFromClaims(claims);
  if (!email) {
    return null;
  }
  if (claims?.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return { email };
}

export function getStoredAccessToken() {
  const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const fromCookie = readCookieToken("nf_jwt");
  return fromCookie;
}

export function hasStoredSession() {
  return Boolean(getStoredAccessToken()) || hasOAuthReturnInUrl();
}

export function consumeOAuthReturnError() {
  const message = sessionStorage.getItem(OAUTH_ERROR_KEY);
  if (message) {
    sessionStorage.removeItem(OAUTH_ERROR_KEY);
  }
  return message;
}

export function hasOAuthReturnInUrl() {
  return sessionStorage.getItem(OAUTH_RETURN_KEY) === "1";
}

export function clearOAuthReturnFlag() {
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
}

export function clearStoredAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
  sessionStorage.removeItem(OAUTH_ERROR_KEY);
  document.cookie = "nf_jwt=; Path=/; Max-Age=0; SameSite=Lax";
  document.cookie = "nf_refresh=; Path=/; Max-Age=0; SameSite=Lax";
}

export function resolveAuthUser(): AuthUser | null {
  const oauthError = consumeOAuthReturnError();
  if (oauthError) {
    throw new Error(oauthError);
  }

  const token = getStoredAccessToken();
  if (!token) {
    return null;
  }

  const user = userFromAccessToken(token);
  if (!user) {
    throw new Error(INVALID_STORED_TOKEN_MESSAGE);
  }

  return user;
}

export function isInvalidStoredTokenError(message: string) {
  return message === INVALID_STORED_TOKEN_MESSAGE;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyServerSession(attempts = 1): Promise<SessionVerifyResult> {
  let lastResult: SessionVerifyResult = {
    ok: false,
    status: 401,
    error: "The server could not verify your sign-in. Please try again."
  };

  for (let index = 0; index < attempts; index += 1) {
    const token = getStoredAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch("/api/session", {
      headers,
      credentials: "include",
      cache: "no-store"
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();

    if (/Internal Error/i.test(body)) {
      lastResult = {
        ok: false,
        status: 503,
        error: "The server is still starting. Please wait a moment and try again."
      };
    } else if (response.ok && contentType.includes("application/json")) {
      try {
        const payload = JSON.parse(body) as { email?: string };
        if (payload.email) {
          return { ok: true, email: payload.email };
        }
      } catch {
        // Fall through to generic error handling.
      }
    }

    let error = "The server could not verify your sign-in. Please try again.";
    if (contentType.includes("application/json")) {
      try {
        const payload = JSON.parse(body) as { error?: string };
        if (payload.error) {
          error = payload.error;
        }
      } catch {
        // Keep default message.
      }
    }

    lastResult = { ok: false, status: response.status, error };

    if (index < attempts - 1) {
      await sleep(500 * (index + 1));
    }
  }

  return lastResult;
}

export function loginWithGoogle() {
  const redirectUri = `${window.location.origin}/`;
  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: redirectUri
  });
  window.location.assign(`/.netlify/identity/authorize?${params.toString()}`);
}

export async function fetchAuthConfig() {
  const attempts = 3;
  let lastError: Error | null = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        const body = await response.text();
        if (/Internal Error/i.test(body)) {
          throw new Error("The server is still starting. Please wait a moment and try again.");
        }
        throw new Error(`Could not load auth settings (${response.status}).`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error("The app could not reach the API. Redeploy or contact the site owner.");
      }

      const payload = (await response.json()) as AuthConfig & { ok?: boolean };
      return {
        authRequired: Boolean(payload.authRequired),
        authConfigured: Boolean(payload.authConfigured),
        allowlistCount: typeof payload.allowlistCount === "number" ? payload.allowlistCount : undefined,
        hasAllowedEmailsKey: Boolean(payload.hasAllowedEmailsKey)
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Could not load auth settings.");
      if (index < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (index + 1)));
      }
    }
  }

  throw lastError ?? new Error("Could not load auth settings.");
}

export async function logoutIdentity() {
  clearStoredAccessToken();
  try {
    await fetch("/.netlify/identity/logout", { method: "POST", credentials: "include" });
  } catch {
    // Local dev has no Identity endpoint; clearing the token is enough.
  }
}
