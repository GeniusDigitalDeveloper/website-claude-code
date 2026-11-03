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

const ADMIN_EMAIL = { adm: 'mediapc2026@gmail.com', g: 'izzulmedia01@gmail.com' };   // e-mel dalam senarai admin pada rules
const adminCtx = (uid = 'adm', provider = 'password') => env.authenticatedContext(uid, { email: ADMIN_EMAIL[uid] || uid + '@kerja.com', firebase: { sign_in_provider: provider } });
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
  const f = env.authenticatedContext('baru', { email: 'izzulmedia01@gmail.com', email_verified: false, firebase: { sign_in_provider: 'password' } }).firestore();
  await assertSucceeds(getDoc(doc(f, 'devices/dev1')));
});
test('ADMIN: Google juga diterima', async () => {
  await assertSucceeds(getDoc(doc(adminCtx('g', 'google.com').firestore(), 'devices/dev1')));
});
test('PERANTI anonymous tidak boleh jadi admin: tidak boleh baca peranti lain / kumpulan / enrollment', async () => {
  await assertFails(getDoc(doc(dev('rawak'), 'devices/dev1')));
  await assertFails(getDoc(doc(dev('dev1'), 'devices/dev2')));
  await assertFails(addDoc(collection(dev('dev1'), 'deviceGroups'), { name: 'X' }));
  await assertFails(getDocs(collection(dev('dev1'), 'enrollments')));
});
test('ADMIN: cipta enrollment sah; kod pendek / jenis salah ditolak; peranti tidak boleh cipta', async () => {
  const ok = { deviceName: 'HONOR 10', deviceType: 'ANDROID', groupId: null, assignedUserId: null, status: 'PENDING', createdBy: 'adm', createdAt: serverTimestamp(), expiresAt: future(24) };
  await assertSucceeds(setDoc(doc(admin(), 'enrollments/' + 'D'.repeat(32)), ok));
  await assertFails(setDoc(doc(admin(), 'enrollments/pendek'), ok));
  await assertFails(setDoc(doc(admin(), 'enrollments/' + 'E'.repeat(32)), { ...ok, deviceType: 'TOASTER' }));
  await assertFails(setDoc(doc(dev('dev1'), 'enrollments/' + 'F'.repeat(32)), ok));
});

const regDoc = (uid, code, over = {}) => ({ deviceId: uid, deviceName: 'HONOR 01', deviceType: 'ANDROID', deviceModel: 'HONOR', osVersion: '13', status: 'ENROLLMENT_PENDING', isLocked: false,
  enrollmentStatus: 'PENDING_APPROVAL', assignedUserId: null, groupId: null, batteryLevel: 80, lastSeen: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), enrollmentCode: code, ...over });
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
  await assertFails(register('dev-f2', 'G'.repeat(32), { status: 'ONLINE', enrollmentStatus: 'ENROLLED' }));   // tidak boleh meluluskan diri sendiri
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
  await assertFails(deleteDoc(doc(dev('dev1'), 'activityLogs/' + ok.id)));   // peranti tidak boleh memadam
  await assertSucceeds(deleteDoc(ok));                                      // admin boleh memadam
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

test('AGENT ANDROID: heartbeat (devices + publicStatus) dan kitaran arahan seperti kod Kotlin', async () => {
  await env.withSecurityRulesDisabled(async (c) => { const f = c.firestore();
    await setDoc(doc(f, 'publicStatus/dev1'), { deviceName: 'T1', deviceType: 'ANDROID', status: 'ONLINE' });
    await setDoc(doc(f, 'commands/c-agent'), { deviceId: 'dev1', commandType: 'LOCK', status: 'PENDING', expiresAt: future() }); });
  const f = dev('dev1'); const b = writeBatch(f);
  b.update(doc(f, 'devices/dev1'), { status: 'ONLINE', isLocked: false, batteryLevel: null, osVersion: 'Android 14', appVersion: '0.1.0', lastSeen: serverTimestamp(), updatedAt: serverTimestamp() });
  b.update(doc(f, 'publicStatus/dev1'), { status: 'ONLINE', batteryLevel: null, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() });
  await assertSucceeds(b.commit());
  await assertSucceeds(updateDoc(doc(f, 'commands/c-agent'), { status: 'SENT', sentAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(f, 'commands/c-agent'), { status: 'EXECUTED', executedAt: serverTimestamp() }));
  await assertSucceeds(addDoc(collection(f, 'activityLogs'), { type: 'COMMAND_EXECUTED', message: 'LOCK berjaya', actorId: null, deviceId: 'dev1', createdAt: serverTimestamp() }));
});

test('MASA KUNCI: peranti rekod adminLockAt / onlineAgainAt / selfLockAt (cap masa sahaja); medan lain & teks ditolak', async () => {
  const f = dev('dev1');
  for (const k of ['adminLockAt', 'onlineAgainAt', 'selfLockAt'])
    await assertSucceeds(updateDoc(doc(f, 'devices/dev1'), { [k]: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'devices/dev1'), { selfLockAt: 'semalam', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'devices/dev1'), { deviceName: 'X', selfLockAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(dev('dev2'), 'devices/dev1'), { selfLockAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});

test('STATUS SERTA-MERTA: peranti tulis LOCKED/ONLINE + statusSince pada devices & publicStatus dalam satu batch', async () => {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'publicStatus/dev1'), { deviceName: 'T1', deviceType: 'ANDROID', status: 'ONLINE' }));
  const f = dev('dev1');
  for (const st of ['LOCKED', 'ONLINE']) {
    const b = writeBatch(f);
    b.update(doc(f, 'devices/dev1'), { status: st, isLocked: st === 'LOCKED', selfLockAt: serverTimestamp(), statusSince: serverTimestamp(), lastSeen: serverTimestamp(), updatedAt: serverTimestamp() });
    b.update(doc(f, 'publicStatus/dev1'), { status: st, batteryLevel: 80, lastSeen: serverTimestamp(), statusSince: serverTimestamp(), updatedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  }
  await assertFails(updateDoc(doc(f, 'publicStatus/dev1'), { status: 'ONLINE', statusSince: 'tadi', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'devices/dev1'), { statusSince: 'tadi', updatedAt: serverTimestamp() }));
});

test('ENROLLMENT: agent boleh baca enrollment PENDING dengan kod; USED/tamat dilindungi; tidak boleh senarai; tanpa log masuk ditolak', async () => {
  const FRESH = 'P'.repeat(32);
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'enrollments/' + FRESH), { deviceName: 'HONOR 77', deviceType: 'ANDROID', status: 'PENDING', expiresAt: future() }));
  await assertSucceeds(getDoc(doc(dev('baru-1'), 'enrollments/' + FRESH)));
  await assertFails(getDoc(doc(dev('baru-1'), 'enrollments/' + CODE2)));
  await assertFails(getDocs(collection(dev('baru-1'), 'enrollments')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'enrollments/' + FRESH)));
});

test('JENIS PERANTI: IOS/MAC/LINUX/OTHER dibenarkan; jenis rawak ditolak', async () => {
  for (const ty of ['IOS', 'MAC', 'LINUX', 'OTHER', 'WINDOWS']) {
    const ok = { deviceName: 'Peranti ' + ty, deviceType: ty, groupId: null, assignedUserId: null, status: 'PENDING', createdBy: 'adm', createdAt: serverTimestamp(), expiresAt: future(24) };
    await assertSucceeds(setDoc(doc(admin(), 'enrollments/' + ty.padEnd(32, 'X')), ok));
    await assertSucceeds(setDoc(doc(admin(), 'publicStatus/pub-' + ty), { deviceName: 'P', deviceType: ty, status: 'ONLINE' }));
  }
  await assertFails(setDoc(doc(admin(), 'publicStatus/pub-x'), { deviceName: 'P', deviceType: 'TOASTER', status: 'ONLINE' }));
});

test('DIPADAM: selepas admin padam peranti, ia tidak boleh lagi menulis status/heartbeat/arahan/baca dirinya', async () => {
  await env.withSecurityRulesDisabled(async (c) => { const f = c.firestore();
    await setDoc(doc(f, 'devices/gone1'), { deviceId: 'gone1', deviceName: 'G', deviceType: 'ANDROID', status: 'ONLINE', enrollmentStatus: 'ENROLLED' });
    await setDoc(doc(f, 'publicStatus/gone1'), { deviceName: 'G', deviceType: 'ANDROID', status: 'ONLINE' });
    await setDoc(doc(f, 'commands/c-gone'), { deviceId: 'gone1', commandType: 'LOCK', status: 'SENT', expiresAt: future() }); });
  const f = dev('gone1');
  await assertSucceeds(updateDoc(doc(f, 'devices/gone1'), { status: 'ONLINE', lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(doc(admin(), 'devices/gone1')));
  await assertFails(updateDoc(doc(f, 'devices/gone1'), { status: 'ONLINE', lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'publicStatus/gone1'), { status: 'ONLINE', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'commands/c-gone'), { status: 'EXECUTED', executedAt: serverTimestamp() }));
  await assertFails(getDoc(doc(f, 'devices/gone1')));
  await assertFails(setDoc(doc(f, 'devices/gone1'), { deviceId: 'gone1', deviceName: 'G', deviceType: 'ANDROID', status: 'ONLINE' }));
});

test('LEPASKAN DI PERANTI: dengan akaun admin, peranti + publicStatus dipadam dan log ditulis dalam satu batch; anonymous tidak boleh', async () => {
  await env.withSecurityRulesDisabled(async (c) => { const f = c.firestore();
    await setDoc(doc(f, 'devices/rel1'), { deviceId: 'rel1', deviceName: 'R', deviceType: 'ANDROID', status: 'ONLINE', enrollmentStatus: 'ENROLLED' });
    await setDoc(doc(f, 'publicStatus/rel1'), { deviceName: 'R', deviceType: 'ANDROID', status: 'ONLINE' }); });
  const a = admin(); const d = dev('rel1'); const bad = writeBatch(d);
  bad.delete(doc(d, 'devices/rel1'));
  await assertFails(bad.commit());
  const b = writeBatch(a);
  b.delete(doc(a, 'devices/rel1')); b.delete(doc(a, 'publicStatus/rel1'));
  b.set(doc(collection(a, 'activityLogs')), { type: 'DEVICE_REMOVED', message: 'dilepaskan', actorId: 'adm', deviceId: 'rel1', createdAt: serverTimestamp() });
  await assertSucceeds(b.commit());
});

// ---- Kelulusan admin (Terima) ----
const seedPending = (id) => env.withSecurityRulesDisabled(async (c) => { const f = c.firestore();
  await setDoc(doc(f, 'devices/' + id), { deviceId: id, deviceName: 'BARU ' + id, deviceType: 'ANDROID', status: 'ENROLLMENT_PENDING', enrollmentStatus: 'PENDING_APPROVAL', assignedUserId: null, groupId: null, lastSeen: Timestamp.now() });
  await setDoc(doc(f, 'publicStatus/' + id), { deviceName: 'BARU ' + id, deviceType: 'ANDROID', status: 'ENROLLMENT_PENDING' }); });
test('KELULUSAN: peranti menunggu tidak boleh heartbeat, kemas kini status awam, atau meluluskan diri sendiri', async () => {
  await seedPending('pend1'); const f = dev('pend1');
  await assertFails(updateDoc(doc(f, 'devices/pend1'), { status: 'ONLINE', lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'devices/pend1'), { enrollmentStatus: 'ENROLLED', status: 'ONLINE', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'publicStatus/pend1'), { status: 'ONLINE', updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(doc(f, 'devices/pend1')));   // boleh membaca rekod sendiri untuk tahu keputusan
});
test('KELULUSAN: admin Terima (hanya enrollmentStatus/status); selepas itu peranti boleh heartbeat', async () => {
  await seedPending('pend2');
  await assertFails(updateDoc(doc(admin(), 'devices/pend2'), { enrollmentStatus: 'ENROLLED', status: 'ONLINE', groupId: 'x', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(admin(), 'devices/pend2'), { enrollmentStatus: 'ENROLLED', status: 'LOCKED', updatedAt: serverTimestamp() }));
  const a = admin(); const b = writeBatch(a);
  b.update(doc(a, 'devices/pend2'), { enrollmentStatus: 'ENROLLED', status: 'ONLINE', updatedAt: serverTimestamp() });
  b.set(doc(a, 'publicStatus/pend2'), { deviceName: 'BARU pend2', deviceType: 'ANDROID', status: 'ONLINE', updatedAt: serverTimestamp() });
  await assertSucceeds(b.commit());
  await assertSucceeds(updateDoc(doc(dev('pend2'), 'devices/pend2'), { status: 'ONLINE', lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(dev('pend2'), 'publicStatus/pend2'), { status: 'ONLINE', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(admin(), 'devices/pend2'), { enrollmentStatus: 'PENDING_APPROVAL', status: 'ENROLLMENT_PENDING', updatedAt: serverTimestamp() }));   // tidak boleh diundur
});
test('KELULUSAN: admin tidak boleh hantar arahan kepada peranti menunggu; selepas Terima boleh; peranti menunggu tidak boleh kemas kini arahan', async () => {
  await seedPending('pend3');
  await assertFails(addDoc(collection(admin(), 'commands'), cmd({ deviceId: 'pend3' })));
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'commands/c-pend'), { deviceId: 'pend3', commandType: 'LOCK', status: 'PENDING', expiresAt: future() }));
  await assertFails(updateDoc(doc(dev('pend3'), 'commands/c-pend'), { status: 'SENT', sentAt: serverTimestamp() }));
  await updateDoc(doc(admin(), 'devices/pend3'), { enrollmentStatus: 'ENROLLED', status: 'ONLINE', updatedAt: serverTimestamp() });
  await assertSucceeds(addDoc(collection(admin(), 'commands'), cmd({ deviceId: 'pend3' })));
  await assertSucceeds(updateDoc(doc(dev('pend3'), 'commands/c-pend'), { status: 'SENT', sentAt: serverTimestamp() }));
});
test('KELULUSAN: admin boleh Tolak (padam) peranti menunggu dan status awamnya', async () => {
  await seedPending('pend4'); const a = admin(); const b = writeBatch(a);
  b.delete(doc(a, 'devices/pend4')); b.delete(doc(a, 'publicStatus/pend4'));
  await assertSucceeds(b.commit());
});

// ---- Senarai admin tetap dalam rules (sign-up dibuka dengan selamat) ----
test('ADMIN: akaun e-mel yang TIDAK dalam senarai ditolak walaupun berjaya didaftarkan; huruf besar/kecil e-mel tidak mengubah keputusan', async () => {
  const stranger = env.authenticatedContext('penyerang', { email: 'penyerang@jahat.com', email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore();
  await assertFails(getDoc(doc(stranger, 'devices/dev1')));
  await assertFails(getDocs(collection(stranger, 'enrollments')));
  await assertFails(addDoc(collection(stranger, 'commands'), cmd()));
  await assertFails(setDoc(doc(stranger, 'settings/x'), { a: 1 }));
  const upper = env.authenticatedContext('besar', { email: 'MediaPC2026@Gmail.com', firebase: { sign_in_provider: 'password' } }).firestore();
  await assertSucceeds(getDoc(doc(upper, 'devices/dev1')));
});
test('ADMIN: anonymous dengan e-mel dalam senarai tetap bukan admin', async () => {
  const anon = env.authenticatedContext('anon-x', { email: 'mediapc2026@gmail.com', firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(getDoc(doc(anon, 'devices/dev1')));
});
test('PERANTI TANPA E-MEL: telefon tanpa sebarang akaun/e-mel boleh mendaftar dengan kod QR yang sah', async () => {
  await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'enrollments/' + 'N'.repeat(32)), { deviceName: 'TANPA EMEL', deviceType: 'ANDROID', status: 'PENDING', expiresAt: future() }));
  await assertSucceeds(register('tanpa-emel', 'N'.repeat(32), { deviceName: 'TANPA EMEL' }));
});

// ---- Pengurusan: aplikasi, tapisan web, aktiviti, live monitoring ----
const app = (over = {}) => ({ packageName: 'com.google.android.youtube', label: 'YouTube', policy: 'BLOCK', groupId: null, createdAt: serverTimestamp(), createdBy: 'adm', ...over });
const wrule = (over = {}) => ({ type: 'DOMAIN', action: 'BLOCK', value: 'tiktok.com', groupId: null, createdAt: serverTimestamp(), createdBy: 'adm', ...over });
test('POLISI APLIKASI: admin cipta sah; pakej/polisi tidak sah ditolak; peranti tidak boleh tulis; hanya peranti disahkan boleh baca', async () => {
  await assertSucceeds(addDoc(collection(admin(), 'applications'), app()));
  await assertSucceeds(addDoc(collection(admin(), 'applications'), app({ policy: 'REQUIRE_APPROVAL', packageName: 'com.android.vending', label: 'Play Store', groupId: 'g1' })));
  await assertFails(addDoc(collection(admin(), 'applications'), app({ packageName: 'bukan pakej' })));
  await assertFails(addDoc(collection(admin(), 'applications'), app({ policy: 'DELETE' })));
  await assertFails(addDoc(collection(admin(), 'applications'), app({ extra: 1 })));
  await assertFails(addDoc(collection(dev('dev1'), 'applications'), app()));
  await assertSucceeds(getDocs(collection(dev('dev1'), 'applications')));
  await seedPending('pol-pend');
  await assertFails(getDocs(collection(dev('pol-pend'), 'applications')));
  await assertFails(getDocs(collection(dev('tidak-berdaftar'), 'applications')));
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), 'applications')));
});
test('TAPISAN WEB: domain sah/kategori sah; domain tidak sah ditolak; peranti disahkan boleh baca', async () => {
  await assertSucceeds(addDoc(collection(admin(), 'webFilteringRules'), wrule()));
  await assertSucceeds(addDoc(collection(admin(), 'webFilteringRules'), wrule({ type: 'CATEGORY', value: 'SOCIAL_MEDIA', domains: ['facebook.com', 'instagram.com'] })));
  await assertFails(addDoc(collection(admin(), 'webFilteringRules'), wrule({ value: 'https://tiktok.com/path' })));
  await assertFails(addDoc(collection(admin(), 'webFilteringRules'), wrule({ type: 'CATEGORY', value: 'RAWAK', domains: [] })));
  await assertFails(addDoc(collection(dev('dev1'), 'webFilteringRules'), wrule()));
  await assertSucceeds(getDocs(collection(dev('dev1'), 'webFilteringRules')));
});
test('AKTIVITI APLIKASI: peranti disahkan tulis sendiri; admin baca; tidak boleh ubah/padam; medan lain ditolak', async () => {
  const f = dev('dev1');
  const ref1 = await assertSucceeds(addDoc(collection(f, 'devices/dev1/appEvents'), { packageName: 'com.whatsapp', label: 'WhatsApp', at: Timestamp.now() }));
  await assertFails(addDoc(collection(f, 'devices/dev1/appEvents'), { packageName: 'com.whatsapp', label: 'WhatsApp', at: Timestamp.now(), isi: 'rahsia' }));
  await assertFails(updateDoc(ref1, { label: 'x' }));
  await assertFails(addDoc(collection(dev('dev2'), 'devices/dev1/appEvents'), { packageName: 'a.b', label: 'x', at: Timestamp.now() }));
  await assertSucceeds(getDocs(collection(admin(), 'devices/dev1/appEvents')));
  await assertFails(getDocs(collection(dev('dev1'), 'devices/dev1/appEvents')));
});
test('LIVE MONITORING: admin minta; peranti hantar bingkai hanya selepas diminta; berhenti bila STOPPED; peranti tak boleh mulakan sendiri', async () => {
  const a = admin();
  await assertFails(setDoc(doc(dev('dev1'), 'liveSessions/dev1'), { state: 'REQUESTED', requestedBy: 'dev1', requestedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(dev('dev1'), 'liveSessions/dev1'), { state: 'ACTIVE', frame: 'AAAA', seq: 1 }));
  await assertSucceeds(setDoc(doc(a, 'liveSessions/dev1'), { state: 'REQUESTED', requestedBy: 'adm', requestedAt: serverTimestamp() }));
  const f = dev('dev1');
  await assertSucceeds(updateDoc(doc(f, 'liveSessions/dev1'), { state: 'ACTIVE', frame: 'A'.repeat(1000), seq: 1, width: 540, height: 1170, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(f, 'liveSessions/dev1'), { frame: 'B'.repeat(1000), seq: 2, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(f, 'liveSessions/dev1'), { frame: 'C'.repeat(800000), seq: 3 }));            // terlalu besar
  await assertFails(updateDoc(doc(f, 'liveSessions/dev1'), { state: 'REQUESTED' }));                              // tidak boleh meminta sendiri
  await assertFails(updateDoc(doc(dev('dev2'), 'liveSessions/dev1'), { state: 'ACTIVE', frame: 'A', seq: 9 }));    // peranti lain
  await assertSucceeds(updateDoc(doc(a, 'liveSessions/dev1'), { state: 'STOPPED' }));
  await assertFails(updateDoc(doc(f, 'liveSessions/dev1'), { state: 'ACTIVE', frame: 'D', seq: 4 }));            // selepas STOPPED tiada bingkai
  await assertSucceeds(getDoc(doc(f, 'liveSessions/dev1')));
});
test('LIVE MONITORING: tidak boleh diminta untuk peranti yang belum disahkan; peranti lapor policyStatus', async () => {
  await seedPending('mon-pend');
  await assertFails(setDoc(doc(admin(), 'liveSessions/mon-pend'), { state: 'REQUESTED', requestedBy: 'adm', requestedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(dev('dev1'), 'devices/dev1'), { policyStatus: 'Aksesibiliti: aktif; VPN: aktif', updatedAt: serverTimestamp() }));
});

test('PADAM: admin boleh memadam log aktiviti dan rekod arahan; peranti dan orang awam tidak boleh', async () => {
  await env.withSecurityRulesDisabled(async (c) => { const f = c.firestore();
    await setDoc(doc(f, 'activityLogs/l-del'), { type: 'X', message: 'x', actorId: null, deviceId: null });
    await setDoc(doc(f, 'commands/c-del'), { deviceId: 'dev1', commandType: 'LOCK', status: 'EXECUTED', expiresAt: future() }); });
  await assertFails(deleteDoc(doc(dev('dev1'), 'commands/c-del')));
  await assertFails(deleteDoc(doc(env.unauthenticatedContext().firestore(), 'commands/c-del')));
  await assertFails(deleteDoc(doc(env.unauthenticatedContext().firestore(), 'activityLogs/l-del')));
  const a = admin(); const b = writeBatch(a);
  b.delete(doc(a, 'commands/c-del')); b.delete(doc(a, 'activityLogs/l-del'));
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(doc(admin(), 'activityLogs/x'), { message: 'ubah' }));   // tetap tidak boleh diubah
});
