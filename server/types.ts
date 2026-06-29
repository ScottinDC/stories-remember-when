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
  depth: number;
  treePath: string[];
  question: string;
  status: MemoryNode["status"];
  transcript: string | null;
  audioObjectName: string | null;
  updatedAt: string;
};
