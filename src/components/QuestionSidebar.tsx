import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getDepth } from "../lib/interview";
import type { MemoryNode } from "../types";

type QuestionSidebarProps = {
  nodes: MemoryNode[];
  activeQuestionId: string | null;
  onSelect: (id: string) => void;
};

export function QuestionSidebar({ nodes, activeQuestionId, onSelect }: QuestionSidebarProps) {
  return (
    <aside className="panel p-4 md:p-5">
      <div className="mb-4 space-y-1">
        <p className="label">Interview path</p>
        <h2 className="text-xl font-semibold text-ink">Questions</h2>
      </div>

      <div className="space-y-3">
        {nodes.map((node, index) => {
          const isActive = node.id === activeQuestionId;
          const depth = getDepth(nodes, node);
          const indent = Math.min(depth, 3) * 12;

          return (
            <button
              className={`w-full rounded-xl border p-4 text-left transition ${
                isActive
                  ? "border-umber bg-umber-soft"
                  : "border-linen-200 bg-white hover:border-linen-300 hover:bg-linen-50"
              }`}
              key={node.id}
              onClick={() => onSelect(node.id)}
              style={{ marginLeft: `${indent}px`, width: `calc(100% - ${indent}px)` }}
              type="button"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-muted">
                <QuestionStatusIcon status={node.status} />
                <span>
                  Question {index + 1}
                  {node.parentQuestionId ? " · follow-up" : ""}
                </span>
              </div>
              <p className="font-serif text-lg leading-snug text-ink">{node.question}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function QuestionStatusIcon({ status }: { status: MemoryNode["status"] }) {
  if (status === "answered") {
    return <CheckCircle2 className="h-4 w-4 text-umber" aria-hidden="true" />;
  }
  if (status === "processing") {
    return <Loader2 className="h-4 w-4 animate-spin text-umber" aria-hidden="true" />;
  }
  return <Circle className="h-4 w-4 text-linen-300" aria-hidden="true" />;
}
