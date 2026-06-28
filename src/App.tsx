import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { fetchInterview } from "./api";
import { AppHeader } from "./components/AppHeader";
import { QuestionSidebar } from "./components/QuestionSidebar";
import { RecorderPanel } from "./components/RecorderPanel";
import { chooseNextQuestion, countByStatus } from "./lib/interview";
import type { InterviewState } from "./types";

export function App() {
  const [state, setState] = React.useState<InterviewState | null>(null);
  const [activeQuestionId, setActiveQuestionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchInterview()
      .then((interview) => {
        setState(interview);
        setActiveQuestionId(chooseNextQuestion(interview.nodes)?.id ?? interview.nodes[0]?.id ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const nodes = state?.nodes ?? [];
  const activeQuestion = nodes.find((node) => node.id === activeQuestionId) ?? null;

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-linen-100">
        <div className="flex items-center gap-3 text-xl text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin text-umber" />
          Opening the interview
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linen-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6 md:py-8">
        <AppHeader
          title={state?.thread.title ?? "Remember When"}
          answeredCount={countByStatus(nodes, "answered")}
          pendingCount={countByStatus(nodes, "pending")}
          processingCount={countByStatus(nodes, "processing")}
        />

        {error ? (
          <div className="rounded-xl border border-[#E7C4C4] bg-[#FFF5F5] px-4 py-3 text-lg text-[#8B3A3A]">{error}</div>
        ) : null}

        <section className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="panel p-5 md:p-8">
            {activeQuestion ? (
              <RecorderPanel
                key={activeQuestion.id}
                question={activeQuestion}
                onSaved={(nextState) => {
                  setState(nextState);
                  setActiveQuestionId(chooseNextQuestion(nextState.nodes)?.id ?? null);
                }}
                saving={saving}
                setSaving={setSaving}
                setError={setError}
              />
            ) : (
              <div className="grid min-h-[28rem] place-items-center text-center">
                <div className="max-w-md space-y-4">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-umber" />
                  <h2 className="font-serif text-3xl text-ink">All current questions are saved.</h2>
                  <p className="text-lg leading-relaxed text-ink-muted">
                    Choose any saved branch to keep the conversation going. A new follow-up will appear after each answer.
                  </p>
                </div>
              </div>
            )}
          </div>

          <QuestionSidebar
            nodes={nodes}
            activeQuestionId={activeQuestionId}
            onSelect={setActiveQuestionId}
          />
        </section>
      </div>
    </main>
  );
}
