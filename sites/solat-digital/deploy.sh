#!/usr/bin/env bash
# Deploy Solat Digital: build, kemudian terbit Rules + Hosting. Semua TV/panel yang terbuka akan muat semula sendiri (<= 1 minit).
set -euo pipefail
cd "$(dirname "$0")"
npm run build
firebase deploy --only firestore:rules,database,hosting --project solat-digital-my --token "${FIREBASE_TOKEN:?FIREBASE_TOKEN tiada}"
echo "Versi: $(cat public/version.json)"
