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

export function sortBySeries(nodes: MemoryNode[]) {
  return [...nodes].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
}

export function answeredNodes(nodes: MemoryNode[]) {
  return sortBySeries(nodes.filter((node) => node.status === "answered" || node.status === "processing"));
}

export function countByStatus(nodes: MemoryNode[], status: MemoryNode["status"]) {
  return nodes.filter((node) => node.status === status).length;
}

export function seriesLabel(node: MemoryNode) {
  return `Question ${node.sequenceOrder}${node.depth > 0 ? ` · follow-up (depth ${node.depth})` : ""}`;
}

export type SankeyNode = { name: string; id: string; status: MemoryNode["status"] };
export type SankeyLink = { source: number; target: number; value: number };

export function buildSankeyData(nodes: MemoryNode[]) {
  const sorted = sortBySeries(nodes);
  const indexById = new Map(sorted.map((node, index) => [node.id, index]));

  const sankeyNodes: SankeyNode[] = sorted.map((node) => ({
    id: node.id,
    name: `Q${node.sequenceOrder}`,
    status: node.status
  }));

  const links: SankeyLink[] = [];
  for (const node of sorted) {
    if (!node.parentQuestionId) {
      continue;
    }
    const source = indexById.get(node.parentQuestionId);
    const target = indexById.get(node.id);
    if (source === undefined || target === undefined) {
      continue;
    }
    links.push({ source, target, value: 1 });
  }

  return { nodes: sankeyNodes, links };
}
