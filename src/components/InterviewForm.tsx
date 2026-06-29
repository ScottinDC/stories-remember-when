import React from "react";
import { Check, Loader2, Mic, Pause, RotateCcw, Save } from "lucide-react";
import {
  answeredNodes,
  chooseNextQuestion,
  formatTime,
  FOUNDATION_COUNT,
  promptLabel,
  questionNumber,
  sortBySeries
} from "../lib/interview";
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

  const progressSteps = sorted.filter((node) => node.depth === 0).slice(0, FOUNDATION_COUNT);
  const foundationSaved = saved.filter((node) => node.depth === 0).length;
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
      setError(err instanceof Error ? err.message : "Could not save the response.");
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
      setError(err instanceof Error ? err.message : "Could not delete the response.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-9">
      <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_428px]">
        <QuestionSeries activeQuestionId={activeQuestionId} nodes={sorted} onSelect={setActiveQuestionId} />

        <aside className="flex flex-col gap-6">
          <section className="form-card px-7 pb-[30px] pt-7">
            <div className="mb-[26px] flex items-center gap-0 font-mono">
              {progressSteps.map((step, index) => {
                const stepAnswered = saved.some(
                  (node) => node.sequenceOrder === step.sequenceOrder || node.id === step.id
                );
                const isActive = current?.sequenceOrder === step.sequenceOrder;
                return (
                  <React.Fragment key={step.id}>
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        stepAnswered
                          ? "bg-navy text-white"
                          : isActive
                            ? "border-[1.5px] border-line-hair bg-white text-ink-faint ring-2 ring-navy/20"
                            : "border-[1.5px] border-line-hair bg-white text-[#b3ada3]"
                      }`}
                    >
                      {stepAnswered ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </div>
                    {index < progressSteps.length - 1 ? (
                      <div className={`h-[1.5px] flex-1 ${stepAnswered ? "bg-navy/50" : "bg-line-hair"}`} />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="mb-4 flex items-baseline justify-between border-b border-line-soft pb-3.5">
              <h2 className="panel-title">Current Question</h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                {String(foundationSaved).padStart(2, "0")} / {String(progressSteps.length).padStart(2, "0")} saved
              </span>
            </div>

            {current ? (
              <div className="space-y-6">
                <div>
                  <p className="field-label mb-3">{promptLabel(current)}</p>
                  <p className="text-[21px] font-semibold leading-snug text-ink">{current.question}</p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">
                      <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-record" />
                      Recording time
                    </span>
                    <span className="text-[13px] text-ink-secondary">
                      {formatTime(recorder.seconds)}{" "}
                      <span className="text-[#b3ada3]">/ {formatTime(recorder.maxSeconds)}</span>
                    </span>
                  </div>
                  <div className="mb-6 h-1 overflow-hidden rounded-sm bg-line-soft">
                    <div className="h-full bg-navy transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {recorder.error ? <p className="text-sm text-[#9b2c2c]">{recorder.error}</p> : null}

                {recorder.audioUrl ? (
                  <div className="space-y-3">
                    <audio controls src={recorder.audioUrl}>
                      <track kind="captions" />
                    </audio>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary !w-auto" onClick={recorder.reset} type="button">
                        <RotateCcw className="h-4 w-4" />
                        Re-record
                      </button>
                      <button className="btn-primary !w-auto" disabled={saving} onClick={handleSaveCurrent} type="button">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save response
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={recorder.isRecording ? "btn-danger" : "btn-primary"}
                    onClick={recorder.isRecording ? recorder.stop : recorder.start}
                    type="button"
                  >
                    {recorder.isRecording ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {recorder.isRecording ? "Stop recording" : "Record response"}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                All current questions are saved. Choose another from the question series.
              </p>
            )}
          </section>

          <RecordingLibrary deletingId={deletingId} nodes={nodes} onDelete={handleDelete} />
        </aside>
      </div>

      <SankeyDiagram nodes={nodes} />
    </div>
  );
}
