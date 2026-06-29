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
      <span className="flex items-center gap-2 font-mono text-[10.5px] font-normal uppercase tracking-[0.18em] text-[#9db8d0]">
        <span className="inline-block h-[7px] w-[7px] rounded-full bg-[#5fb0e8]" />
        Current prompt
      </span>
    );
  }
  if (node.status === "processing") {
    return (
      <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">
        <Loader2 className="h-3 w-3 animate-spin" />
        Working
      </span>
    );
  }
  return (
    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">{seriesLabel(node)}</span>
  );
}

export function QuestionSeries({ nodes, activeQuestionId, onSelect }: QuestionSeriesProps) {
  const foundation = nodes.filter((node) => node.depth === 0).slice(0, FOUNDATION_COUNT);
  const followUps = nodes.filter((node) => node.depth > 0);

  return (
    <section className="form-card px-[26px] pb-3.5 pt-2">
      <div className="flex items-baseline justify-between border-b border-ink-body py-[18px]">
        <h2 className="panel-title">Question Series</h2>
        <span className="panel-subtitle">{foundation.length} Prompts</span>
      </div>

      <ol className="m-0 list-none p-0">
        {foundation.map((node, index) => {
          const isActive = node.id === activeQuestionId;
          const isLast = index === foundation.length - 1 && followUps.length === 0;

          if (isActive) {
            return (
              <li className="my-3.5" key={node.id}>
                <button
                  className="grid w-full grid-cols-[54px_1fr] items-start gap-5 rounded bg-navy p-[22px] text-left text-white"
                  onClick={() => onSelect(node.id)}
                  type="button"
                >
                  <span className="font-serif text-[34px] font-normal leading-none">{questionNumber(node)}</span>
                  <span>
                    <span className="mb-2 block">{statusEyebrow(node, true)}</span>
                    <span className="text-lg font-medium leading-snug text-[#f4f7fa]">{node.question}</span>
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li
              className={`grid grid-cols-[54px_1fr] items-start gap-5 py-5 ${isLast ? "pb-1.5" : "border-b border-line-soft"}`}
              key={node.id}
            >
              <button className="contents text-left" onClick={() => onSelect(node.id)} type="button">
                <span className="font-serif text-[34px] font-normal leading-none text-num">{questionNumber(node)}</span>
                <span>
                  <span className="mb-2 block">{statusEyebrow(node, false)}</span>
                  <span className="text-lg leading-snug text-ink-secondary">{node.question}</span>
                </span>
              </button>
            </li>
          );
        })}

        {followUps.map((node) => {
          const isActive = node.id === activeQuestionId;
          return (
            <li className="border-t border-line-soft py-4" key={node.id}>
              <button
                className={`grid w-full grid-cols-[54px_1fr] items-start gap-5 text-left ${isActive ? "rounded bg-navy/90 p-4 text-white" : ""}`}
                onClick={() => onSelect(node.id)}
                type="button"
              >
                <span className={`font-serif text-[28px] font-normal leading-none ${isActive ? "text-white" : "text-num"}`}>
                  {questionNumber(node)}
                </span>
                <span>
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    {seriesLabel(node)} · {node.branchLabel} · gen {node.generation}
                  </span>
                  <span className={`text-base leading-snug ${isActive ? "text-[#f4f7fa]" : "text-ink-secondary"}`}>
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
