import {
  handleAuthCallback,
  hydrateSession,
  logout as identityLogout,
  oauthLogin
} from "@netlify/identity";

const TOKEN_STORAGE_KEY = "remember-when.auth-token";

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

function syncStoredAccessToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  return token;
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

function readLegacyHashToken() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  if (!token) {
    return null;
  }

  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  syncStoredAccessToken(token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `nf_jwt=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  const refreshToken = params.get("refresh_token");
  if (refreshToken) {
    document.cookie = `nf_refresh=${encodeURIComponent(refreshToken)}; Path=/; SameSite=Lax${secure}`;
  }
  return token;
}

export function getStoredAccessToken() {
  const fromHash = readLegacyHashToken();
  if (fromHash) {
    return fromHash;
  }

  const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  const fromCookie = readCookieToken("nf_jwt");
  if (fromCookie) {
    return syncStoredAccessToken(fromCookie);
  }

  return null;
}

export function hasStoredSession() {
  return Boolean(getStoredAccessToken());
}

export function clearStoredAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = "nf_jwt=; Path=/; Max-Age=0; SameSite=Lax";
  document.cookie = "nf_refresh=; Path=/; Max-Age=0; SameSite=Lax";
}

export async function resolveAuthUser(): Promise<AuthUser | null> {
  if (import.meta.env.DEV) {
    const token = getStoredAccessToken();
    return token ? userFromAccessToken(token) : null;
  }

  try {
    const callback = await handleAuthCallback();
    if (callback?.user?.email) {
      const token = readCookieToken("nf_jwt");
      syncStoredAccessToken(token);
      return { email: callback.user.email };
    }
  } catch {
    // Not an OAuth callback URL.
  }

  try {
    const hydrated = await hydrateSession();
    if (hydrated?.email) {
      const token = readCookieToken("nf_jwt");
      syncStoredAccessToken(token);
      return { email: hydrated.email };
    }
  } catch {
    // Fall back to locally stored token.
  }

  const token = getStoredAccessToken();
  return token ? userFromAccessToken(token) : null;
}

export function loginWithGoogle() {
  if (import.meta.env.DEV) {
    const redirectUri = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({
      provider: "google",
      redirect_uri: redirectUri
    });
    window.location.assign(`/.netlify/identity/authorize?${params.toString()}`);
    return;
  }

  oauthLogin("google");
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
    await identityLogout();
  } catch {
    try {
      await fetch("/.netlify/identity/logout", { method: "POST" });
    } catch {
      // Local dev has no Identity endpoint; clearing the token is enough.
    }
  }
}
