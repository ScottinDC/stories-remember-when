import type { InterviewState } from "./types";
import { clearStoredAccessToken, getStoredAccessToken } from "./auth/identity";

class ApiAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {})
    }
  });

  if (response.status === 401 || response.status === 403) {
    clearStoredAccessToken();
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiAuthError(error?.error ?? "Sign in required.", response.status);
  }

  return response;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollInterview(questionId: string, attempts = 60): Promise<InterviewState> {
  for (let index = 0; index < attempts; index += 1) {
    await sleep(2000);
    const response = await apiFetch("/api/interview");
    if (!response.ok) {
      continue;
    }

    const state = (await response.json()) as InterviewState;
    const node = state.nodes.find((candidate) => candidate.id === questionId);
    if (node?.status === "answered") {
      return state;
    }
    if (node?.status === "pending" && node.metadata && "error" in node.metadata) {
      throw new Error(String(node.metadata.error));
    }
  }

  throw new Error("Saving is taking longer than expected. Please refresh and try again.");
}

export async function fetchInterview() {
  const response = await apiFetch("/api/interview");
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? `Could not load the interview (${response.status}).`);
  }
  return (await response.json()) as InterviewState;
}

export async function saveAnswer(questionId: string, audio: Blob) {
  const formData = new FormData();
  formData.append("audio", audio, "answer.webm");

  const response = await apiFetch(`/api/responses/${questionId}/answer`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? "Could not save the answer.");
  }

  const result = (await response.json()) as {
    status?: string;
    state?: InterviewState;
    error?: string;
  };

  if (result.status === "processing") {
    return { state: await pollInterview(questionId) };
  }

  if (!result.state) {
    throw new Error("Could not save the answer.");
  }

  return { state: result.state };
}

export async function deleteAnswer(questionId: string) {
  const response = await apiFetch(`/api/responses/${questionId}/answer`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error ?? "Could not delete the answer.");
  }

  const result = (await response.json()) as { state?: InterviewState };
  if (!result.state) {
    throw new Error("Could not delete the answer.");
  }

  return { state: result.state };
}

export async function saveAllAnswers(entries: Array<{ questionId: string; blob: Blob }>) {
  let state: InterviewState | null = null;
  for (const entry of entries) {
    const result = await saveAnswer(entry.questionId, entry.blob);
    state = result.state;
  }
  if (!state) {
    throw new Error("No answers were saved.");
  }
  return { state };
}

export { ApiAuthError };
