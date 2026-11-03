import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, hasAtLeast, isStale, isExpired, isCommandType, validDeviceName } from '../logic';

test('EXECUTED hanya selepas SENT/ACKNOWLEDGED, tidak dari PENDING', () => {
  assert.equal(canTransition('PENDING', 'EXECUTED'), false);
  assert.equal(canTransition('PENDING', 'SENT'), true);
  assert.equal(canTransition('SENT', 'EXECUTED'), true);
  assert.equal(canTransition('ACKNOWLEDGED', 'EXECUTED'), true);
});
test('status akhir tidak boleh berubah', () => {
  for (const s of ['EXECUTED', 'FAILED', 'EXPIRED'] as const) {
    assert.equal(canTransition(s, 'PENDING'), false);
    assert.equal(canTransition(s, 'EXECUTED'), false);
  }
});
test('hierarki peranan', () => {
  assert.equal(hasAtLeast('VIEWER', 'DEVICE_MANAGER'), false);
  assert.equal(hasAtLeast('ORG_ADMIN', 'DEVICE_MANAGER'), true);
  assert.equal(hasAtLeast(undefined, 'VIEWER'), false);
  assert.equal(hasAtLeast('DEVICE', 'VIEWER'), false);
});
test('heartbeat basi => OFFLINE', () => {
  assert.equal(isStale(null, 1000, 500), true);
  assert.equal(isStale(900, 1000, 500), false);
  assert.equal(isStale(100, 1000, 500), true);
});
test('arahan tamat tempoh', () => {
  assert.equal(isExpired(1000, 1000), true);
  assert.equal(isExpired(2000, 1000), false);
});
test('validasi input', () => {
  assert.equal(isCommandType('LOCK'), true);
  assert.equal(isCommandType('WIPE'), false);
  assert.equal(validDeviceName('  '), false);
  assert.equal(validDeviceName('HONOR TABLET 01'), true);
});
