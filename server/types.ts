export type MemoryNode = {
  id: string;
  threadId: string;
  parentQuestionId: string | null;
  question: string;
  transcript: string | null;
  mp3Url: string | null;
  gcsObjectName: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
  status: "pending" | "processing" | "answered";
  /** Position in the interview series (1-based, global across the thread). */
  sequenceOrder: number;
  /** Depth in the question tree (0 = root). */
  depth: number;
  /** Same as depth — which wave of questions (0 = foundation Q1–Q5). */
  generation: number;
  /** ID of the foundation question (Q1–Q5) this branch belongs to. */
  branchRootId: string;
  /** Foundation label for this branch, e.g. Q1. */
  branchLabel: string;
  /** Ordered question IDs from root to this node. */
  treePath: string[];
};

export type InterviewThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type InterviewState = {
  thread: InterviewThread;
  nodes: MemoryNode[];
};

export type AnswerManifest = {
  threadId: string;
  questionId: string;
  parentQuestionId: string | null;
  sequenceOrder: number;
  generation: number;
  depth: number;
  branchRootId: string;
  branchLabel: string;
  treePath: string[];
  question: string;
  status: MemoryNode["status"];
  transcript: string | null;
  audioObjectName: string | null;
  updatedAt: string;
};
