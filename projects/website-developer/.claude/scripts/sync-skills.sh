#!/usr/bin/env bash
# Copy the shared skills + CLAUDE.md into another repo: sync-skills.sh /path/to/new-repo
set -euo pipefail
src="$(cd "$(dirname "$0")/../.." && pwd)"; dst="${1:?target repo path}"
mkdir -p "$dst/.claude/scripts"
cp -r "$src/.claude/skills" "$dst/.claude/"
cp "$src/.claude/scripts/sync-skills.sh" "$dst/.claude/scripts/"
[ -f "$dst/CLAUDE.md" ] || cp "$src/CLAUDE.md" "$dst/CLAUDE.md"
echo "Skills synced to $dst"
