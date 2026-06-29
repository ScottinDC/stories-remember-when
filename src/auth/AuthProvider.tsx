import React from "react";
import {
  clearStoredAccessToken,
  fetchAuthConfig,
  fetchCurrentUser,
  getStoredAccessToken,
  loginWithGoogle,
  logoutIdentity,
  type AuthConfig,
  type AuthUser
} from "./identity";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authRequired: boolean;
  authConfigured: boolean;
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
    authConfigured: false
  });

  const bootstrap = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const authConfig = await fetchAuthConfig();
      setConfig(authConfig);

      if (!authConfig.authRequired) {
        setUser({ email: "local-dev@remember-when.local" });
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
        throw new Error("Could not verify account access.");
      }

      setUser(currentUser);
    } catch (bootstrapError) {
      const message = bootstrapError instanceof Error ? bootstrapError.message : "Could not verify sign-in.";
      setUser(null);
      setError(message);
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
      error,
      loginWithGoogle,
      logout,
      getAccessToken: getStoredAccessToken
    }),
    [config.authConfigured, config.authRequired, error, loading, logout, user]
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
