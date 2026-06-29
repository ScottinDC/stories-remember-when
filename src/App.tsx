import React from "react";
import { Loader2 } from "lucide-react";
import { fetchInterview } from "./api";
import { InterviewForm } from "./components/InterviewForm";
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
      <main className="grid min-h-screen place-items-center bg-cream">
        <div className="flex items-center gap-3 text-base text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin text-dusty" />
          Opening the interview
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-4">
        <p className="text-base text-[#8b3a3a]">{error ?? "Could not load the interview."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 md:px-6 md:py-8">
      {error ? (
        <div className="mx-auto mb-5 max-w-6xl rounded-lg border border-[#d4b8b8] bg-[#fdf8f8] px-4 py-3 text-base text-[#8b3a3a]">
          {error}
        </div>
      ) : null}

      <InterviewForm onStateChange={setState} setError={setError} state={state} />
    </main>
  );
}
