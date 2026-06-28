import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { buildOralHistorianPrompt, normalizeQuestion } from "./interview";
import type { MemoryNode } from "./types";

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export async function transcribeAudio(buffer: Buffer, filename = "answer.mp3") {
  const openai = getOpenAiClient();
  const file = await toFile(buffer, filename, { type: "audio/mpeg" });
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1"
  });

  return transcription.text;
}

export async function generateFollowUp(nodes: MemoryNode[], answeredNode: MemoryNode) {
  const openai = getOpenAiClient();
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: buildOralHistorianPrompt(nodes, answeredNode),
    temperature: 0.8,
    max_output_tokens: 90
  });

  return normalizeQuestion(response.output_text);
}
