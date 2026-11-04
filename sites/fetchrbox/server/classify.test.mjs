import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from './classify.mjs';

test('Creative Commons dibenarkan walaupun muzik', () => {
  assert.equal(classify({ title: 'My song (Official Audio)', license: 'Creative Commons Attribution license (reuse allowed)' }).ok, true);
});
test('muzik rasmi ditolak', () => {
  assert.deepEqual(classify({ title: 'Rick Astley - Never Gonna Give You Up (Official Video)', channel: 'Rick Astley' }), { ok: false, code: 'music' });
  assert.equal(classify({ title: 'Lagu', artist: 'Siti' }).code, 'music');
  assert.equal(classify({ title: 'x', channel: 'Artis - Topic' }).code, 'music');
});
test('filem dan siri ditolak', () => {
  assert.equal(classify({ title: 'Full Movie 2024' }).code, 'media');
  assert.equal(classify({ title: 'Drama', series: 'Drama X', episode_number: 3 }).code, 'media');
});
test('kandungan berbayar/ahli ditolak', () => {
  assert.equal(classify({ title: 'Kelas', availability: 'subscriber_only' }).code, 'restricted');
});
test('video biasa dibenarkan (bergantung pada pengakuan pengguna)', () => {
  assert.equal(classify({ title: 'Vlog hari raya kami', channel: 'Ali' }).ok, true);
});
