import { Loader2, Mic, Pause, RotateCcw, Save } from "lucide-react";
import { formatTime } from "../lib/interview";
import type { InterviewState, MemoryNode } from "../types";
import { useRecorder } from "../useRecorder";
import { saveAnswer } from "../api";
import { AnsweredMemory } from "./AnsweredMemory";

type RecorderPanelProps = {
  question: MemoryNode;
  onSaved: (state: InterviewState) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  setError: (message: string | null) => void;
};

export function RecorderPanel({ question, onSaved, saving, setSaving, setError }: RecorderPanelProps) {
  const recorder = useRecorder();
  const isAnswered = question.status === "answered";
  const isProcessing = question.status === "processing";
  const progress = Math.min(100, (recorder.seconds / recorder.maxSeconds) * 100);

  async function confirmSave() {
    if (!recorder.audioBlob) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveAnswer(question.id, recorder.audioBlob);
      recorder.reset();
      onSaved(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the answer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[34rem] flex-col justify-between gap-8">
      <div className="space-y-4">
        <p className="label">{isAnswered ? "Saved memory" : isProcessing ? "Saving in progress" : "Current question"}</p>
        <h2 className="font-serif text-3xl leading-tight text-ink md:text-4xl">{question.question}</h2>
      </div>

      {isAnswered ? (
        <AnsweredMemory node={question} />
      ) : isProcessing ? (
        <div className="rounded-xl border border-linen-200 bg-white p-6 text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-umber" />
          <p className="text-lg text-ink-muted">
            Uploading, transcribing, and preparing the next question. This can take a minute.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-ink-muted">
              <span>Recording time</span>
              <span>{formatTime(recorder.seconds)} / {formatTime(recorder.maxSeconds)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-linen-200">
              <div className="h-full rounded-full bg-umber transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <p className="text-center font-serif text-5xl tabular-nums text-ink">{formatTime(recorder.seconds)}</p>

          {recorder.error ? <p className="text-center text-lg text-[#8B3A3A]">{recorder.error}</p> : null}

          {recorder.audioUrl ? (
            <div className="space-y-5">
              <audio controls src={recorder.audioUrl}>
                <track kind="captions" />
              </audio>
              <div className="grid gap-3 md:grid-cols-2">
                <button className="btn-secondary" onClick={recorder.reset} type="button">
                  <RotateCcw className="h-5 w-5" />
                  Re-record
                </button>
                <button className="btn-primary" disabled={saving} onClick={confirmSave} type="button">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {saving ? "Saving memory" : "Save answer"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className={`${recorder.isRecording ? "btn-danger" : "btn-primary"} mx-auto w-full max-w-xl`}
              onClick={recorder.isRecording ? recorder.stop : recorder.start}
              type="button"
            >
              {recorder.isRecording ? <Pause className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              {recorder.isRecording ? "Stop recording" : "Record answer"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
