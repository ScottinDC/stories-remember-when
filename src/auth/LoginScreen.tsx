import { Loader2, LogOut } from "lucide-react";
import { hasOAuthReturnInUrl } from "./identity";
import { useAuth } from "./AuthProvider";

export function LoginScreen() {
  const {
    authConfigured,
    configStatus,
    error,
    getAccessToken,
    hasAllowedEmailsKey,
    loginWithGoogle,
    logout,
    retryBootstrap,
    user
  } = useAuth();
  const hasSession = Boolean(getAccessToken() || user);

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="form-card w-full max-w-md">
        <div className="card-header px-5">
          <div>
            <p className="mono-eyebrow mb-1">Private Family Archive</p>
            <h1 className="panel-title">Remember When</h1>
          </div>
        </div>

        <div className="card-body space-y-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            Sign in with Google to continue. Only pre-approved family accounts can access this interview.
          </p>

          {configStatus === "failed" ? (
            <div className="space-y-3 rounded border border-[#f0caca] bg-[#fff8f8] px-4 py-3 text-sm text-[#9b2c2c]">
              <p>
                {import.meta.env.DEV
                  ? "Could not reach the local API on port 8787. Run npm run dev:local from the project folder."
                  : "Could not reach the server to verify access control. Check your connection and try again."}
              </p>
              <button className="btn-secondary w-full justify-center" onClick={() => void retryBootstrap()} type="button">
                Try again
              </button>
            </div>
          ) : !authConfigured ? (
            <div className="rounded border border-[#f0caca] bg-[#fff8f8] px-4 py-3 text-sm text-[#9b2c2c]">
              {hasAllowedEmailsKey
                ? "ALLOWED_EMAILS is set but no valid addresses were found. Check comma-separated formatting in Netlify, then redeploy."
                : "Access control is not configured yet. Add ALLOWED_EMAILS in Netlify environment variables with Functions scope, then redeploy."}
            </div>
          ) : null}

          {error ? (
            <div className="rounded border border-[#f0caca] bg-[#fff8f8] px-4 py-3 text-sm text-[#9b2c2c]">{error}</div>
          ) : null}

          <button
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={configStatus !== "loaded" || !authConfigured}
            onClick={loginWithGoogle}
            type="button"
          >
            {configStatus === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking access…
              </>
            ) : (
              "Continue with Google"
            )}
          </button>

          {hasSession ? (
            <button
              className="btn-secondary w-full justify-center"
              onClick={() => void logout({ error: null })}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Clear session and try again
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authRequired, loading, user } = useAuth();
  const mustSignIn = import.meta.env.PROD || authRequired;
  const finishingOAuth = hasOAuthReturnInUrl();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 font-mono text-sm text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-navy-light" />
          {finishingOAuth ? "Finishing Google sign-in" : "Checking access"}
        </div>
      </main>
    );
  }

  if (mustSignIn && !user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

export function AuthStatus() {
  const { authRequired, logout, user } = useAuth();

  if (!authRequired || !user || user.email === "local-dev@remember-when.local") {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line-soft pb-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Signed in as {user.email}</p>
      <button className="btn-secondary min-h-8 px-3 text-xs" onClick={() => void logout()} type="button">
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
