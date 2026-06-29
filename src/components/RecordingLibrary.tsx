import React from "react";
import { Download, DownloadCloud, Loader2, Pause, Play, Trash2 } from "lucide-react";
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

function RecordingRow({
  node,
  deleting,
  onDelete,
  playingId,
  onPlay,
  onPause
}: {
  node: MemoryNode;
  deleting: boolean;
  onDelete: (id: string) => void;
  playingId: string | null;
  onPlay: (id: string, url: string) => void;
  onPause: () => void;
}) {
  const isPlaying = playingId === node.id;
  const canPlay = Boolean(node.mp3Url && node.status === "answered");

  return (
    <article className="rounded-lg border border-linen-200 bg-linen-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-faint">{seriesLabel(node)}</p>
          <h3 className="mt-1 text-base font-normal text-ink">{node.question}</h3>
        </div>
        {node.status === "processing" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-umber" aria-hidden="true" />
        ) : null}
      </div>

      {node.transcript ? (
        <p className="mb-3 text-sm leading-relaxed text-ink-muted">{node.transcript}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          aria-label="Play recording"
          className="btn-icon"
          disabled={!canPlay || isPlaying}
          onClick={() => node.mp3Url && onPlay(node.id, node.mp3Url)}
          type="button"
        >
          <Play className="h-4 w-4" />
        </button>
        <button
          aria-label="Pause recording"
          className="btn-icon"
          disabled={!canPlay || !isPlaying}
          onClick={onPause}
          type="button"
        >
          <Pause className="h-4 w-4" />
        </button>
        <button
          aria-label="Delete recording"
          className="btn-icon text-[#8b3a3a] hover:bg-[#fff5f5]"
          disabled={deleting || node.status === "processing"}
          onClick={() => onDelete(node.id)}
          type="button"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
        <button
          aria-label="Download recording"
          className="btn-icon"
          disabled={!canPlay}
          onClick={() => downloadRecording(node)}
          type="button"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export function RecordingLibrary({ nodes, onDelete, deletingId }: RecordingLibraryProps) {
  const recordings = answeredNodes(nodes).filter((node) => node.mp3Url || node.status === "processing");
  const completed = recordings.filter((node) => node.status === "answered" && node.mp3Url);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function handlePlay(id: string, url: string) {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => setPlayingId(null));
    }
    audioRef.current.src = url;
    audioRef.current.play();
    setPlayingId(id);
  }

  function handlePause() {
    audioRef.current?.pause();
    setPlayingId(null);
  }

  return (
    <div className="form-card p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-normal text-ink">Saved Recordings</h2>
          <p className="mt-1 text-sm text-ink-muted">{completed.length} completed</p>
        </div>
        <button
          className="btn-secondary px-3 py-2 text-sm"
          disabled={completed.length === 0}
          onClick={() => downloadAll(completed)}
          type="button"
        >
          <DownloadCloud className="h-4 w-4" />
          Download all
        </button>
      </div>

      {recordings.length === 0 ? (
        <p className="text-sm text-ink-muted">Recordings will appear here as each answer is saved.</p>
      ) : (
        <div className="space-y-3">
          {recordings.map((node) => (
            <RecordingRow
              deleting={deletingId === node.id}
              key={node.id}
              node={node}
              onDelete={onDelete}
              onPause={handlePause}
              onPlay={handlePlay}
              playingId={playingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
