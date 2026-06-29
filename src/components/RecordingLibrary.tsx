import React from "react";
import { Download, Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { answeredNodes, branchCaption, questionNumber } from "../lib/interview";
import type { MemoryNode } from "../types";

type RecordingLibraryProps = {
  nodes: MemoryNode[];
  onDelete: (questionId: string) => void;
  deletingId: string | null;
};

function downloadFilename(node: MemoryNode) {
  return `remember-when-q${questionNumber(node)}.webm`;
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
    <article className="border-t border-line-soft/80 py-3 first:border-t-0 first:pt-0">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">{branchCaption(node)}</p>
          <h3 className="mt-0.5 text-sm font-medium leading-snug text-ink">{node.question}</h3>
        </div>
        {node.status === "processing" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-light" aria-hidden="true" />
        ) : null}
      </div>

      {node.transcript ? (
        <p className="mb-2.5 text-sm leading-relaxed text-ink-muted">{node.transcript}</p>
      ) : null}

      <div className="flex items-center gap-1.5">
        <button
          aria-label="Play recording"
          className="btn-icon"
          disabled={!canPlay || isPlaying}
          onClick={() => node.mp3Url && onPlay(node.id, node.mp3Url)}
          type="button"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Pause recording"
          className="btn-icon"
          disabled={!canPlay || !isPlaying}
          onClick={onPause}
          type="button"
        >
          <Pause className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Re-record response"
          className="btn-icon text-navy-light hover:border-navy-light/40 hover:bg-page"
          disabled={deleting || node.status === "processing"}
          onClick={() => onDelete(node.id)}
          title="Re-record"
          type="button"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        </button>
        <button
          aria-label="Download recording"
          className="btn-icon"
          disabled={!canPlay}
          onClick={() => downloadRecording(node)}
          type="button"
        >
          <Download className="h-3.5 w-3.5" />
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
    <section className="form-card card-body">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="panel-title">Saved Recordings</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint tabular-nums">
            {String(completed.length).padStart(2, "0")} saved
          </span>
        </div>
        <button
          aria-label="Download all recordings"
          className="btn-icon"
          disabled={completed.length === 0}
          onClick={() => downloadAll(completed)}
          type="button"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {recordings.length === 0 ? (
        <div className="flex items-center gap-2.5 border-t border-line-soft/80 pt-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-dashed border-line-hair bg-page">
            <Volume2 className="h-4 w-4 text-ink-placeholder" />
          </div>
          <p className="m-0 text-sm leading-relaxed text-ink-placeholder">
            Recordings will appear here as each response is saved.
          </p>
        </div>
      ) : (
        <div>
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
    </section>
  );
}
