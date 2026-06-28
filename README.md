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

For hosted deployments, set `GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON` instead of `GOOGLE_APPLICATION_CREDENTIALS`.

The server uses `ffmpeg` to convert browser-recorded audio into MP3 before uploading to Google Cloud Storage.

## Flow

1. The app creates a default interview thread with five foundational questions.
2. The user records up to five minutes of audio.
3. The user can play back or re-record before saving.
4. The server converts the recording to MP3.
5. The MP3 uploads to Google Cloud Storage and a signed URL is stored.
6. OpenAI transcribes the MP3.
7. The transcript, biography, and conversation tree are sent to the OpenAI Responses API.
8. One follow-up question is saved as a child of the answered question.
