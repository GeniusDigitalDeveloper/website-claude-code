# Ujian

- `tests/e2e/qa.cjs` — Playwright: fade in/out (bacaan gain enjin audio), main/jeda pantas, next, resume, giliran, skrin penuh, carian, import muzik peranti (MP3+FLAC) + main + kekal selepas reload, tema, preset layout, edit layout, responsif 375/768/1440, mod TV.
- `tests/e2e/qa2.cjs` — crossfade, susun/buang/main-seterusnya giliran, shuffle, repeat, playlist (namakan semula, duplikasi), kegemaran.
- `backend/functions`: `npm test` — pautan reset & keselamatan templat e-mel.

Jalankan: `cd apps/web && npm run build && PORT=3100 npm start`, kemudian `node tests/e2e/qa.cjs <folder-audio-ujian>` (tukar URL dalam skrip jika perlu).
