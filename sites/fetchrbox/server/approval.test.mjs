import test from 'node:test';
import assert from 'node:assert/strict';
import { checkApproval } from './approval.mjs';

const doc = (status, url) => ({ ok: true, json: async () => ({ fields: { status: { stringValue: status }, url: { stringValue: url } } }) });
const U = 'https://www.youtube.com/watch?v=abc';
const base = { idToken: 'tok', approvalId: 'AbCdEf1234567890', url: U };

test('dibenarkan jika status approved dan url sepadan', async () => {
  assert.equal(await checkApproval({ ...base, fetchImpl: async () => doc('approved', U) }), true);
});
test('ditolak jika status pending atau rejected', async () => {
  assert.equal(await checkApproval({ ...base, fetchImpl: async () => doc('pending', U) }), false);
  assert.equal(await checkApproval({ ...base, fetchImpl: async () => doc('rejected', U) }), false);
});
test('ditolak jika url berbeza (kelulusan tidak boleh dipakai untuk pautan lain)', async () => {
  assert.equal(await checkApproval({ ...base, fetchImpl: async () => doc('approved', 'https://youtu.be/lain') }), false);
});
test('ditolak jika Firestore menafikan akses (bukan pemilik) atau token kosong', async () => {
  assert.equal(await checkApproval({ ...base, fetchImpl: async () => ({ ok: false }) }), false);
  assert.equal(await checkApproval({ ...base, idToken: '', fetchImpl: async () => doc('approved', U) }), false);
});
test('id mencurigakan ditolak tanpa panggilan rangkaian', async () => {
  let called = false;
  assert.equal(await checkApproval({ ...base, approvalId: '../../x', fetchImpl: async () => { called = true; return doc('approved', U); } }), false);
  assert.equal(called, false);
});
test('ralat rangkaian = ditolak', async () => {
  assert.equal(await checkApproval({ ...base, fetchImpl: async () => { throw new Error('x'); } }), false);
});
