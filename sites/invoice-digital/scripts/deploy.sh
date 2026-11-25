#!/usr/bin/env bash
# Deploy hosting dengan cap versi (auto-kemas kini): pengguna yang membuka app dimuat semula sendiri selepas deploy.
# Guna: scripts/deploy.sh   (set FIREBASE_BIN untuk menggunakan binari firebase tertentu)
set -euo pipefail
cd "$(dirname "$0")/.."
V="$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo x)"
printf '{"v":"%s"}\n' "$V" > public/invoice/version.json
sed -i "s|<meta name=\"app-version\" content=\"[^\"]*\">|<meta name=\"app-version\" content=\"$V\">|" public/invoice/index.html
echo "versi: $V"
${FIREBASE_BIN:-npx -y firebase-tools@15.35.0} deploy --only hosting
# kembalikan penanda supaya git tidak penuh dengan perubahan versi
printf '{"v":"dev"}\n' > public/invoice/version.json
sed -i "s|<meta name=\"app-version\" content=\"[^\"]*\">|<meta name=\"app-version\" content=\"dev\">|" public/invoice/index.html
