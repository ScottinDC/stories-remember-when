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
ALLOWED_EMAILS=you@example.com,partner@example.com
```

Do **not** set `AUTH_DISABLED` in production. Use it only for local development.

### Private access (Netlify Identity + Google)

Remember When is intended for a private family network, not public traffic. Access control uses **Netlify Identity** with **Google OAuth** and a server-side email allowlist.

1. In the Netlify dashboard, open **Identity** and click **Enable Identity**.
2. Under **Registration preferences**, choose **Invite only** (recommended).
3. Under **External providers**, enable **Google** and add your Google OAuth client ID and secret from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Authorized JavaScript origins: `https://YOUR-SITE.netlify.app`
   - Authorized redirect URIs: `https://YOUR-SITE.netlify.app/.netlify/identity/callback`
4. In **Site settings → Environment variables**, set `ALLOWED_EMAILS` to a comma-separated list of approved Google accounts.
5. Redeploy the site after changing env vars.

How it works:

- The React app redirects unauthenticated visitors to Google sign-in through Netlify Identity.
- After sign-in, the app stores the Identity access token and sends it as `Authorization: Bearer …` on API requests.
- Netlify Functions verify the JWT against Identity JWKS and reject any email not listed in `ALLOWED_EMAILS`.
- `public/robots.txt`, `index.html` meta robots, and `_headers` keep crawlers and casual indexing out (this is not a substitute for auth).

Local development skips auth when `AUTH_DISABLED=true` in `.env`.

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
