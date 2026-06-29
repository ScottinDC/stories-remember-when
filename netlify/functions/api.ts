import type { Context } from "@netlify/functions";
import { authConfig, requireAuth } from "../../server/auth";
import { storageConfig } from "../../server/runtime-env";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store"
    }
  });
}

function routePath(url: URL) {
  const pathname = url.pathname.replace(/^\/\.netlify\/functions\/api/, "");
  return pathname.startsWith("/api") ? pathname : `/api${pathname}`;
}

export default async (req: Request, context: Context) => {
  try {
    const url = new URL(req.url);
    const path = routePath(url);

    if (req.method === "GET" && path === "/api/health") {
      const probeStorage = url.searchParams.get("probe") === "storage";
      if (!probeStorage) {
        return json({ ok: true, ...authConfig(), ...storageConfig() });
      }

      const { handleHealth } = await import("../../server/handlers-read");
      return json(await handleHealth());
    }

    const auth = await requireAuth(req.headers.get("authorization"), req.url, req);
    if ("status" in auth) {
      return json({ error: auth.error }, auth.status);
    }

    if (req.method === "GET" && path === "/api/session") {
      return json({ ok: true, email: auth.email });
    }

    if (req.method === "GET" && path === "/api/interview") {
      const { handleGetInterview } = await import("../../server/handlers-read");
      return json(await handleGetInterview());
    }

    const {
      handleDeleteAnswer,
      finishBackgroundAnswer,
      handlePostAnswerBackground
    } = await import("../../server/handlers");
    const { markNodeFailed } = await import("../../server/db");

    const answerMatch = path.match(/^\/api\/responses\/([^/]+)\/answer$/);

    if (req.method === "DELETE" && answerMatch) {
      const result = await handleDeleteAnswer(answerMatch[1]);
      return json(result.body, result.status);
    }

    if (req.method === "POST" && answerMatch) {
      const formData = await req.formData();
      const audio = formData.get("audio");
      if (!(audio instanceof File)) {
        return json({ error: "An audio file is required." }, 400);
      }

      const buffer = Buffer.from(await audio.arrayBuffer());
      const result = await handlePostAnswerBackground({
        questionId: answerMatch[1],
        audioBuffer: buffer,
        mimeType: audio.type || "audio/webm",
        originalFilename: audio.name || "answer.webm",
        sourceByteLength: buffer.byteLength
      });

      if (result.status !== 202 || !result.prepared || !result.uploaded) {
        return json(result.body, result.status);
      }

      context.waitUntil(
        finishBackgroundAnswer({
          questionId: answerMatch[1],
          prepared: result.prepared,
          uploaded: result.uploaded,
          originalFilename: audio.name || "answer.webm",
          mimeType: audio.type || "audio/webm",
          sourceByteLength: buffer.byteLength
        }).catch(async (error) => {
          const message = error instanceof Error ? error.message : "Unexpected server error.";
          await markNodeFailed(answerMatch[1], message);
        })
      );

      return json(result.body, 202);
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return json({ error: message }, 500);
  }
};

export const config = {
  path: "/api/*",
  preferStatic: false
};
