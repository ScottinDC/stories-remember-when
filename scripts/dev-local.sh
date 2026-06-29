#!/usr/bin/env bash
set -euo pipefail
ROOT="$HOME/Developer/Remember-When"
LOCAL_ENV="$HOME/.remember-when/.env"
mkdir -p "$HOME/.remember-when"

if [[ ! -f "$LOCAL_ENV" ]]; then
  cat > "$LOCAL_ENV" <<EOF
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
GOOGLE_CLOUD_PROJECT=remember-when-500816
GOOGLE_CLOUD_STORAGE_BUCKET=remember-when-500816-audio
GOOGLE_APPLICATION_CREDENTIALS=$HOME/.remember-when/service-account.json
DATABASE_BACKEND=gcs
AUTH_DISABLED=true
PORT=8787
EOF
fi

# Local preview skips Netlify Identity — auth only applies in production.
if ! grep -q '^AUTH_DISABLED=' "$LOCAL_ENV" 2>/dev/null; then
  echo "AUTH_DISABLED=true" >> "$LOCAL_ENV"
fi

set -a; source "$LOCAL_ENV"; set +a

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if port_in_use 8787 || port_in_use 5173; then
  echo "Stopping stale Remember When dev processes on 5173/8787..." >&2
  lsof -ti tcp:5173,tcp:8787 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 1
fi

if port_in_use 8787 || port_in_use 5173; then
  echo "Remember When dev ports are still in use (5173 and/or 8787)." >&2
  echo "Stop them manually: lsof -ti tcp:5173,tcp:8787 | xargs kill" >&2
  exit 1
fi

cd "$ROOT"
exec npm run dev
