import { Loader2, Play, Trash2 } from "lucide-react";
import { seriesLabel } from "../lib/interview";
import type { MemoryNode } from "../types";

type SavedRecordingProps = {
  node: MemoryNode;
  onDelete: (questionId: string) => void;
  deleting: boolean;
};

export function SavedRecording({ node, onDelete, deleting }: SavedRecordingProps) {
  return (
    <article className="rounded-lg border border-[#e0e0e0] bg-[#fafafa] p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#666]">{seriesLabel(node)}</p>
          <h3 className="mt-1 text-base font-normal text-[#1a1a1a]">{node.question}</h3>
        </div>
        {node.status === "processing" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6b4c9a]" aria-hidden="true" />
        ) : null}
      </div>

      {node.mp3Url ? (
        <audio controls preload="metadata" src={node.mp3Url} className="mb-3">
          <track kind="captions" />
        </audio>
      ) : null}

      {node.transcript ? (
        <p className="mb-3 text-sm leading-relaxed text-[#444]">{node.transcript}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {node.mp3Url ? (
          <a className="btn-secondary px-3 py-2 text-sm" href={node.mp3Url} target="_blank" rel="noreferrer">
            <Play className="h-4 w-4" />
            Replay
          </a>
        ) : null}
        <button
          className="btn-danger px-3 py-2 text-sm"
          disabled={deleting || node.status === "processing"}
          onClick={() => onDelete(node.id)}
          type="button"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete
        </button>
      </div>
    </article>
  );
}
