import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, collection, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';

let env;
const future = (h = 24) => Timestamp.fromMillis(Date.now() + h * 3600e3);
const past = () => Timestamp.fromMillis(Date.now() - 3600e3);
const CODE = 'A'.repeat(32), CODE2 = 'B'.repeat(32), CODEX = 'C'.repeat(32);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mdc',
    firestore: { rules: readFileSync('../firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    ...(process.env.RTDB ? { database: { rules: readFileSync('../database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 } } : {}),
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'devices/dev1'), { deviceId: 'dev1', deviceName: 'T1', deviceType: 'ANDROID', status: 'ONLINE', enrollmentStatus: 'ENROLLED', groupId: null });
    await setDoc(doc(f, 'devices/dev2'), { deviceId: 'dev2', deviceName: 'T2', deviceType: 'ANDROID', status: 'ONLINE', enrollmentStatus: 'ENROLLED', groupId: null });
    await setDoc(doc(f, 'enrollments/' + CODE), { deviceName: 'HONOR 01', deviceType: 'ANDROID', status: 'PENDING', expiresAt: future() });
    await setDoc(doc(f, 'enrollments/' + CODE2), { deviceName: 'HONOR 02', deviceType: 'ANDROID', status: 'USED', deviceId: 'x', expiresAt: future() });
    await setDoc(doc(f, 'enrollments/' + CODEX), { deviceName: 'HONOR 03', deviceType: 'ANDROID', status: 'PENDING', expiresAt: past() });
    await setDoc(doc(f, 'commands/c-pending'), { deviceId: 'dev1', commandType: 'LOCK', status: 'PENDING', expiresAt: future() });
    await setDoc(doc(f, 'commands/c-sent'), { deviceId: 'dev1', commandType: 'LOCK', status: 'SENT', expiresAt: future() });
    await setDoc(doc(f, 'commands/c-expired'), { deviceId: 'dev1', commandType: 'LOCK', status: 'SENT', expiresAt: past() });
  });
});
after(() => env.cleanup());

const adminCtx = (uid = 'adm', provider = 'password') => env.authenticatedContext(uid, { email: uid + '@kerja.com', firebase: { sign_in_provider: provider } });
const admin = () => adminCtx().firestore();
const devCtx = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } });
const dev = (uid = 'dev1') => devCtx(uid).firestore();

test('tanpa log masuk: peranti/arahan/log/enrollment ditolak', async () => {
  const f = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(f, 'devices/dev1')));
  await assertFails(getDoc(doc(f, 'commands/c-pending')));
  await assertFails(getDoc(doc(f, 'enrollments/' + CODE)));
  await assertFails(getDoc(doc(f, 'activityLogs/x')));
  await assertFails(getDocs(collection(f, 'devices')));
});
const pub = (over = {}) => ({ deviceName: 'HONOR 01', deviceType: 'ANDROID', status: 'ONLINE', batteryLevel: 80, lastSeen: serverTimestamp(), groupName: null, updatedAt: serverTimestamp(), ...over });
test('AWAM: publicStatus boleh dibaca tanpa log masuk; tidak boleh ditulis oleh orang awam', async () => {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'publicStatus/dev1'), { deviceName: 'T1', deviceType: 'ANDROID', status: 'ONLINE' }));
  const f = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(f, 'publicStatus/dev1')));
  await assertSucceeds(getDocs(collection(f, 'publicStatus')));
  await assertFails(setDoc(doc(f, 'publicStatus/dev1'), pub()));
  await assertFails(deleteDoc(doc(f, 'publicStatus/dev1')));
});
test('AWAM: anonymous biasa (bukan peranti berdaftar) tidak boleh tulis; peranti berdaftar boleh tulis dirinya sahaja', async () => {
  await assertFails(setDoc(doc(dev('rawak'), 'publicStatus/rawak'), pub()));
  await assertSucceeds(setDoc(doc(dev('dev1'), 'publicStatus/dev1'), pub()));
  await assertFails(setDoc(doc(dev('dev1'), 'publicStatus/dev2'), pub()));
  await assertFails(setDoc(doc(dev('dev1'), 'publicStatus/dev1'), pub({ assignedUserId: 'ali' })));
});
test('AWAM: admin boleh tulis; medan sensitif / status tidak sah ditolak', async () => {
  await assertSucceeds(setDoc(doc(admin(), 'publicStatus/dev1'), pub({ groupName: 'Asrama Putera' })));
  await assertFails(setDoc(doc(admin(), 'publicStatus/dev1'), pub({ fcmToken: 'rahsia' })));
  await assertFails(setDoc(doc(admin(), 'publicStatus/dev1'), pub({ status: 'HACKED' })));
  await assertFails(setDoc(doc(admin(), 'publicStatus/dev1'), pub({ batteryLevel: 900 })));
  await assertSucceeds(deleteDoc(doc(admin(), 'publicStatus/dev1')));
});
test('ADMIN: akaun e-mel/kata laluan terus boleh baca (tiada organisasi/peranan/pengesahan e-mel)', async () => {
  const f = env.authenticatedContext('baru', { email: 'baru@kerja.com', email_verified: false, firebase: { sign_in_provider: 'password' } }).firestore();
  await assertSucceeds(getDoc(doc(f, 'devices/dev1')));
});
test('ADMIN: Google juga diterima', async () => {
  await assertSucceeds(getDoc(doc(adminCtx('g', 'google.com').firestore(), 'devices/dev1')));
});
test('PERANTI anonymous tidak boleh jadi admin: tidak boleh baca peranti lain / kumpulan / enrollment', async () => {
  await assertFails(getDoc(doc(dev('rawak'), 'devices/dev1')));
  await assertFails(getDoc(doc(dev('dev1'), 'devices/dev2')));
  await assertFails(addDoc(collection(dev('dev1'), 'deviceGroups'), { name: 'X' }));
  await assertFails(getDoc(doc(dev('dev1'), 'enrollments/' + CODE)));
});
test('ADMIN: cipta enrollment sah; kod pendek / jenis salah ditolak; peranti tidak boleh cipta', async () => {
  const ok = { deviceName: 'HONOR 10', deviceType: 'ANDROID', groupId: null, assignedUserId: null, status: 'PENDING', createdBy: 'adm', createdAt: serverTimestamp(), expiresAt: future(24) };
  await assertSucceeds(setDoc(doc(admin(), 'enrollments/' + 'D'.repeat(32)), ok));
  await assertFails(setDoc(doc(admin(), 'enrollments/pendek'), ok));
  await assertFails(setDoc(doc(admin(), 'enrollments/' + 'E'.repeat(32)), { ...ok, deviceType: 'TOASTER' }));
  await assertFails(setDoc(doc(dev('dev1'), 'enrollments/' + 'F'.repeat(32)), ok));
});

const regDoc = (uid, code, over = {}) => ({ deviceId: uid, deviceName: 'HONOR 01', deviceType: 'ANDROID', deviceModel: 'HONOR', osVersion: '13', status: 'ONLINE', isLocked: false,
  enrollmentStatus: 'ENROLLED', assignedUserId: null, groupId: null, batteryLevel: 80, lastSeen: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), enrollmentCode: code, ...over });
function register(uid, code, over = {}, usedBy = uid) {
  const f = dev(uid); const b = writeBatch(f);
  b.set(doc(f, 'devices/' + uid), regDoc(uid, code, over));
  b.update(doc(f, 'enrollments/' + code), { status: 'USED', deviceId: usedBy, usedAt: serverTimestamp() });
  return b.commit();
}
test('ENROLLMENT: peranti mendaftar dengan kod sah (sekali guna)', async () => {
  await assertSucceeds(register('new-dev', CODE));
});
test('ENROLLMENT: kod yang sudah USED / tamat / tidak wujud ditolak', async () => {
  await assertFails(register('dev-a', CODE2));
  await assertFails(register('dev-b', CODEX));
  await assertFails(register('dev-c', 'Z'.repeat(32)));
});
test('ENROLLMENT: nama/jenis mesti sama dengan enrollment; uid mesti sama dengan deviceId', async () => {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'enrollments/' + 'G'.repeat(32)), { deviceName: 'HONOR 07', deviceType: 'ANDROID', status: 'PENDING', expiresAt: future() }));
  await assertFails(register('dev-d', 'G'.repeat(32), { deviceName: 'DIPALSUKAN' }));
  await assertFails(register('dev-e', 'G'.repeat(32), {}, 'orang-lain'));
  await assertFails(register('dev-f', 'G'.repeat(32), { status: 'LOCKED' }));
});
test('ENROLLMENT: tidak boleh cipta peranti tanpa menanda kod USED', async () => {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'enrollments/' + 'H'.repeat(32)), { deviceName: 'HONOR 08', deviceType: 'ANDROID', status: 'PENDING', expiresAt: future() }));
  await assertFails(setDoc(doc(dev('dev-g'), 'devices/dev-g'), regDoc('dev-g', 'H'.repeat(32), { deviceName: 'HONOR 08' })));
});

test('PERANTI: lapor heartbeat sendiri sahaja; tidak boleh ubah nama/kumpulan', async () => {
  await assertSucceeds(updateDoc(doc(dev('dev1'), 'devices/dev1'), { status: 'ONLINE', batteryLevel: 55, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(dev('dev1'), 'devices/dev1'), { deviceName: 'DIPALSUKAN' }));
  await assertFails(updateDoc(doc(dev('dev1'), 'devices/dev1'), { groupId: 'x' }));
  await assertFails(updateDoc(doc(dev('dev1'), 'devices/dev2'), { status: 'ONLINE' }));
  await assertFails(updateDoc(doc(dev('dev1'), 'devices/dev1'), { batteryLevel: 500 }));
});
test('ADMIN: sunting metadata peranti, tidak boleh ubah status; boleh padam', async () => {
  await assertSucceeds(updateDoc(doc(admin(), 'devices/dev1'), { deviceName: 'Nama Baru', assignedUserId: 'ali', groupId: 'g1', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(admin(), 'devices/dev1'), { status: 'LOCKED' }));
  await assertFails(updateDoc(doc(admin(), 'devices/dev1'), { deviceName: '' }));
  await assertSucceeds(deleteDoc(doc(admin(), 'devices/dev2')));
});
test('ADMIN: kumpulan CRUD', async () => {
  await assertSucceeds(addDoc(collection(admin(), 'deviceGroups'), { name: 'Asrama Putera', description: '', policyIds: [], createdAt: serverTimestamp(), createdBy: 'adm' }));
});

const cmd = (over = {}) => ({ commandId: 'x', deviceId: 'dev1', commandType: 'LOCK', status: 'PENDING', createdBy: 'adm', createdAt: serverTimestamp(), expiresAt: future(24), sentAt: null, executedAt: null, errorMessage: null, ...over });
test('ARAHAN: admin cipta PENDING sah; EXECUTED palsu / peranti tiada / jenis tidak sah / tanpa tamat ditolak', async () => {
  await assertSucceeds(addDoc(collection(admin(), 'commands'), cmd()));
  await assertFails(addDoc(collection(admin(), 'commands'), cmd({ status: 'EXECUTED' })));
  await assertFails(addDoc(collection(admin(), 'commands'), cmd({ deviceId: 'tiada' })));
  await assertFails(addDoc(collection(admin(), 'commands'), cmd({ commandType: 'WIPE' })));
  await assertFails(addDoc(collection(admin(), 'commands'), cmd({ expiresAt: future(24 * 30) })));
  await assertFails(addDoc(collection(dev('dev1'), 'commands'), cmd()));
});
test('ARAHAN: peranti PENDING→EXECUTED terus ditolak; SENT→EXECUTED dan PENDING→SENT dibenarkan', async () => {
  await assertFails(updateDoc(doc(dev('dev1'), 'commands/c-pending'), { status: 'EXECUTED', executedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(dev('dev1'), 'commands/c-pending'), { status: 'SENT', sentAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(dev('dev1'), 'commands/c-sent'), { status: 'EXECUTED', executedAt: serverTimestamp() }));
});
test('ARAHAN: peranti lain / arahan tamat tempoh ditolak; admin tidak boleh set EXECUTED', async () => {
  await assertFails(updateDoc(doc(dev('dev2'), 'commands/c-pending'), { status: 'SENT' }));
  await assertFails(updateDoc(doc(dev('dev1'), 'commands/c-expired'), { status: 'EXECUTED', executedAt: serverTimestamp() }));
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'commands/c-a2'), { deviceId: 'dev1', commandType: 'LOCK', status: 'PENDING', expiresAt: future() }));
  await assertFails(updateDoc(doc(admin(), 'commands/c-a2'), { status: 'EXECUTED' }));
  await assertSucceeds(updateDoc(doc(admin(), 'commands/c-a2'), { status: 'EXPIRED', errorMessage: 'Dibatalkan' }));
});
test('LOG: tambah sahaja; admin tidak boleh palsukan actorId; peranti hanya jenis tertentu; tiada ubah/padam', async () => {
  const a = admin();
  const ok = await assertSucceeds(addDoc(collection(a, 'activityLogs'), { type: 'COMMAND_CREATED', message: 'LOCK', actorId: 'adm', deviceId: null, createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(a, 'activityLogs'), { type: 'COMMAND_CREATED', message: 'x', actorId: 'orang-lain', deviceId: null, createdAt: serverTimestamp() }));
  await assertFails(updateDoc(ok, { message: 'ubah' }));
  await assertFails(deleteDoc(ok));
  await assertSucceeds(addDoc(collection(dev('dev1'), 'activityLogs'), { type: 'COMMAND_EXECUTED', message: 'ok', actorId: null, deviceId: 'dev1', createdAt: serverTimestamp() }));
  await assertFails(addDoc(collection(dev('dev1'), 'activityLogs'), { type: 'USER_REMOVED', message: 'x', actorId: null, deviceId: 'dev1', createdAt: serverTimestamp() }));
  await assertFails(getDoc(doc(dev('dev1'), 'activityLogs/' + ok.id)));
});

// ---- Realtime Database (heartbeat pilihan) ----
test('RTDB: peranti tulis heartbeat sendiri; admin baca; peranti lain/anon tidak boleh baca', { skip: !process.env.RTDB }, async () => {
  await assertSucceeds(set(ref(devCtx('dev1').database(), 'presence/dev1'), { status: 'ONLINE', batteryLevel: 80, lastSeen: { '.sv': 'timestamp' } }));
  await assertFails(set(ref(devCtx('dev1').database(), 'presence/dev2'), { status: 'ONLINE', lastSeen: { '.sv': 'timestamp' } }));
  await assertSucceeds(get(ref(adminCtx().database(), 'presence')));
  await assertFails(get(ref(devCtx('dev1').database(), 'presence')));
});
