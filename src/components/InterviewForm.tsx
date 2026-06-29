import React from "react";
import { Check, Loader2, Mic, Pause, RotateCcw, Save, Upload } from "lucide-react";
import { answeredNodes, chooseNextQuestion, formatTime, seriesLabel, sortBySeries } from "../lib/interview";
import type { InterviewState, QueuedRecording } from "../types";
import { useRecorder } from "../useRecorder";
import { deleteAnswer, saveAllAnswers, saveAnswer } from "../api";
import { QuestionSeries } from "./QuestionSeries";
import { RecordingLibrary } from "./RecordingLibrary";
import { SankeyDiagram } from "./SankeyDiagram";

type InterviewFormProps = {
  state: InterviewState;
  onStateChange: (state: InterviewState) => void;
  setError: (message: string | null) => void;
};

export function InterviewForm({ state, onStateChange, setError }: InterviewFormProps) {
  const nodes = state.nodes;
  const sorted = sortBySeries(nodes);
  const saved = answeredNodes(nodes);
  const activeQuestion = chooseNextQuestion(nodes);
  const recorder = useRecorder();
  const [saveMode, setSaveMode] = React.useState<"one" | "batch">("one");
  const [queue, setQueue] = React.useState<QueuedRecording[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [activeQuestionId, setActiveQuestionId] = React.useState<string | null>(activeQuestion?.id ?? null);

  React.useEffect(() => {
    if (!activeQuestionId && activeQuestion) {
      setActiveQuestionId(activeQuestion.id);
    }
  }, [activeQuestion, activeQuestionId]);

  const current =
    nodes.find((node) => node.id === activeQuestionId && node.status === "pending") ?? activeQuestion;

  const progressSteps = sorted.filter((node) => node.depth === 0).slice(0, 5);
  const answeredCount = saved.length;
  const progress = Math.min(100, (recorder.seconds / recorder.maxSeconds) * 100);

  async function handleSaveCurrent() {
    if (!current || !recorder.audioBlob) {
      return;
    }

    if (saveMode === "batch") {
      setQueue((existing) => {
        const nextQueue = [
          ...existing.filter((entry) => entry.questionId !== current.id),
          { questionId: current.id, blob: recorder.audioBlob!, url: recorder.audioUrl ?? "" }
        ];
        const queuedIds = new Set(nextQueue.map((entry) => entry.questionId));
        const next = nodes.find((node) => node.status === "pending" && !queuedIds.has(node.id));
        setActiveQuestionId(next?.id ?? null);
        return nextQueue;
      });
      recorder.reset();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveAnswer(current.id, recorder.audioBlob);
      recorder.reset();
      onStateChange(result.state);
      setActiveQuestionId(chooseNextQuestion(result.state.nodes)?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the answer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    if (queue.length === 0) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveAllAnswers(queue.map((entry) => ({ questionId: entry.questionId, blob: entry.blob })));
      queue.forEach((entry) => URL.revokeObjectURL(entry.url));
      setQueue([]);
      onStateChange(result.state);
      setActiveQuestionId(chooseNextQuestion(result.state.nodes)?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save all answers.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(questionId: string) {
    setDeletingId(questionId);
    setError(null);
    try {
      const result = await deleteAnswer(questionId);
      onStateChange(result.state);
      setActiveQuestionId(chooseNextQuestion(result.state.nodes)?.id ?? questionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the answer.");
    } finally {
      setDeletingId(null);
    }
  }

  function removeQueued(questionId: string) {
    setQueue((existing) => {
      const entry = existing.find((item) => item.questionId === questionId);
      if (entry) {
        URL.revokeObjectURL(entry.url);
      }
      return existing.filter((item) => item.questionId !== questionId);
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-2 lg:items-start">
      {/* Left column */}
      <div className="flex flex-col gap-5">
        <QuestionSeries
          activeQuestionId={activeQuestionId}
          nodes={sorted}
          onSelect={setActiveQuestionId}
        />
        <SankeyDiagram nodes={nodes} />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-5">
        <div className="form-card p-5 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            {progressSteps.map((step, index) => {
              const stepAnswered = saved.some(
                (node) => node.sequenceOrder === step.sequenceOrder || node.id === step.id
              );
              const isActive = current?.sequenceOrder === step.sequenceOrder;
              return (
                <div className="flex flex-1 items-center gap-2" key={step.id}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                      stepAnswered
                        ? "bg-dusty text-white"
                        : isActive
                          ? "bg-pale text-ink"
                          : "bg-sand/50 text-ink-muted"
                    }`}
                  >
                    {stepAnswered ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < progressSteps.length - 1 ? <div className="h-px flex-1 bg-sand" /> : null}
                </div>
              );
            })}
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-normal text-ink">{state.thread.title}</h1>
              <p className="mt-1 text-sm text-ink-muted">{answeredCount} saved · OpenAI guides each follow-up</p>
            </div>
            <div className="flex rounded-lg border border-sand bg-cream/40 p-1">
              <button
                className={`rounded-md px-3 py-1.5 text-sm ${saveMode === "one" ? "bg-dusty text-white" : "text-ink-muted"}`}
                onClick={() => setSaveMode("one")}
                type="button"
              >
                One at a time
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm ${saveMode === "batch" ? "bg-dusty text-white" : "text-ink-muted"}`}
                onClick={() => setSaveMode("batch")}
                type="button"
              >
                Save all at once
              </button>
            </div>
          </div>

          {current ? (
            <div className="space-y-5">
              <div className="input-box">
                <p className="field-label mb-1">{seriesLabel(current)}</p>
                <h2 className="text-base font-normal text-ink">{current.question}</h2>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-ink-muted">
                  <span>Recording time</span>
                  <span>
                    {formatTime(recorder.seconds)} / {formatTime(recorder.maxSeconds)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-sand/40">
                  <div className="h-full rounded-full bg-dusty transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {recorder.error ? <p className="text-sm text-[#8b3a3a]">{recorder.error}</p> : null}

              {recorder.audioUrl ? (
                <div className="space-y-4">
                  <audio controls src={recorder.audioUrl}>
                    <track kind="captions" />
                  </audio>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={recorder.reset} type="button">
                      <RotateCcw className="h-4 w-4" />
                      Re-record
                    </button>
                    <button className="btn-primary" disabled={saving} onClick={handleSaveCurrent} type="button">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saveMode === "batch" ? "Add to queue" : "Save answer"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={`${recorder.isRecording ? "btn-danger" : "btn-primary"} w-full`}
                  onClick={recorder.isRecording ? recorder.stop : recorder.start}
                  type="button"
                >
                  {recorder.isRecording ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {recorder.isRecording ? "Stop recording" : "Record answer"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-base text-ink-muted">
              All current questions are saved. Choose another from the question series.
            </p>
          )}

          {saveMode === "batch" && queue.length > 0 ? (
            <div className="mt-6 space-y-3 border-t border-sand pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-normal text-ink">Ready to upload ({queue.length})</h3>
                <button className="btn-primary" disabled={saving} onClick={handleSaveAll} type="button">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Save all
                </button>
              </div>
              {queue.map((entry) => {
                const node = nodes.find((candidate) => candidate.id === entry.questionId);
                if (!node) {
                  return null;
                }
                return (
                  <div className="rounded-lg border border-sand bg-cream/50 p-3" key={entry.questionId}>
                    <p className="mb-2 text-sm text-ink-muted">{seriesLabel(node)}</p>
                    <audio controls src={entry.url}>
                      <track kind="captions" />
                    </audio>
                    <button
                      className="btn-danger mt-2 px-3 py-2 text-sm"
                      onClick={() => removeQueued(entry.questionId)}
                      type="button"
                    >
                      Remove from queue
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <RecordingLibrary deletingId={deletingId} nodes={nodes} onDelete={handleDelete} />
      </div>
    </div>
  );
}
