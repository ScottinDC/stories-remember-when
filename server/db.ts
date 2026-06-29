import * as gcsStore from "./store-gcs";
import { useGcsBackend } from "./runtime-env";
import type { InterviewState, MemoryNode } from "./types";

async function store() {
  if (useGcsBackend()) {
    return gcsStore;
  }
  return import("./store-sqlite");
}

export async function getOrCreateDefaultThread(): Promise<InterviewState> {
  return (await store()).getOrCreateDefaultThread();
}

export async function getThreadState(threadId: string): Promise<InterviewState> {
  return (await store()).getThreadState(threadId);
}

export async function getNode(id: string): Promise<MemoryNode | undefined> {
  return (await store()).getNode(id);
}

export async function markNodeProcessing(input: {
  id: string;
  mp3Url: string;
  gcsObjectName: string;
  metadata: Record<string, unknown>;
}) {
  return (await store()).markNodeProcessing(input);
}

export async function markNodeAnswered(input: {
  id: string;
  transcript: string;
  mp3Url: string;
  gcsObjectName: string;
  metadata: Record<string, unknown>;
}) {
  return (await store()).markNodeAnswered(input);
}

export async function markNodeFailed(id: string, message: string) {
  return (await store()).markNodeFailed(id, message);
}

export async function addFollowUpQuestion(input: {
  threadId: string;
  parentQuestionId: string;
  question: string;
  metadata?: Record<string, unknown>;
}) {
  return (await store()).addFollowUpQuestion(input);
}

export async function clearNodeAnswer(id: string) {
  return (await store()).clearNodeAnswer(id);
}
