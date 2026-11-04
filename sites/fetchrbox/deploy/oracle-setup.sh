#!/usr/bin/env bash
# Pasang pelayan muat turun Fetchr Box pada VM Oracle Cloud (Ubuntu 22.04/24.04, ARM atau x86).
# Jalankan SEKALI di dalam VM:   bash oracle-setup.sh
# Hasil: pelayan di https://<ip>.sslip.io (HTTPS percuma automatik melalui Caddy, tiada domain diperlukan).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/izzulisyraf011207/website-claude-code.git}"
BRANCH="${BRANCH:-claude/video-download-system-6g7ipu}"
APP_DIR=/opt/fetchrbox
ORIGINS="${ALLOWED_ORIGIN:-https://fetchr-box-izzul.web.app,https://fetchrbox-admin-izzul.web.app}"

echo "==> 1/6 Pasang Docker dan git"
sudo apt-get update -y
sudo apt-get install -y docker.io git curl ca-certificates iptables-persistent
sudo systemctl enable --now docker

echo "==> 2/6 Buka port 80 dan 443 (firewall VM)"
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 1 -p tcp --dport "$p" -j ACCEPT
done
sudo netfilter-persistent save >/dev/null 2>&1 || true

echo "==> 3/6 Ambil kod"
if [ -d "$APP_DIR/.git" ]; then
  sudo git -C "$APP_DIR" fetch origin "$BRANCH" && sudo git -C "$APP_DIR" checkout -q "$BRANCH" && sudo git -C "$APP_DIR" reset -q --hard "origin/$BRANCH"
else
  sudo git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
SRC="$APP_DIR/sites/fetchrbox"
[ -f "$SRC/Dockerfile" ] || { echo "Dockerfile tidak ditemui di $SRC"; exit 1; }

echo "==> 4/6 Bina dan jalankan pelayan"
sudo mkdir -p /opt/fetchrbox-data
ENV_FILE=/opt/fetchrbox.env
if [ ! -f "$ENV_FILE" ]; then
  ADMIN_PW="$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
  printf 'PORT=8080\nADMIN_PASSWORD=%s\nALLOWED_ORIGIN=%s\nMAX_DURATION_MIN=180\nMAX_JOBS=3\n' "$ADMIN_PW" "$ORIGINS" | sudo tee "$ENV_FILE" >/dev/null
  sudo chmod 600 "$ENV_FILE"
  echo "Kata laluan admin pelayan (simpan): $ADMIN_PW"
fi
sudo docker build -t fetchrbox "$SRC"
sudo docker rm -f fetchrbox >/dev/null 2>&1 || true
sudo docker run -d --name fetchrbox --restart unless-stopped --env-file "$ENV_FILE" -p 127.0.0.1:8080:8080 -v /opt/fetchrbox-data:/data fetchrbox

echo "==> 5/6 HTTPS automatik (Caddy)"
IP="$(curl -fsS https://api.ipify.org)"
HOST="$(echo "$IP" | tr . -).sslip.io"
sudo mkdir -p /opt/caddy
printf '%s {\n  encode zstd gzip\n  reverse_proxy 127.0.0.1:8080 {\n    flush_interval -1\n  }\n}\n' "$HOST" | sudo tee /opt/caddy/Caddyfile >/dev/null
sudo docker rm -f caddy >/dev/null 2>&1 || true
sudo docker run -d --name caddy --restart unless-stopped --network host -v /opt/caddy/Caddyfile:/etc/caddy/Caddyfile -v caddy_data:/data caddy:2

echo "==> 6/6 Kemas kini yt-dlp setiap hari (supaya YouTube/TikTok sentiasa jalan)"
echo '17 4 * * * root docker exec fetchrbox yt-dlp -U >/dev/null 2>&1' | sudo tee /etc/cron.d/fetchrbox-ytdlp >/dev/null

sleep 8
echo
echo "Semak: curl -s https://$HOST/api/health"
curl -fsS "https://$HOST/api/health" || echo "(HTTPS mungkin ambil seminit lagi; pastikan port 80 dan 443 dibuka dalam Security List Oracle)"
echo
echo "SIAP. Beri URL ini kepada Claude:  https://$HOST"
