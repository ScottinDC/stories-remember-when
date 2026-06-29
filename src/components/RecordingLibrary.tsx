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
    <article className="border-t border-line-soft py-4 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">{branchCaption(node)}</p>
          <h3 className="mt-1 text-sm font-medium leading-snug text-ink">{node.question}</h3>
        </div>
        {node.status === "processing" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-navy-light" aria-hidden="true" />
        ) : null}
      </div>

      {node.transcript ? (
        <p className="mb-3 text-sm leading-relaxed text-ink-muted">{node.transcript}</p>
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
    <section className="form-card px-[26px] pb-[26px] pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-serif text-[19px] font-medium text-ink">Saved Recordings</h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
            {String(completed.length).padStart(2, "0")} done
          </span>
        </div>
        <button
          aria-label="Download all recordings"
          className="flex h-9 w-9 items-center justify-center rounded border border-line bg-fill hover:bg-page disabled:opacity-40"
          disabled={completed.length === 0}
          onClick={() => downloadAll(completed)}
          type="button"
        >
          <Download className="h-4 w-4 text-ink-placeholder" />
        </button>
      </div>

      {recordings.length === 0 ? (
        <div className="flex items-center gap-3 border-t border-line-soft pt-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed border-line-hair bg-page">
            <Volume2 className="h-[17px] w-[17px] text-[#b3ada3]" />
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
