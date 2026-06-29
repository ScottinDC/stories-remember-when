import React from "react";
import { Loader2 } from "lucide-react";
import { fetchInterview } from "./api";
import { AppHeader } from "./components/AppHeader";
import { InterviewForm } from "./components/InterviewForm";
import { toTitleCase } from "./lib/titleCase";
import { countByStatus } from "./lib/interview";
import type { InterviewState } from "./types";

export function App() {
  const [state, setState] = React.useState<InterviewState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchInterview()
      .then(setState)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-page">
        <div className="flex items-center gap-3 font-mono text-sm text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-navy-light" />
          Opening the interview
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center bg-page px-4">
        <p className="text-base text-[#9b2c2c]">{error ?? "Could not load the interview."}</p>
      </main>
    );
  }

  const nodes = state.nodes;

  return (
    <main className="min-h-screen bg-page px-8 py-[52px] pb-16">
      <div className="mx-auto flex w-full max-w-shell flex-col gap-10">
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
