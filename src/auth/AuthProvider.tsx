import React from "react";
import {
  clearStoredAccessToken,
  fetchAuthConfig,
  fetchCurrentUser,
  getStoredAccessToken,
  loginWithGoogle,
  logoutIdentity,
  type AuthConfig,
  type AuthConfigStatus,
  type AuthUser
} from "./identity";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authRequired: boolean;
  authConfigured: boolean;
  hasAllowedEmailsKey: boolean;
  configStatus: AuthConfigStatus;
  error: string | null;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<AuthConfig>({
    authRequired: true,
    authConfigured: false,
    hasAllowedEmailsKey: false
  });
  const [configStatus, setConfigStatus] = React.useState<AuthConfigStatus>("loading");

  const bootstrap = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setConfigStatus("loading");

    try {
      const authConfig = await fetchAuthConfig();
      setConfig(authConfig);
      setConfigStatus("loaded");

      if (!authConfig.authRequired) {
        if (import.meta.env.DEV) {
          setUser({ email: "local-dev@remember-when.local" });
        } else {
          setUser(null);
          setError("Access control is misconfigured. Redeploy after setting ALLOWED_EMAILS in Netlify.");
        }
        return;
      }

      const token = getStoredAccessToken();
      if (!token) {
        setUser(null);
        return;
      }

      const currentUser = await fetchCurrentUser(token);
      if (!currentUser) {
        clearStoredAccessToken();
        setUser(null);
        setError("Your sign-in expired. Please sign in again.");
        return;
      }

      const accessCheck = await fetch("/api/interview", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (accessCheck.status === 401 || accessCheck.status === 403) {
        clearStoredAccessToken();
        setUser(null);
        const payload = (await accessCheck.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "This account is not authorized to access Remember When.");
        return;
      }

      if (!accessCheck.ok) {
        const payload = (await accessCheck.json().catch(() => null)) as { error?: string } | null;
        setUser(null);
        setError(payload?.error ?? "Could not load the interview. Try again in a moment.");
        return;
      }

      setUser(currentUser);
    } catch (bootstrapError) {
      if (import.meta.env.DEV) {
        setConfig({ authRequired: false, authConfigured: true });
        setConfigStatus("loaded");
        setUser({ email: "local-dev@remember-when.local" });
        setError(null);
      } else {
        const message =
          bootstrapError instanceof Error ? bootstrapError.message : "Could not verify sign-in.";
        setUser(null);
        setConfigStatus("failed");
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const logout = React.useCallback(async () => {
    await logoutIdentity();
    setUser(null);
    setError(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authRequired: config.authRequired,
      authConfigured: config.authConfigured,
      hasAllowedEmailsKey: Boolean(config.hasAllowedEmailsKey),
      configStatus,
      error,
      loginWithGoogle,
      logout,
      getAccessToken: getStoredAccessToken
    }),
    [config.authConfigured, config.authRequired, config.hasAllowedEmailsKey, configStatus, error, loading, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
