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
};

function decodeAccessTokenClaims(token: string): AccessTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload) as AccessTokenClaims;
  } catch {
    return null;
  }
}

export function userFromAccessToken(token: string): AuthUser | null {
  const claims = decodeAccessTokenClaims(token);
  const email =
    claims?.email ??
    (typeof claims?.user_metadata?.email === "string" ? claims.user_metadata.email : undefined);
  if (!email) {
    return null;
  }
  if (claims?.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return { email };
}

function storeAccessToken(token: string, refreshToken?: string | null) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `nf_jwt=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  if (refreshToken) {
    document.cookie = `nf_refresh=${encodeURIComponent(refreshToken)}; Path=/; SameSite=Lax${secure}`;
  }
}

function readHashToken() {
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
  storeAccessToken(token, params.get("refresh_token"));
  return token;
}

export function getStoredAccessToken() {
  const fromHash = readHashToken();
  if (fromHash) {
    return fromHash;
  }

  const stored = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (stored) {
    storeAccessToken(stored);
  }
  return stored;
}

export function hasStoredSession() {
  return Boolean(getStoredAccessToken());
}

export function clearStoredAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = "nf_jwt=; Path=/; Max-Age=0; SameSite=Lax";
  document.cookie = "nf_refresh=; Path=/; Max-Age=0; SameSite=Lax";
}

export function loginWithGoogle() {
  const redirectUri = `${window.location.origin}${window.location.pathname}${window.location.search}`;
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
    await fetch("/.netlify/identity/logout", { method: "POST" });
  } catch {
    // Local dev has no Identity endpoint; clearing the token is enough.
  }
}
