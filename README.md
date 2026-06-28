# Remember When

A simple family oral history app for recording a father's life story through an AI-guided interview.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:5173.

## Required Environment

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1

GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_STORAGE_BUCKET=...
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

Locally, interview data is stored in SQLite. Audio uploads go to Google Cloud Storage.

## Deploy on Netlify

The site publishes the Vite frontend from `dist/` and runs the API as a Netlify Function.

Set these environment variables in the Netlify site settings:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_STORAGE_BUCKET=...
GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

On Netlify:

- Interview state is stored in Google Cloud Storage at `app/interview-state.json`
- Audio is uploaded directly as WebM/M4A (no local `ffmpeg` on Netlify)
- Saving runs in the background after upload so longer transcriptions can finish

Do not commit `.tools/`, `.secrets/`, or `.env`.

## Flow

1. The app creates a default interview thread with five foundational questions.
2. The user records up to five minutes of audio.
3. The user can play back or re-record before saving.
4. The server uploads the recording to Google Cloud Storage.
5. OpenAI transcribes the audio.
6. The transcript, biography, and conversation tree are sent to the OpenAI Responses API.
7. One follow-up question is saved as a child of the answered question.
