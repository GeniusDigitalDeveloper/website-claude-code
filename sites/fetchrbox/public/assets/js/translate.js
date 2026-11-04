// Terjemahan automatik (ms / en / ar) dari pelayar. Tiada kunci rahsia.
// Rantai: 1) titik akhir percuma Google (tidak rasmi)  2) MyMemory (kuota harian terhad).
// Jika kedua-duanya gagal, fungsi memulangkan null dan pemanggil memaparkan teks asal.
const cache = new Map();

function chunks(text, max = 450) {
  const parts = text.match(/[^.!?؟\n]+[.!?؟\n]*/g) || [text];
  const out = []; let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) { out.push(cur); cur = ''; }
    if (p.length > max) { for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max)); } else cur += p;
  }
  if (cur) out.push(cur);
  return out;
}

async function getJson(url) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); }
  finally { clearTimeout(to); }
}
async function viaGoogle(text, from, to) {
  const j = await getJson(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
  if (!Array.isArray(j) || !Array.isArray(j[0])) throw new Error('format');
  return j[0].map((x) => x[0]).join('');
}
async function viaMyMemory(text, from, to) {
  const j = await getJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
  const out = j?.responseData?.translatedText;
  if (j?.responseStatus !== 200 || !out || /^MYMEMORY WARNING/i.test(out)) throw new Error('kuota');
  return out;
}

/** Terjemah teks. Pulang null jika semua penyedia gagal. */
export async function translate(text, from, to) {
  text = String(text || '').trim();
  if (!text || from === to) return text;
  const key = `${from}>${to}:${text}`;
  if (cache.has(key)) return cache.get(key);
  let result = null;
  for (const provider of [viaGoogle, viaMyMemory]) {
    try {
      const parts = [];
      for (const c of chunks(text)) parts.push(await provider(c, from, to));
      result = parts.join('').trim();
      if (result) break;
    } catch { result = null; }
  }
  if (result) cache.set(key, result);
  return result;
}
