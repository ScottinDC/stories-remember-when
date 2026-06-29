import { randomUUID } from "node:crypto";
import { INITIAL_QUESTIONS } from "./interview";
import { appendLedgerEvent, ledgerFromNode } from "./ledger";
import { readJsonFromGcs, writeJsonToGcs } from "./storage";
import { buildTreePath, enrichNode, nextSequenceOrder, nodeDepth } from "./tree";
import type { InterviewState, InterviewThread, MemoryNode } from "./types";

const STATE_OBJECT = "app/interview-state.json";

function normalizeNode(nodes: MemoryNode[], node: MemoryNode, index: number): MemoryNode {
  const sequenceOrder = node.sequenceOrder ?? index + 1;
  const withOrder = { ...node, sequenceOrder };
  const depth = node.depth ?? nodeDepth(nodes, withOrder);
  const treePath = node.treePath ?? buildTreePath(nodes, withOrder);
  return enrichNode(nodes, { ...withOrder, depth, treePath });
}

function normalizeState(state: InterviewState): InterviewState {
  const nodes = state.nodes.map((node, index) => normalizeNode(state.nodes, node, index));
  return {
    thread: state.thread,
    nodes: nodes.map((node) => normalizeNode(nodes, node, node.sequenceOrder - 1))
  };
}

async function loadState(): Promise<InterviewState | null> {
  const raw = await readJsonFromGcs<InterviewState>(STATE_OBJECT);
  return raw ? normalizeState(raw) : null;
}

async function persistState(state: InterviewState) {
  await writeJsonToGcs(STATE_OBJECT, state);
}

function createInitialState(): InterviewState {
  const now = new Date().toISOString();
  const threadId = randomUUID();
  const thread: InterviewThread = {
    id: threadId,
    title: "Dad's Life Story",
    createdAt: now,
    updatedAt: now
  };

  const nodes: MemoryNode[] = INITIAL_QUESTIONS.map((question, index) => {
    const id = randomUUID();
    return enrichNode([], {
      id,
      threadId,
      parentQuestionId: null,
      question,
      transcript: null,
      mp3Url: null,
      gcsObjectName: null,
      timestamp: now,
      metadata: null,
      status: "pending",
      sequenceOrder: index + 1,
      depth: 0,
      generation: 0,
      branchRootId: id,
      branchLabel: `Q${index + 1}`,
      treePath: [id]
    });
  });

  return { thread, nodes };
}

async function seedLedger(state: InterviewState) {
  await appendLedgerEvent({
    type: "thread_initialized",
    threadId: state.thread.id,
    at: state.thread.createdAt,
    questionCount: state.nodes.length
  });

  for (const node of state.nodes) {
    await appendLedgerEvent(ledgerFromNode(node, "question_created"));
  }
}

export async function getOrCreateDefaultThread(): Promise<InterviewState> {
  const existing = await loadState();
  if (existing) {
    const normalized = normalizeState(existing);
    const needsBranchFields = existing.nodes.some((node) => node.generation === undefined || !node.branchRootId);
    if (needsBranchFields) {
      await persistState(normalized);
    }
    return normalized;
  }

  const initial = createInitialState();
  await persistState(initial);
  void seedLedger(initial).catch((error) => {
    console.error("Failed to seed interview ledger:", error);
  });
  return initial;
}

export async function getThreadState(threadId: string): Promise<InterviewState> {
  const state = await loadState();
  if (!state || state.thread.id !== threadId) {
    throw new Error("Thread not found.");
  }
  return state;
}

export async function getNode(id: string): Promise<MemoryNode | undefined> {
  const state = await loadState();
  return state?.nodes.find((node) => node.id === id);
}

export async function markNodeProcessing(input: {
  id: string;
  mp3Url: string;
  gcsObjectName: string;
  metadata: Record<string, unknown>;
}) {
  const state = await loadState();
  if (!state) {
    return undefined;
  }

  const now = new Date().toISOString();
  const index = state.nodes.findIndex((node) => node.id === input.id);
  if (index === -1) {
    return undefined;
  }

  state.nodes[index] = enrichNode(state.nodes, {
    ...state.nodes[index],
    mp3Url: input.mp3Url,
    gcsObjectName: input.gcsObjectName,
    timestamp: now,
    metadata: input.metadata,
    status: "processing"
  });
  state.thread.updatedAt = now;
  await persistState(state);
  return state.nodes[index];
}

export async function markNodeAnswered(input: {
  id: string;
  transcript: string;
  mp3Url: string;
  gcsObjectName: string;
  metadata: Record<string, unknown>;
}) {
  const state = await loadState();
  if (!state) {
    return undefined;
  }

  const now = new Date().toISOString();
  const index = state.nodes.findIndex((node) => node.id === input.id);
  if (index === -1) {
    return undefined;
  }

  state.nodes[index] = enrichNode(state.nodes, {
    ...state.nodes[index],
    transcript: input.transcript,
    mp3Url: input.mp3Url,
    gcsObjectName: input.gcsObjectName,
    timestamp: now,
    metadata: input.metadata,
    status: "answered"
  });
  state.thread.updatedAt = now;
  await persistState(state);
  return state.nodes[index];
}

export async function markNodeFailed(id: string, message: string) {
  const state = await loadState();
  if (!state) {
    return undefined;
  }

  const now = new Date().toISOString();
  const index = state.nodes.findIndex((node) => node.id === id);
  if (index === -1) {
    return undefined;
  }

  state.nodes[index] = enrichNode(state.nodes, {
    ...state.nodes[index],
    timestamp: now,
    metadata: {
      ...(state.nodes[index].metadata ?? {}),
      error: message
    },
    status: "pending"
  });
  state.thread.updatedAt = now;
  await persistState(state);
  return state.nodes[index];
}

export async function clearNodeAnswer(id: string) {
  const state = await loadState();
  if (!state) {
    return undefined;
  }

  const now = new Date().toISOString();
  const index = state.nodes.findIndex((node) => node.id === id);
  if (index === -1) {
    return undefined;
  }

  state.nodes[index] = enrichNode(state.nodes, {
    ...state.nodes[index],
    transcript: null,
    mp3Url: null,
    gcsObjectName: null,
    timestamp: now,
    metadata: null,
    status: "pending"
  });
  state.thread.updatedAt = now;
  await persistState(state);
  return state.nodes[index];
}

export async function addFollowUpQuestion(input: {
  threadId: string;
  parentQuestionId: string;
  question: string;
  metadata?: Record<string, unknown>;
}) {
  const state = await loadState();
  if (!state || state.thread.id !== input.threadId) {
    return undefined;
  }

  const parent = state.nodes.find((node) => node.id === input.parentQuestionId);
  if (!parent) {
    return undefined;
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const sequenceOrder = nextSequenceOrder(state.nodes);
  const depth = parent.depth + 1;
  const treePath = [...parent.treePath, id];

  const node: MemoryNode = enrichNode(state.nodes, {
    id,
    threadId: input.threadId,
    parentQuestionId: input.parentQuestionId,
    question: input.question,
    transcript: null,
    mp3Url: null,
    gcsObjectName: null,
    timestamp: now,
    metadata: input.metadata ?? null,
    status: "pending",
    sequenceOrder,
    depth,
    generation: depth,
    treePath
  });

  state.nodes.push(node);
  state.thread.updatedAt = now;
  await persistState(state);
  return node;
}
