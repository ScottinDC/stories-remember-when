import React from "react";
import { Check, Loader2, Mic, Pause, RotateCcw, Save } from "lucide-react";
import { toTitleCase } from "../lib/titleCase";
import { answeredNodes, chooseNextQuestion, formatTime, seriesLabel, sortBySeries } from "../lib/interview";
import type { InterviewState } from "../types";
import { useRecorder } from "../useRecorder";
import { deleteAnswer, saveAnswer } from "../api";
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
  const progress = Math.min(100, (recorder.seconds / recorder.maxSeconds) * 100);

  async function handleSaveCurrent() {
    if (!current || !recorder.audioBlob) {
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <QuestionSeries activeQuestionId={activeQuestionId} nodes={sorted} onSelect={setActiveQuestionId} />

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
                        ? "bg-umber text-linen-50"
                        : isActive
                          ? "bg-umber-soft text-ink"
                          : "bg-linen-200 text-ink-faint"
                    }`}
                  >
                    {stepAnswered ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < progressSteps.length - 1 ? <div className="h-px flex-1 bg-linen-200" /> : null}
                </div>
              );
            })}
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-normal text-ink">{toTitleCase(state.thread.title)}</h2>
            <p className="mt-1 text-sm text-ink-muted">{saved.length} saved · OpenAI guides each follow-up</p>
          </div>

          {current ? (
            <div className="space-y-5">
              <div className="input-box">
                <p className="field-label mb-1">{seriesLabel(current)}</p>
                <p className="text-base text-ink">{current.question}</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-ink-muted">
                  <span>Recording time</span>
                  <span>
                    {formatTime(recorder.seconds)} / {formatTime(recorder.maxSeconds)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-linen-200">
                  <div className="h-full rounded-full bg-umber transition-all" style={{ width: `${progress}%` }} />
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
                      Save answer
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
        </div>

        <RecordingLibrary deletingId={deletingId} nodes={nodes} onDelete={handleDelete} />
        </div>
      </div>

      <div className="w-full">
        <SankeyDiagram nodes={nodes} />
      </div>
    </div>
  );
}
