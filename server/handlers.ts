import {
  addFollowUpQuestion,
  getNode,
  getOrCreateDefaultThread,
  getThreadState,
  markNodeAnswered,
  markNodeProcessing
} from "./db";
import { generateFollowUp, transcribeAudio } from "./ai";
import { prepareAudioForUpload } from "./audio";
import { uploadAudioToGcs } from "./storage";

export async function handleHealth() {
  return { ok: true };
}

export async function handleGetInterview() {
  return getOrCreateDefaultThread();
}

export async function handlePostAnswer(input: {
  questionId: string;
  audioBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  sourceByteLength: number;
}) {
  const node = await getNode(input.questionId);
  if (!node) {
    return { status: 404 as const, body: { error: "Question not found." } };
  }

  const prepared = await prepareAudioForUpload(input.audioBuffer, input.mimeType);
  const uploaded = await uploadAudioToGcs({
    buffer: prepared.buffer,
    threadId: node.threadId,
    questionId: node.id,
    extension: prepared.extension,
    contentType: prepared.contentType
  });

  const metadata = {
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sourceByteLength: input.sourceByteLength,
    audioByteLength: prepared.buffer.byteLength,
    audioFormat: prepared.extension
  };

  const transcript = await transcribeAudio(prepared.buffer, prepared.filename, prepared.contentType);
  const answeredNode = await markNodeAnswered({
    id: node.id,
    transcript,
    mp3Url: uploaded.url,
    gcsObjectName: uploaded.objectName,
    metadata
  });

  if (!answeredNode) {
    return { status: 500 as const, body: { error: "Could not save response." } };
  }

  const currentState = await getThreadState(answeredNode.threadId);
  const followUpQuestion = await generateFollowUp(currentState.nodes, answeredNode);
  const followUpNode = await addFollowUpQuestion({
    threadId: answeredNode.threadId,
    parentQuestionId: answeredNode.id,
    question: followUpQuestion,
    metadata: {
      generatedBy: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    }
  });

  return {
    status: 200 as const,
    body: {
      status: "complete",
      answeredNode,
      followUpNode,
      state: await getThreadState(answeredNode.threadId)
    }
  };
}

export async function handlePostAnswerBackground(input: {
  questionId: string;
  audioBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  sourceByteLength: number;
}) {
  const node = await getNode(input.questionId);
  if (!node) {
    return { status: 404 as const, body: { error: "Question not found." } };
  }

  const prepared = await prepareAudioForUpload(input.audioBuffer, input.mimeType);
  const uploaded = await uploadAudioToGcs({
    buffer: prepared.buffer,
    threadId: node.threadId,
    questionId: node.id,
    extension: prepared.extension,
    contentType: prepared.contentType
  });

  await markNodeProcessing({
    id: node.id,
    mp3Url: uploaded.url,
    gcsObjectName: uploaded.objectName,
    metadata: {
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      sourceByteLength: input.sourceByteLength,
      audioByteLength: prepared.buffer.byteLength,
      audioFormat: prepared.extension
    }
  });

  return {
    status: 202 as const,
    body: {
      status: "processing",
      questionId: node.id,
      state: await getThreadState(node.threadId)
    },
    prepared,
    uploaded
  };
}

export async function finishBackgroundAnswer(input: {
  questionId: string;
  prepared: Awaited<ReturnType<typeof prepareAudioForUpload>>;
  uploaded: { objectName: string; url: string };
  originalFilename: string;
  mimeType: string;
  sourceByteLength: number;
}) {
  const node = await getNode(input.questionId);
  if (!node) {
    return;
  }

  const metadata = {
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sourceByteLength: input.sourceByteLength,
    audioByteLength: input.prepared.buffer.byteLength,
    audioFormat: input.prepared.extension
  };

  const transcript = await transcribeAudio(
    input.prepared.buffer,
    input.prepared.filename,
    input.prepared.contentType
  );
  const answeredNode = await markNodeAnswered({
    id: node.id,
    transcript,
    mp3Url: input.uploaded.url,
    gcsObjectName: input.uploaded.objectName,
    metadata
  });

  if (!answeredNode) {
    return;
  }

  const currentState = await getThreadState(answeredNode.threadId);
  const followUpQuestion = await generateFollowUp(currentState.nodes, answeredNode);
  await addFollowUpQuestion({
    threadId: answeredNode.threadId,
    parentQuestionId: answeredNode.id,
    question: followUpQuestion,
    metadata: {
      generatedBy: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
    }
  });
}
