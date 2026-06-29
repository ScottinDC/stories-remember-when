import { Loader2 } from "lucide-react";
import { FOUNDATION_COUNT, questionNumber, seriesLabel } from "../lib/interview";
import type { MemoryNode } from "../types";

type QuestionSeriesProps = {
  nodes: MemoryNode[];
  activeQuestionId: string | null;
  onSelect: (id: string) => void;
};

function statusEyebrow(node: MemoryNode, isActive: boolean) {
  if (isActive && node.status === "pending") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#9db8d0]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5fb0e8]" />
        Current
      </span>
    );
  }
  if (node.status === "processing") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
        <Loader2 className="h-3 w-3 animate-spin" />
        Working
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">{seriesLabel(node)}</span>
  );
}

export function QuestionSeries({ nodes, activeQuestionId, onSelect }: QuestionSeriesProps) {
  const foundation = nodes.filter((node) => node.depth === 0).slice(0, FOUNDATION_COUNT);
  const followUps = nodes.filter((node) => node.depth > 0);

  return (
    <section className="form-card">
      <div className="card-header mx-5 mt-1">
        <h2 className="panel-title">Question Series</h2>
        <span className="panel-subtitle">{foundation.length} prompts</span>
      </div>

      <ol className="m-0 list-none px-2 pb-2 pt-1">
        {foundation.map((node, index) => {
          const isActive = node.id === activeQuestionId;
          const isLast = index === foundation.length - 1 && followUps.length === 0;

          if (isActive) {
            return (
              <li className="my-2 px-3" key={node.id}>
                <button
                  className="grid w-full grid-cols-[2.75rem_1fr] items-start gap-3 rounded bg-navy px-4 py-3.5 text-left text-white"
                  onClick={() => onSelect(node.id)}
                  type="button"
                >
                  <span className="font-serif text-[1.75rem] font-normal leading-none tabular-nums">{questionNumber(node)}</span>
                  <span>
                    <span className="mb-1 block">{statusEyebrow(node, true)}</span>
                    <span className="text-[15px] font-medium leading-snug text-[#f4f7fa]">{node.question}</span>
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li
              className={`grid grid-cols-[2.75rem_1fr] items-start gap-3 px-3 py-3.5 ${isLast ? "" : "border-b border-line-soft/80"}`}
              key={node.id}
            >
              <button className="contents text-left" onClick={() => onSelect(node.id)} type="button">
                <span className="font-serif text-[1.75rem] font-normal leading-none tabular-nums text-num">
                  {questionNumber(node)}
                </span>
                <span>
                  <span className="mb-1 block">{statusEyebrow(node, false)}</span>
                  <span className="text-[15px] leading-snug text-ink-secondary">{node.question}</span>
                </span>
              </button>
            </li>
          );
        })}

        {followUps.map((node) => {
          const isActive = node.id === activeQuestionId;
          return (
            <li className="border-t border-line-soft/80 px-3 py-3" key={node.id}>
              <button
                className={`grid w-full grid-cols-[2.75rem_1fr] items-start gap-3 text-left ${isActive ? "rounded bg-navy px-3 py-2.5 text-white" : ""}`}
                onClick={() => onSelect(node.id)}
                type="button"
              >
                <span
                  className={`font-serif text-xl font-normal leading-none tabular-nums ${isActive ? "text-white" : "text-num"}`}
                >
                  {questionNumber(node)}
                </span>
                <span>
                  <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    {node.branchLabel} · gen {node.generation}
                  </span>
                  <span className={`text-sm leading-snug ${isActive ? "text-[#f4f7fa]" : "text-ink-secondary"}`}>
                    {node.question}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
