import type { MemoryNode } from "./types";

export function nodeDepth(nodes: MemoryNode[], node: MemoryNode) {
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

export function buildTreePath(nodes: MemoryNode[], node: MemoryNode) {
  const path: string[] = [];
  let current: MemoryNode | undefined = node;
  while (current) {
    path.unshift(current.id);
    current = current.parentQuestionId
      ? nodes.find((candidate) => candidate.id === current!.parentQuestionId)
      : undefined;
  }
  return path;
}

export function resolveBranchRootId(nodes: MemoryNode[], node: MemoryNode) {
  if (node.depth === 0 || !node.parentQuestionId) {
    return node.id;
  }

  let current: MemoryNode | undefined = node;
  while (current?.parentQuestionId) {
    const parent = nodes.find((candidate) => candidate.id === current!.parentQuestionId);
    if (!parent) {
      break;
    }
    if (parent.depth === 0) {
      return parent.id;
    }
    current = parent;
  }

  return node.treePath[0] ?? node.id;
}

export function resolveBranchLabel(nodes: MemoryNode[], node: MemoryNode, branchRootId: string) {
  const root = nodes.find((candidate) => candidate.id === branchRootId);
  return `Q${root?.sequenceOrder ?? node.sequenceOrder}`;
}

export function nextSequenceOrder(nodes: MemoryNode[]) {
  const max = nodes.reduce((highest, node) => Math.max(highest, node.sequenceOrder ?? 0), 0);
  return max + 1;
}

export function enrichNode(nodes: MemoryNode[], node: MemoryNode): MemoryNode {
  const depth = node.depth ?? nodeDepth(nodes, node);
  const generation = node.generation ?? depth;
  const treePath = node.treePath ?? buildTreePath(nodes, node);
  const withPath = { ...node, depth, generation, treePath };
  const branchRootId = node.branchRootId ?? resolveBranchRootId(nodes, withPath);
  const branchLabel = node.branchLabel ?? resolveBranchLabel(nodes, withPath, branchRootId);
  return { ...withPath, branchRootId, branchLabel };
}

export function sortNodesBySeries(nodes: MemoryNode[]) {
  return [...nodes].sort((left, right) => {
    const leftOrder = left.sequenceOrder ?? 0;
    const rightOrder = right.sequenceOrder ?? 0;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.timestamp.localeCompare(right.timestamp);
  });
}

export function seriesPrefix(node: MemoryNode) {
  const order = String(node.sequenceOrder ?? 0).padStart(3, "0");
  const depth = String(node.generation ?? node.depth ?? 0).padStart(2, "0");
  return `d${depth}-q${order}-${node.id.slice(0, 8)}`;
}
