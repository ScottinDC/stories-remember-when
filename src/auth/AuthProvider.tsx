import React from "react";
import {
  clearStoredAccessToken,
  fetchAuthConfig,
  getStoredAccessToken,
  loginWithGoogle,
  logoutIdentity,
  resolveAuthUser,
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
  logout: (options?: { error?: string | null }) => Promise<void>;
  retryBootstrap: () => Promise<void>;
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

      const currentUser = await resolveAuthUser();
      if (!currentUser) {
        clearStoredAccessToken();
        setUser(null);
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

  const logout = React.useCallback(async (options?: { error?: string | null }) => {
    await logoutIdentity();
    setUser(null);
    setError(options?.error ?? null);
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
      retryBootstrap: bootstrap,
      getAccessToken: getStoredAccessToken
    }),
    [bootstrap, config.authConfigured, config.authRequired, config.hasAllowedEmailsKey, configStatus, error, loading, logout, user]
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
