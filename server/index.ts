import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import {
  addFollowUpQuestion,
  getNode,
  getOrCreateDefaultThread,
  getThreadState,
  markNodeAnswered
} from "./db";
import { generateFollowUp, transcribeAudio } from "./ai";
import { convertToMp3 } from "./audio";
import { uploadAudioToGcs } from "./storage";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 35 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/interview", (_req, res) => {
  res.json(getOrCreateDefaultThread());
});

app.post("/api/responses/:questionId/answer", upload.single("audio"), async (req, res, next) => {
  try {
    const questionId = String(req.params.questionId);
    const node = getNode(questionId);
    if (!node) {
      res.status(404).json({ error: "Question not found." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "An audio file is required." });
      return;
    }

    const mp3Buffer = await convertToMp3(req.file.buffer);
    const uploaded = await uploadAudioToGcs({
      buffer: mp3Buffer,
      threadId: node.threadId,
      questionId: node.id
    });

    const transcript = await transcribeAudio(mp3Buffer, "answer.mp3");
    const answeredNode = markNodeAnswered({
      id: node.id,
      transcript,
      mp3Url: uploaded.url,
      gcsObjectName: uploaded.objectName,
      metadata: {
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        sourceByteLength: req.file.size,
        mp3ByteLength: mp3Buffer.byteLength
      }
    });

    if (!answeredNode) {
      res.status(500).json({ error: "Could not save response." });
      return;
    }

    const currentState = getThreadState(answeredNode.threadId);
    const followUpQuestion = await generateFollowUp(currentState.nodes, answeredNode);
    const followUpNode = addFollowUpQuestion({
      threadId: answeredNode.threadId,
      parentQuestionId: answeredNode.id,
      question: followUpQuestion,
      metadata: {
        generatedBy: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
      }
    });

    res.json({
      answeredNode,
      followUpNode,
      state: getThreadState(answeredNode.threadId)
    });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, "127.0.0.1", () => {
  console.log(`Remember When API listening on http://127.0.0.1:${port}`);
});
