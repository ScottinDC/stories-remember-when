import type { InterviewState } from "./types";

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

  return (await response.json()) as { state: InterviewState };
}
