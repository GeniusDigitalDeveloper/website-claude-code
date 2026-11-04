// Tapisan hak cipta (usaha terbaik, BUKAN jaminan). Modul tulen supaya mudah diuji.
const MUSIC_RX = /(official\s+(music\s+)?(video|audio|lyric\s*video|mv|visuali[sz]er)|lyrics?\s+video|\blyrics?\b.*\b(video|audio)\b|karaoke|full\s+album|music\s+video|\(\s*mv\s*\))/i;
const MEDIA_RX = /(full\s+(movie|film|episode|season)|\bepisod(e|[ei])?\s*\d+\b|\bs\d{1,2}\s*e\d{1,3}\b)/i;
const MUSIC_CH_RX = /(vevo|-\s*topic$|\brecords?\b|\brecordings?\b|music\s+group|universal\s+music|sony\s+music|warner\s+music)/i;
const MEDIA_CH_RX = /(netflix|disney|hbo|prime\s+video|paramount|warner\s+bros|iflix|astro\s)/i;
export const REJECT_MSG = {
  music: 'Pautan ini kelihatan seperti kandungan muzik yang dilindungi hak cipta dan tidak boleh dimuat turun.',
  media: 'Pautan ini kelihatan seperti filem, siri atau kandungan komersial yang dilindungi hak cipta dan tidak boleh dimuat turun.',
  restricted: 'Kandungan ini terhad kepada pelanggan atau pembayar sahaja dan tidak boleh dimuat turun.',
};
export function classify(j) {
  const lic = String(j.license || '');
  if (/creative\s+commons|public\s+domain|\bcc[- ]by\b/i.test(lic)) return { ok: true, license: lic };
  const title = String(j.title || ''), ch = String(j.channel || j.uploader || '');
  if (['premium_only', 'subscriber_only', 'needs_auth', 'needs_subscription'].includes(j.availability)) return { ok: false, code: 'restricted' };
  if (j.artist || j.track || j.album || MUSIC_RX.test(title) || MUSIC_CH_RX.test(ch)) return { ok: false, code: 'music' };
  if (j.series || j.season_number || j.episode || j.episode_number || MEDIA_RX.test(title) || MEDIA_CH_RX.test(ch)) return { ok: false, code: 'media' };
  return { ok: true };
}
