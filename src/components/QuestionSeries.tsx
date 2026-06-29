import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { seriesLabel } from "../lib/interview";
import type { MemoryNode } from "../types";

type QuestionSeriesProps = {
  nodes: MemoryNode[];
  activeQuestionId: string | null;
  onSelect: (id: string) => void;
};

function StatusIcon({ status }: { status: MemoryNode["status"] }) {
  if (status === "answered") {
    return <CheckCircle2 className="h-4 w-4 text-umber" aria-hidden="true" />;
  }
  if (status === "processing") {
    return <Loader2 className="h-4 w-4 animate-spin text-umber" aria-hidden="true" />;
  }
  return <Circle className="h-4 w-4 text-linen-300" aria-hidden="true" />;
}

export function QuestionSeries({ nodes, activeQuestionId, onSelect }: QuestionSeriesProps) {
  return (
    <div className="form-card p-4 md:p-5">
      <h2 className="mb-3 text-base font-normal text-ink">Question Series</h2>
      <div className="space-y-2">
        {nodes.map((node) => {
          const isActive = node.id === activeQuestionId;
          return (
            <button
              className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                isActive
                  ? "border-umber bg-umber-soft"
                  : "border-linen-200 bg-white hover:bg-linen-50"
              }`}
              key={node.id}
              onClick={() => onSelect(node.id)}
              type="button"
            >
              <div className="mb-1 flex items-center gap-2 text-sm text-ink-muted">
                <StatusIcon status={node.status} />
                <span>{seriesLabel(node)}</span>
              </div>
              <p className="text-base text-ink">{node.question}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
