#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
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
PORT=8787
EOF
fi

set -a; source "$LOCAL_ENV"; set +a
cd "$ROOT"
exec npm run dev
