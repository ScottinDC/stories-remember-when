import React from "react";
import { Check, Loader2, Mic, Pause, RotateCcw, Save, Upload } from "lucide-react";
import { answeredNodes, chooseNextQuestion, formatTime, seriesLabel, sortBySeries } from "../lib/interview";
import type { InterviewState, MemoryNode, QueuedRecording } from "../types";
import { useRecorder } from "../useRecorder";
import { deleteAnswer, saveAllAnswers, saveAnswer } from "../api";
import { SavedRecording } from "./SavedRecording";

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

  const progress = Math.min(100, (recorder.seconds / recorder.maxSeconds) * 100);

  return (
    <div className="space-y-5">
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
                      ? "bg-[#f0c419] text-[#1a1a1a]"
                      : isActive
                        ? "bg-[#6b4c9a] text-white"
                        : "bg-[#e8e8e8] text-[#888]"
                  }`}
                >
                  {stepAnswered ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < progressSteps.length - 1 ? <div className="h-px flex-1 bg-[#ddd]" /> : null}
              </div>
            );
          })}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-normal text-[#1a1a1a]">{state.thread.title}</h1>
            <p className="mt-1 text-sm text-[#666]">{answeredCount} saved · OpenAI guides each follow-up</p>
          </div>
          <div className="flex rounded-lg border border-[#d4d4d4] p-1">
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${saveMode === "one" ? "bg-[#6b4c9a] text-white" : "text-[#666]"}`}
              onClick={() => setSaveMode("one")}
              type="button"
            >
              Save one at a time
            </button>
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${saveMode === "batch" ? "bg-[#6b4c9a] text-white" : "text-[#666]"}`}
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
              <h2 className="text-base font-normal text-[#1a1a1a]">{current.question}</h2>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-[#666]">
                <span>Recording time</span>
                <span>
                  {formatTime(recorder.seconds)} / {formatTime(recorder.maxSeconds)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e8e8e8]">
                <div className="h-full rounded-full bg-[#6b4c9a] transition-all" style={{ width: `${progress}%` }} />
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
          <p className="text-base text-[#666]">All current questions are saved. Choose a follow-up from the tree below.</p>
        )}

        {saveMode === "batch" && queue.length > 0 ? (
          <div className="mt-6 space-y-3 border-t border-[#eee] pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-normal text-[#1a1a1a]">Ready to upload ({queue.length})</h3>
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
                <div className="rounded-lg border border-[#e0e0e0] bg-[#fafafa] p-3" key={entry.questionId}>
                  <p className="mb-2 text-sm text-[#666]">{seriesLabel(node)}</p>
                  <audio controls src={entry.url}>
                    <track kind="captions" />
                  </audio>
                  <button className="btn-danger mt-2 px-3 py-2 text-sm" onClick={() => removeQueued(entry.questionId)} type="button">
                    Remove from queue
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {saved.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-base font-normal text-[#1a1a1a]">Saved recordings</h2>
          {saved.map((node) => (
            <SavedRecording
              deleting={deletingId === node.id}
              key={node.id}
              node={node}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : null}

      <QuestionPicker
        activeQuestionId={activeQuestionId}
        nodes={sorted}
        onSelect={setActiveQuestionId}
      />
    </div>
  );
}

function QuestionPicker({
  nodes,
  activeQuestionId,
  onSelect
}: {
  nodes: MemoryNode[];
  activeQuestionId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="form-card p-4">
      <h2 className="mb-3 text-base font-normal text-[#1a1a1a]">Question series</h2>
      <div className="space-y-2">
        {nodes.map((node) => (
          <button
            className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${
              node.id === activeQuestionId
                ? "border-[#6b4c9a] bg-[#f3eef8]"
                : "border-[#e0e0e0] bg-white hover:bg-[#fafafa]"
            }`}
            key={node.id}
            onClick={() => onSelect(node.id)}
            type="button"
          >
            <span className="text-[#666]">{seriesLabel(node)} · {node.status}</span>
            <p className="mt-1 text-base text-[#1a1a1a]">{node.question}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
