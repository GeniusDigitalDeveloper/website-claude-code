import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';

let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mdc',
    firestore: { rules: readFileSync('../firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    ...(process.env.RTDB ? { database: { rules: readFileSync('../database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 } } : {}),
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'organizations/A/devices/d1'), { deviceName: 'T1', status: 'ONLINE', groupId: null });
    await setDoc(doc(f, 'organizations/B/devices/d9'), { deviceName: 'X', status: 'ONLINE' });
    await setDoc(doc(f, 'organizations/A/commands/c1'), { deviceId: 'd1', status: 'PENDING' });
  });
});
after(() => env.cleanup());

const user = (role, orgId = 'A') => env.authenticatedContext('u-' + role, { role, orgId }).firestore();
const device = (deviceId = 'd1', orgId = 'A') => env.authenticatedContext('device:' + deviceId, { role: 'DEVICE', orgId, deviceId });

test('tanpa log masuk ditolak', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'organizations/A/devices/d1')));
});
test('pengasingan organisasi', async () => {
  await assertSucceeds(getDoc(doc(user('ORG_ADMIN'), 'organizations/A/devices/d1')));
  await assertFails(getDoc(doc(user('ORG_ADMIN'), 'organizations/B/devices/d9')));
});
test('SUPER_ADMIN boleh baca organisasi lain', async () => {
  await assertSucceeds(getDoc(doc(user('SUPER_ADMIN'), 'organizations/B/devices/d9')));
});
test('VIEWER baca sahaja', async () => {
  await assertSucceeds(getDoc(doc(user('VIEWER'), 'organizations/A/devices/d1')));
  await assertFails(updateDoc(doc(user('VIEWER'), 'organizations/A/devices/d1'), { deviceName: 'Z' }));
});
test('DEVICE_MANAGER sunting metadata tetapi bukan status', async () => {
  const m = user('DEVICE_MANAGER');
  await assertSucceeds(updateDoc(doc(m, 'organizations/A/devices/d1'), { deviceName: 'Baru' }));
  await assertFails(updateDoc(doc(m, 'organizations/A/devices/d1'), { status: 'LOCKED' }));
  await assertFails(updateDoc(doc(m, 'organizations/A/devices/d1'), { isLocked: true }));
});
test('klien tidak boleh menulis command (hanya function)', async () => {
  await assertFails(addDoc(collection(user('ORG_ADMIN'), 'organizations/A/commands'), { deviceId: 'd1', commandType: 'LOCK', status: 'EXECUTED' }));
  await assertFails(updateDoc(doc(user('ORG_ADMIN'), 'organizations/A/commands/c1'), { status: 'EXECUTED' }));
});
test('activityLogs & enrollments tidak boleh ditulis klien', async () => {
  await assertFails(addDoc(collection(user('SUPER_ADMIN'), 'organizations/A/activityLogs'), { type: 'X' }));
  await assertFails(setDoc(doc(user('SUPER_ADMIN'), 'organizations/A/enrollments/e1'), { a: 1 }));
});
test('peranti tidak boleh ubah status sendiri di Firestore', async () => {
  const d = device().firestore();
  await assertSucceeds(getDoc(doc(d, 'organizations/A/devices/d1')));
  await assertFails(updateDoc(doc(d, 'organizations/A/devices/d1'), { status: 'ONLINE' }));
  await assertFails(getDoc(doc(d, 'organizations/A/devices/other')));
});
test('peranti hanya baca command miliknya', async () => {
  await assertSucceeds(getDoc(doc(device().firestore(), 'organizations/A/commands/c1')));
  await assertFails(getDoc(doc(device('d2').firestore(), 'organizations/A/commands/c1')));
});
test('pengguna tidak boleh cipta/padam organisasi', async () => {
  await assertFails(setDoc(doc(user('SUPER_ADMIN'), 'organizations/Z'), { name: 'x' }));
});
test('MANAGER tidak boleh ubah settings; ADMIN boleh', async () => {
  await assertFails(setDoc(doc(user('DEVICE_MANAGER'), 'organizations/A/settings/s'), { a: 1 }));
  await assertSucceeds(setDoc(doc(user('ORG_ADMIN'), 'organizations/A/settings/s'), { a: 1 }));
});

// ---- Realtime Database (heartbeat) ----
test('RTDB: peranti tulis heartbeat sendiri sahaja', { skip: !process.env.RTDB }, async () => {
  const d = device().database();
  await assertSucceeds(set(ref(d, 'presence/A/d1'), { status: 'ONLINE', batteryLevel: 80, lastSeen: { '.sv': 'timestamp' } }));
  await assertFails(set(ref(d, 'presence/A/d2'), { status: 'ONLINE', lastSeen: { '.sv': 'timestamp' } }));
  await assertFails(set(ref(d, 'presence/B/d1'), { status: 'ONLINE', lastSeen: { '.sv': 'timestamp' } }));
  await assertFails(set(ref(d, 'presence/A/d1'), { status: 'HACKED', lastSeen: { '.sv': 'timestamp' } }));
});
test('RTDB: admin baca organisasi sendiri, tidak boleh tulis', { skip: !process.env.RTDB }, async () => {
  const a = env.authenticatedContext('adm', { role: 'ORG_ADMIN', orgId: 'A' }).database();
  await assertSucceeds(get(ref(a, 'presence/A')));
  await assertFails(get(ref(a, 'presence/B')));
  await assertFails(set(ref(a, 'presence/A/d1'), { status: 'ONLINE', lastSeen: { '.sv': 'timestamp' } }));
});
