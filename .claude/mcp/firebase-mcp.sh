#!/usr/bin/env bash
# Lancar pelayan MCP Firebase (firebase-tools) untuk Claude Code.
# Kelayakan (pilih satu, simpan sebagai pembolehubah persekitaran, JANGAN commit):
#   FIREBASE_TOKEN                  — token `firebase login:ci` (akses SEMUA projek akaun)
#   FIREBASE_SERVICE_ACCOUNT        — isi penuh fail JSON service account
#   GOOGLE_APPLICATION_CREDENTIALS  — laluan ke fail JSON service account
# Projek default: FIREBASE_PROJECT_ID atau .firebaserc dalam repo.
set -euo pipefail

if [[ -n "${FIREBASE_SERVICE_ACCOUNT:-}" && -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  umask 077
  key="${TMPDIR:-/tmp}/firebase-sa-$(id -u).json"
  printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$key"
  export GOOGLE_APPLICATION_CREDENTIALS="$key"
fi

if [[ -n "${FIREBASE_PROJECT_ID:-}" && -z "${GOOGLE_CLOUD_PROJECT:-}" ]]; then
  export GOOGLE_CLOUD_PROJECT="$FIREBASE_PROJECT_ID"
fi

exec npx -y firebase-tools@latest mcp --dir "${CLAUDE_PROJECT_DIR:-$PWD}" "$@"
