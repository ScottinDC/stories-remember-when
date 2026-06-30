import React from "react";
import {
  clearOAuthReturnFlag,
  clearStoredAccessToken,
  fetchAuthConfig,
  getStoredAccessToken,
  hasOAuthReturnInUrl,
  isInvalidStoredTokenError,
  loginWithGoogle,
  logoutIdentity,
  resolveAuthUser,
  verifyServerSession,
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

    const finishingOAuth = hasOAuthReturnInUrl();

    try {
      if (import.meta.env.DEV) {
        try {
          const devUser = resolveAuthUser();
          if (!devUser) {
            setConfig({ authRequired: false, authConfigured: true });
            setConfigStatus("loaded");
            setUser({ email: "local-dev@remember-when.local" });
            return;
          }
        } catch (authError) {
          const message = authError instanceof Error ? authError.message : "Google sign-in failed.";
          if (isInvalidStoredTokenError(message)) {
            clearStoredAccessToken();
          }
          setUser(null);
          setError(message);
          setConfigStatus("loaded");
          return;
        }
      }

      const authConfig = await fetchAuthConfig();
      setConfig(authConfig);
      setConfigStatus("loaded");

      if (!authConfig.authRequired) {
        setUser(null);
        setError("Access control is misconfigured. Redeploy after setting ALLOWED_EMAILS in Netlify.");
        return;
      }

      const session = await verifyServerSession(finishingOAuth ? 5 : 1);
      if (session.ok) {
        setUser({ email: session.email });
        return;
      }

      try {
        const localUser = resolveAuthUser();
        if (localUser) {
          setUser(null);
          setError(session.error);
          if (session.status === 401 || session.status === 403) {
            clearStoredAccessToken();
          }
          return;
        }
      } catch (authError) {
        const message = authError instanceof Error ? authError.message : "Google sign-in failed.";
        if (isInvalidStoredTokenError(message)) {
          clearStoredAccessToken();
        }
        setUser(null);
        setError(message);
        return;
      }

      setUser(null);
      if (finishingOAuth) {
        setError(session.error || "Google sign-in did not finish. Use “Continue with Google” again.");
      } else if (session.status === 403) {
        setError(session.error);
      } else if (getStoredAccessToken()) {
        setError(session.error);
      }
    } catch (bootstrapError) {
      const message =
        bootstrapError instanceof Error ? bootstrapError.message : "Could not verify sign-in.";
      setUser(null);
      setConfigStatus("failed");
      setError(message);
    } finally {
      clearOAuthReturnFlag();
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
