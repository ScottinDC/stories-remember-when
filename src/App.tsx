import React from "react";
import { Loader2 } from "lucide-react";
import { ApiAuthError, fetchInterview } from "./api";
import { useAuth } from "./auth/AuthProvider";
import { AuthStatus } from "./auth/LoginScreen";
import { AppHeader } from "./components/AppHeader";
import { InterviewForm } from "./components/InterviewForm";
import { toTitleCase } from "./lib/titleCase";
import { countByStatus } from "./lib/interview";
import type { InterviewState } from "./types";

export function App() {
  const { logout } = useAuth();
  const [state, setState] = React.useState<InterviewState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchInterview()
      .then(setState)
      .catch(async (err: unknown) => {
        if (err instanceof ApiAuthError) {
          await logout();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load the interview.");
      })
      .finally(() => setLoading(false));
  }, [logout]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="flex items-center gap-3 font-mono text-sm text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-navy-light" />
          Opening the interview
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-base text-[#9b2c2c]">{error ?? "Could not load the interview."}</p>
      </main>
    );
  }

  const nodes = state.nodes;

  return (
    <main className="min-h-screen px-5 py-8 md:px-6">
      <div className="mx-auto flex w-full max-w-shell flex-col gap-7">
        <AuthStatus />
        <AppHeader
          answeredCount={countByStatus(nodes, "answered")}
          pendingCount={countByStatus(nodes, "pending")}
          processingCount={countByStatus(nodes, "processing")}
          title={toTitleCase(state.thread.title)}
        />

        {error ? (
          <div className="rounded border border-[#f0caca] bg-[#fff8f8] px-4 py-3 text-base text-[#9b2c2c]">{error}</div>
        ) : null}

        <InterviewForm onStateChange={setState} setError={setError} state={state} />
      </div>
    </main>
  );
}
