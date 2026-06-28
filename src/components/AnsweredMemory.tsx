import type { MemoryNode } from "../types";

export function AnsweredMemory({ node }: { node: MemoryNode }) {
  return (
    <div className="space-y-5">
      {node.mp3Url ? (
        <audio controls src={node.mp3Url}>
          <track kind="captions" />
        </audio>
      ) : null}
      <div className="rounded-xl border border-linen-200 bg-white p-5">
        <p className="label mb-3">Transcript</p>
        <p className="font-serif text-xl leading-relaxed text-ink md:text-2xl">{node.transcript}</p>
      </div>
    </div>
  );
}
