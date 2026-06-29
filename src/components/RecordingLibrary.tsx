import { Download, DownloadCloud, Loader2, Music2, Trash2 } from "lucide-react";
import { answeredNodes, seriesLabel } from "../lib/interview";
import type { MemoryNode } from "../types";

type RecordingLibraryProps = {
  nodes: MemoryNode[];
  onDelete: (questionId: string) => void;
  deletingId: string | null;
};

function downloadFilename(node: MemoryNode) {
  const order = String(node.sequenceOrder).padStart(2, "0");
  return `remember-when-q${order}.webm`;
}

async function downloadRecording(node: MemoryNode) {
  if (!node.mp3Url) {
    return;
  }
  const response = await fetch(node.mp3Url);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadFilename(node);
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadAll(recordings: MemoryNode[]) {
  for (const node of recordings) {
    if (!node.mp3Url || node.status !== "answered") {
      continue;
    }
    await downloadRecording(node);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

export function RecordingLibrary({ nodes, onDelete, deletingId }: RecordingLibraryProps) {
  const recordings = answeredNodes(nodes).filter((node) => node.mp3Url || node.status === "processing");

  return (
    <div className="form-card p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-normal text-ink">Saved recordings</h2>
          <p className="mt-1 text-sm text-ink-muted">{recordings.length} completed</p>
        </div>
        {recordings.some((node) => node.status === "answered" && node.mp3Url) ? (
          <button
            className="btn-secondary px-3 py-2 text-sm"
            onClick={() => downloadAll(recordings)}
            type="button"
          >
            <DownloadCloud className="h-4 w-4" />
            Download all
          </button>
        ) : null}
      </div>

      {recordings.length === 0 ? (
        <p className="text-sm text-ink-muted">Recordings will appear here as each answer is saved.</p>
      ) : (
        <div className="space-y-3">
          {recordings.map((node) => (
            <article className="rounded-lg border border-sand bg-cream/50 p-4" key={node.id}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-dusty" aria-hidden="true" />
                  <div>
                    <p className="text-sm text-ink-muted">{seriesLabel(node)}</p>
                    <h3 className="mt-1 text-base font-normal text-ink">{node.question}</h3>
                  </div>
                </div>
                {node.status === "processing" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dusty" aria-hidden="true" />
                ) : null}
              </div>

              {node.mp3Url ? (
                <audio controls preload="metadata" src={node.mp3Url} className="mb-3">
                  <track kind="captions" />
                </audio>
              ) : null}

              {node.transcript ? (
                <p className="mb-3 text-sm leading-relaxed text-ink-muted">{node.transcript}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {node.mp3Url && node.status === "answered" ? (
                  <button
                    className="btn-secondary px-3 py-2 text-sm"
                    onClick={() => downloadRecording(node)}
                    type="button"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                ) : null}
                <button
                  className="btn-danger px-3 py-2 text-sm"
                  disabled={deletingId === node.id || node.status === "processing"}
                  onClick={() => onDelete(node.id)}
                  type="button"
                >
                  {deletingId === node.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
