import React from "react";
import ReactDOM from "react-dom/client";
import { CheckCircle2, Circle, Loader2, Mic, Pause, Play, RotateCcw, Save } from "lucide-react";
import { fetchInterview, saveAnswer } from "./api";
import type { InterviewState, MemoryNode } from "./types";
import { useRecorder } from "./useRecorder";
import "./styles.css";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function chooseNextQuestion(nodes: MemoryNode[]) {
  return nodes.find((node) => node.status === "pending") ?? null;
}

function App() {
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

  const activeQuestion = state?.nodes.find((node) => node.id === activeQuestionId) ?? null;
  const answeredCount = state?.nodes.filter((node) => node.status === "answered").length ?? 0;
  const pendingCount = state?.nodes.filter((node) => node.status === "pending").length ?? 0;

  async function handleSaved(nextState: InterviewState) {
    setState(nextState);
    setActiveQuestionId(chooseNextQuestion(nextState.nodes)?.id ?? null);
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 text-stone-900">
        <div className="flex items-center gap-3 text-2xl">
          <Loader2 className="h-8 w-8 animate-spin" />
          Opening the interview
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-5 md:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-lg font-semibold text-teal-800">Remember When</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Dad&apos;s life story, one memory at a time
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white px-5 py-4 shadow-sm">
              <p className="text-3xl font-bold">{answeredCount}</p>
              <p className="text-base text-stone-600">Saved</p>
            </div>
            <div className="bg-white px-5 py-4 shadow-sm">
              <p className="text-3xl font-bold">{pendingCount}</p>
              <p className="text-base text-stone-600">Ready</p>
            </div>
          </div>
        </header>

        {error ? <div className="border-l-4 border-red-600 bg-white p-4 text-xl text-red-800">{error}</div> : null}

        <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-white p-5 shadow-sm md:p-8">
            {activeQuestion ? (
              <RecorderPanel
                key={activeQuestion.id}
                question={activeQuestion}
                onSaved={handleSaved}
                saving={saving}
                setSaving={setSaving}
                setError={setError}
              />
            ) : (
              <div className="grid min-h-[420px] place-items-center text-center">
                <div>
                  <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-teal-700" />
                  <h2 className="text-4xl font-bold">All current questions are saved.</h2>
                  <p className="mt-3 text-xl text-stone-700">Answering any branch will create the next thoughtful follow-up.</p>
                </div>
              </div>
            )}
          </div>

          <QuestionList
            nodes={state?.nodes ?? []}
            activeQuestionId={activeQuestionId}
            onSelect={setActiveQuestionId}
          />
        </section>
      </div>
    </main>
  );
}

function RecorderPanel(props: {
  question: MemoryNode;
  onSaved: (state: InterviewState) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  setError: (message: string | null) => void;
}) {
  const recorder = useRecorder();
  const isAnswered = props.question.status === "answered";
  const progress = Math.min(100, (recorder.seconds / recorder.maxSeconds) * 100);

  async function confirmSave() {
    if (!recorder.audioBlob) {
      return;
    }

    props.setSaving(true);
    props.setError(null);
    try {
      const result = await saveAnswer(props.question.id, recorder.audioBlob);
      recorder.reset();
      props.onSaved(result.state);
    } catch (err) {
      props.setError(err instanceof Error ? err.message : "Could not save the answer.");
    } finally {
      props.setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[560px] flex-col justify-between gap-8">
      <div>
        <p className="mb-3 text-xl font-semibold text-teal-800">{isAnswered ? "Saved memory" : "Current question"}</p>
        <h2 className="text-4xl font-bold leading-tight md:text-5xl">{props.question.question}</h2>
      </div>

      {isAnswered ? (
        <AnsweredMemory node={props.question} />
      ) : (
        <div className="space-y-6">
          <div className="h-5 overflow-hidden bg-stone-200">
            <div className="h-full bg-teal-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-center text-5xl font-bold tabular-nums">{formatTime(recorder.seconds)}</p>

          {recorder.error ? <p className="text-center text-xl text-red-700">{recorder.error}</p> : null}

          {recorder.audioUrl ? (
            <div className="space-y-5">
              <audio className="w-full" controls src={recorder.audioUrl}>
                <track kind="captions" />
              </audio>
              <div className="grid gap-3 md:grid-cols-2">
                <button className="large-button secondary" onClick={recorder.reset} type="button">
                  <RotateCcw className="h-8 w-8" />
                  Re-record
                </button>
                <button className="large-button primary" disabled={props.saving} onClick={confirmSave} type="button">
                  {props.saving ? <Loader2 className="h-8 w-8 animate-spin" /> : <Save className="h-8 w-8" />}
                  {props.saving ? "Saving" : "Save Answer"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className={`large-button mx-auto w-full max-w-xl ${recorder.isRecording ? "danger" : "primary"}`}
              onClick={recorder.isRecording ? recorder.stop : recorder.start}
              type="button"
            >
              {recorder.isRecording ? <Pause className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
              {recorder.isRecording ? "Stop Recording" : "Record Answer"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AnsweredMemory({ node }: { node: MemoryNode }) {
  return (
    <div className="space-y-5">
      {node.mp3Url ? (
        <audio className="w-full" controls src={node.mp3Url}>
          <track kind="captions" />
        </audio>
      ) : null}
      <div className="bg-[#f7f3ea] p-5">
        <p className="mb-2 text-lg font-semibold text-stone-700">Transcript</p>
        <p className="whitespace-pre-wrap text-2xl leading-relaxed">{node.transcript}</p>
      </div>
    </div>
  );
}

function QuestionList(props: {
  nodes: MemoryNode[];
  activeQuestionId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-2xl font-bold">Interview path</h2>
      <div className="space-y-3">
        {props.nodes.map((node, index) => {
          const isActive = node.id === props.activeQuestionId;
          const depth = getDepth(props.nodes, node);
          return (
            <button
              className={`w-full border p-4 text-left transition ${
                isActive ? "border-teal-700 bg-teal-50" : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
              key={node.id}
              onClick={() => props.onSelect(node.id)}
              style={{ marginLeft: `${Math.min(depth, 3) * 14}px`, width: `calc(100% - ${Math.min(depth, 3) * 14}px)` }}
              type="button"
            >
              <div className="mb-2 flex items-center gap-2 text-base font-semibold text-stone-600">
                {node.status === "answered" ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-700" />
                ) : (
                  <Circle className="h-5 w-5 text-stone-400" />
                )}
                Question {index + 1}
              </div>
              <p className="text-lg font-semibold leading-snug">{node.question}</p>
              {node.parentQuestionId ? <p className="mt-2 text-sm text-stone-500">Follow-up</p> : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function getDepth(nodes: MemoryNode[], node: MemoryNode) {
  let depth = 0;
  let parentId = node.parentQuestionId;
  while (parentId) {
    const parent = nodes.find((candidate) => candidate.id === parentId);
    if (!parent) {
      break;
    }
    depth += 1;
    parentId = parent.parentQuestionId;
  }
  return depth;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
