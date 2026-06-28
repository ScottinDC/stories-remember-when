import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { INITIAL_QUESTIONS } from "./interview";
import type { InterviewState, InterviewThread, MemoryNode } from "./types";

const databasePath = process.env.DATABASE_PATH ?? "./data/remember-when.sqlite";
mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    parent_question_id TEXT,
    question TEXT NOT NULL,
    transcript TEXT,
    mp3_url TEXT,
    gcs_object_name TEXT,
    timestamp TEXT NOT NULL,
    metadata TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'answered')),
    FOREIGN KEY (thread_id) REFERENCES threads(id),
    FOREIGN KEY (parent_question_id) REFERENCES responses(id)
  );
`);

function rowToThread(row: Record<string, string>): InterviewThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToNode(row: Record<string, string | null>): MemoryNode {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    parentQuestionId: row.parent_question_id,
    question: row.question as string,
    transcript: row.transcript,
    mp3Url: row.mp3_url,
    gcsObjectName: row.gcs_object_name,
    timestamp: row.timestamp as string,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
    status: row.status as MemoryNode["status"]
  };
}

export function getOrCreateDefaultThread(): InterviewState {
  let threadRow = db.prepare("SELECT * FROM threads ORDER BY created_at LIMIT 1").get() as
    | Record<string, string>
    | undefined;

  if (!threadRow) {
    const now = new Date().toISOString();
    const threadId = randomUUID();
    db.prepare("INSERT INTO threads (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
      threadId,
      "Dad's Life Story",
      now,
      now
    );

    const insertQuestion = db.prepare(`
      INSERT INTO responses (
        id, thread_id, parent_question_id, question, transcript, mp3_url,
        gcs_object_name, timestamp, metadata, status
      ) VALUES (?, ?, NULL, ?, NULL, NULL, NULL, ?, NULL, 'pending')
    `);

    for (const question of INITIAL_QUESTIONS) {
      insertQuestion.run(randomUUID(), threadId, question, now);
    }

    threadRow = db.prepare("SELECT * FROM threads WHERE id = ?").get(threadId) as Record<string, string>;
  }

  return getThreadState(threadRow.id);
}

export function getThreadState(threadId: string): InterviewState {
  const thread = db.prepare("SELECT * FROM threads WHERE id = ?").get(threadId) as Record<string, string>;
  const rows = db
    .prepare("SELECT * FROM responses WHERE thread_id = ? ORDER BY timestamp ASC")
    .all(threadId) as Record<string, string | null>[];

  return {
    thread: rowToThread(thread),
    nodes: rows.map(rowToNode)
  };
}

export function getNode(id: string): MemoryNode | undefined {
  const row = db.prepare("SELECT * FROM responses WHERE id = ?").get(id) as
    | Record<string, string | null>
    | undefined;
  return row ? rowToNode(row) : undefined;
}

export function markNodeAnswered(input: {
  id: string;
  transcript: string;
  mp3Url: string;
  gcsObjectName: string;
  metadata: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE responses
     SET transcript = ?, mp3_url = ?, gcs_object_name = ?, timestamp = ?, metadata = ?, status = 'answered'
     WHERE id = ?`
  ).run(
    input.transcript,
    input.mp3Url,
    input.gcsObjectName,
    now,
    JSON.stringify(input.metadata),
    input.id
  );

  const node = getNode(input.id);
  if (node) {
    db.prepare("UPDATE threads SET updated_at = ? WHERE id = ?").run(now, node.threadId);
  }
  return node;
}

export function addFollowUpQuestion(input: {
  threadId: string;
  parentQuestionId: string;
  question: string;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO responses (
      id, thread_id, parent_question_id, question, transcript, mp3_url,
      gcs_object_name, timestamp, metadata, status
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, 'pending')`
  ).run(
    id,
    input.threadId,
    input.parentQuestionId,
    input.question,
    now,
    input.metadata ? JSON.stringify(input.metadata) : null
  );
  db.prepare("UPDATE threads SET updated_at = ? WHERE id = ?").run(now, input.threadId);
  return getNode(id);
}
