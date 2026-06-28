import type { InterviewState } from "./types";

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollInterview(questionId: string, attempts = 60): Promise<InterviewState> {
  for (let index = 0; index < attempts; index += 1) {
    await sleep(2000);
    const response = await fetch("/api/interview");
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
  const response = await fetch("/api/interview");
  if (!response.ok) {
    throw new Error("Could not load the interview.");
  }
  return (await response.json()) as InterviewState;
}

export async function saveAnswer(questionId: string, audio: Blob) {
  const formData = new FormData();
  formData.append("audio", audio, "answer.webm");

  const response = await fetch(`/api/responses/${questionId}/answer`, {
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
