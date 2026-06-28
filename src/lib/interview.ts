import type { MemoryNode } from "../types";

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function chooseNextQuestion(nodes: MemoryNode[]) {
  return nodes.find((node) => node.status === "pending") ?? null;
}

export function getDepth(nodes: MemoryNode[], node: MemoryNode) {
  let depth = 0;
  let parentId = node.parentQuestionId;
  while (parentId) {
    const parent = nodes.find((candidate) => candidate.id === parentId);
    if (!parent) {
      break;
    }
    depth += 1;
    parentId = parent.parentQuestionId;
  }
  return depth;
}

export function countByStatus(nodes: MemoryNode[], status: MemoryNode["status"]) {
  return nodes.filter((node) => node.status === status).length;
}
