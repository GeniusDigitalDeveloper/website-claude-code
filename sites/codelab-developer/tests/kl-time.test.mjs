// Ujian peraturan reset statistik (waktu Malaysia). Jalankan: node tests/kl-time.test.mjs
import assert from 'node:assert/strict';
import { dayKey, monthKey, msUntilNextDay, nextMonthStart, msUntilNextMonth, fmtCountdown } from '../js/statistics/kl-time.js';

const utc = (s) => new Date(s);
// 23:59:59 MYT (15:59:59 UTC) masih hari yang sama
assert.equal(dayKey(utc('2026-11-06T15:59:59Z')), '2026-11-06');
// 00:00:00 MYT (16:00:00 UTC) = hari baharu
assert.equal(dayKey(utc('2026-11-06T16:00:00Z')), '2026-11-07');
// Jam peranti di zon waktu lain tidak mempengaruhi kunci (UTC 00:30 = 08:30 MYT hari yang sama)
assert.equal(dayKey(utc('2026-11-07T00:30:00Z')), '2026-11-07');
// Akhir bulan: 30 Nov 23:59:59 MYT masih November; 1 Dis 00:00:00 MYT = Disember
assert.equal(monthKey(utc('2026-11-30T15:59:59Z')), '2026-11');
assert.equal(monthKey(utc('2026-11-30T16:00:00Z')), '2026-12');
// Pertukaran tahun
assert.equal(monthKey(utc('2026-12-31T15:59:59Z')), '2026-12');
assert.equal(monthKey(utc('2026-12-31T16:00:00Z')), '2027-01');
assert.equal(dayKey(utc('2026-12-31T16:00:00Z')), '2027-01-01');
// Tahun lompat: 28 Feb 2028 → 29 Feb 2028
assert.equal(dayKey(utc('2028-02-28T16:00:00Z')), '2028-02-29');
// Kiraan detik ke reset harian seterusnya
assert.equal(msUntilNextDay(utc('2026-11-06T15:59:59Z')), 1000);
assert.equal(msUntilNextDay(utc('2026-11-06T16:00:00Z')), 86400000);
// Reset bulanan seterusnya = 00:00 MYT hari pertama bulan hadapan
assert.equal(nextMonthStart(utc('2026-11-15T00:00:00Z')).toISOString(), '2026-11-30T16:00:00.000Z');
assert.equal(nextMonthStart(utc('2026-12-15T00:00:00Z')).toISOString(), '2026-12-31T16:00:00.000Z');
assert.equal(msUntilNextMonth(utc('2026-11-30T15:59:59Z')), 1000);
assert.equal(fmtCountdown(3661000), '01:01:01');
console.log('kl-time: semua ujian lulus');
