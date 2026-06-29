const TOKEN_STORAGE_KEY = "remember-when.auth-token";

export type AuthUser = {
  email: string;
};

export type AuthConfig = {
  authRequired: boolean;
  authConfigured: boolean;
  allowlistCount?: number;
};

export type AuthConfigStatus = "loading" | "loaded" | "failed";

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
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  return token;
}

export function getStoredAccessToken() {
  return readHashToken() ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearStoredAccessToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
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
  const response = await fetch("/api/health");
  if (!response.ok) {
    throw new Error("Could not load auth settings.");
  }

  const payload = (await response.json()) as AuthConfig & { ok?: boolean };
  return {
    authRequired: Boolean(payload.authRequired),
    authConfigured: Boolean(payload.authConfigured),
    allowlistCount: typeof payload.allowlistCount === "number" ? payload.allowlistCount : undefined
  };
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch("/.netlify/identity/user", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { email?: string };
  if (!payload.email) {
    return null;
  }

  return { email: payload.email };
}

export async function logoutIdentity() {
  clearStoredAccessToken();
  try {
    await fetch("/.netlify/identity/logout", { method: "POST" });
  } catch {
    // Local dev has no Identity endpoint; clearing the token is enough.
  }
}
