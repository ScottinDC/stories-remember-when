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
      <main className="grid min-h-screen place-items-center bg-linen-100">
        <div className="flex items-center gap-3 text-base text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-umber" />
          Opening the interview
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center bg-linen-100 px-4">
        <p className="text-base text-[#8b3a3a]">{error ?? "Could not load the interview."}</p>
      </main>
    );
  }

  const nodes = state.nodes;

  return (
    <main className="min-h-screen bg-linen-100 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <AppHeader
          answeredCount={countByStatus(nodes, "answered")}
          pendingCount={countByStatus(nodes, "pending")}
          processingCount={countByStatus(nodes, "processing")}
          title={toTitleCase(state.thread.title)}
        />

        {error ? (
          <div className="rounded-lg border border-[#e8c4c4] bg-[#fff5f5] px-4 py-3 text-base text-[#8b3a3a]">{error}</div>
        ) : null}

        <InterviewForm onStateChange={setState} setError={setError} state={state} />
      </div>
    </main>
  );
}
