import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
    await setDoc(doc(f, 'organizations/A'), { name: 'Org A', ownerUid: 'x', createdAt: 1 });
    await setDoc(doc(f, 'members/m-admin'), { orgId: 'A', role: 'ORG_ADMIN', email: 'admin@a.com' });
    await setDoc(doc(f, 'members/m-mgr'), { orgId: 'A', role: 'DEVICE_MANAGER', email: 'mgr@a.com' });
    await setDoc(doc(f, 'members/m-view'), { orgId: 'A', role: 'VIEWER', email: 'v@a.com' });
    await setDoc(doc(f, 'members/m-super'), { orgId: 'A', role: 'SUPER_ADMIN', email: 'super@a.com' });
    await setDoc(doc(f, 'members/m-b'), { orgId: 'B', role: 'ORG_ADMIN', email: 'b@b.com' });
    await setDoc(doc(f, 'invites/jemput@a.com'), { orgId: 'A', role: 'VIEWER', createdBy: 'm-admin' });
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

// ---- Peranan melalui dokumen members (tanpa Custom Claims / tanpa Cloud Functions) ----
const asUser = (uid, extra = {}) => env.authenticatedContext(uid, { email: uid + '@x.com', email_verified: true, ...extra }).firestore();

test('MEMBER: ORG_ADMIN (tanpa claims) boleh baca peranti organisasinya, bukan organisasi lain', async () => {
  await assertSucceeds(getDoc(doc(asUser('m-admin'), 'organizations/A/devices/d1')));
  await assertFails(getDoc(doc(asUser('m-admin'), 'organizations/B/devices/d9')));
});
test('MEMBER: VIEWER baca sahaja; MANAGER sunting peranti', async () => {
  await assertSucceeds(getDoc(doc(asUser('m-view'), 'organizations/A/devices/d1')));
  await assertFails(updateDoc(doc(asUser('m-view'), 'organizations/A/devices/d1'), { deviceName: 'Z' }));
  await assertSucceeds(updateDoc(doc(asUser('m-mgr'), 'organizations/A/devices/d1'), { deviceName: 'Z' }));
});
test('MEMBER: pengguna tanpa dokumen member tidak boleh baca apa-apa', async () => {
  await assertFails(getDoc(doc(asUser('orang-asing'), 'organizations/A/devices/d1')));
  await assertFails(getDoc(doc(asUser('orang-asing'), 'organizations/A')));
});
test('MEMBER: pengguna boleh baca dokumen member sendiri sahaja', async () => {
  await assertSucceeds(getDoc(doc(asUser('m-view'), 'members/m-view')));
  await assertFails(getDoc(doc(asUser('m-view'), 'members/m-admin')));
});
test('MEMBER: senarai ahli (Users & Roles) hanya organisasi sendiri', async () => {
  await assertSucceeds(getDocs(query(collection(asUser('m-mgr'), 'members'), where('orgId', '==', 'A'))));
  await assertFails(getDocs(query(collection(asUser('m-mgr'), 'members'), where('orgId', '==', 'B'))));
  await assertFails(getDocs(query(collection(asUser('m-view'), 'members'), where('orgId', '==', 'A'))));
});
test('BOOTSTRAP: e-mel dibenarkan + disahkan boleh cipta organisasi pertama (batch)', async () => {
  const f = asUser('boss', { email: 'izzulmedia01@gmail.com' });
  const b = writeBatch(f);
  b.set(doc(f, 'organizations/NEW'), { name: 'Sekolah', ownerUid: 'boss', createdAt: 1 });
  b.set(doc(f, 'members/boss'), { orgId: 'NEW', role: 'SUPER_ADMIN', email: 'izzulmedia01@gmail.com', displayName: null, createdAt: 1 });
  await assertSucceeds(b.commit());
});
test('BOOTSTRAP: e-mel tiada dalam senarai / belum disahkan / org sedia ada ditolak', async () => {
  const mk = (ctx, org) => { const b = writeBatch(ctx); b.set(doc(ctx, 'organizations/' + org), { name: 'Hack', ownerUid: ctx._delegate ? 'u' : 'u', createdAt: 1 }); return b; };
  const f1 = env.authenticatedContext('u1', { email: 'penyerang@x.com', email_verified: true }).firestore();
  let b = writeBatch(f1); b.set(doc(f1, 'organizations/H1'), { name: 'Hack', ownerUid: 'u1', createdAt: 1 }); b.set(doc(f1, 'members/u1'), { orgId: 'H1', role: 'SUPER_ADMIN', email: 'penyerang@x.com', createdAt: 1 });
  await assertFails(b.commit());
  const f2 = env.authenticatedContext('u2', { email: 'izzulmedia01@gmail.com', email_verified: false }).firestore();
  b = writeBatch(f2); b.set(doc(f2, 'organizations/H2'), { name: 'Hack', ownerUid: 'u2', createdAt: 1 }); b.set(doc(f2, 'members/u2'), { orgId: 'H2', role: 'SUPER_ADMIN', email: 'izzulmedia01@gmail.com', createdAt: 1 });
  await assertFails(b.commit());
  const f3 = env.authenticatedContext('u3', { email: 'izzulmedia01@gmail.com', email_verified: true }).firestore();
  b = writeBatch(f3); b.set(doc(f3, 'organizations/A'), { name: 'Ambil alih', ownerUid: 'u3', createdAt: 1 }); b.set(doc(f3, 'members/u3'), { orgId: 'A', role: 'SUPER_ADMIN', email: 'izzulmedia01@gmail.com', createdAt: 1 });
  await assertFails(b.commit());
});
test('BOOTSTRAP: tidak boleh jadikan diri SUPER_ADMIN organisasi sedia ada tanpa organisasi baharu', async () => {
  const f = env.authenticatedContext('u4', { email: 'izzulmedia01@gmail.com', email_verified: true }).firestore();
  await assertFails(setDoc(doc(f, 'members/u4'), { orgId: 'A', role: 'SUPER_ADMIN', email: 'izzulmedia01@gmail.com', createdAt: 1 }));
});
test('JEMPUTAN: e-mel dijemput (disahkan) boleh tuntut peranan yang sama sahaja', async () => {
  const f = env.authenticatedContext('baru', { email: 'jemput@a.com', email_verified: true }).firestore();
  await assertFails(setDoc(doc(f, 'members/baru'), { orgId: 'A', role: 'ORG_ADMIN', email: 'jemput@a.com', createdAt: 1 }));   // naik taraf sendiri
  await assertSucceeds(setDoc(doc(f, 'members/baru'), { orgId: 'A', role: 'VIEWER', email: 'jemput@a.com', createdAt: 1 }));
});
test('JEMPUTAN: e-mel tidak disahkan atau tidak dijemput ditolak', async () => {
  const f = env.authenticatedContext('baru2', { email: 'jemput@a.com', email_verified: false }).firestore();
  await assertFails(setDoc(doc(f, 'members/baru2'), { orgId: 'A', role: 'VIEWER', email: 'jemput@a.com', createdAt: 1 }));
  const g = env.authenticatedContext('baru3', { email: 'lain@a.com', email_verified: true }).firestore();
  await assertFails(setDoc(doc(g, 'members/baru3'), { orgId: 'A', role: 'VIEWER', email: 'lain@a.com', createdAt: 1 }));
});
test('ADMIN: boleh cipta jemputan & tambah ahli; ORG_ADMIN tidak boleh lantik SUPER_ADMIN', async () => {
  const a = asUser('m-admin');
  await assertSucceeds(setDoc(doc(a, 'invites/guru@a.com'), { orgId: 'A', role: 'DEVICE_MANAGER', createdBy: 'm-admin', createdAt: 1 }));
  await assertFails(setDoc(doc(a, 'invites/bos@a.com'), { orgId: 'A', role: 'SUPER_ADMIN', createdBy: 'm-admin', createdAt: 1 }));
  await assertFails(setDoc(doc(a, 'invites/org-b@a.com'), { orgId: 'B', role: 'VIEWER', createdBy: 'm-admin', createdAt: 1 }));
  await assertSucceeds(setDoc(doc(a, 'members/uid-baru'), { orgId: 'A', role: 'VIEWER', email: 'z@a.com', createdAt: 1 }));
});
test('ADMIN: MANAGER/VIEWER tidak boleh urus ahli; tidak boleh ubah SUPER_ADMIN atau buang diri', async () => {
  await assertFails(setDoc(doc(asUser('m-mgr'), 'members/uid-x'), { orgId: 'A', role: 'VIEWER', email: 'x@a.com', createdAt: 1 }));
  await assertFails(updateDoc(doc(asUser('m-admin'), 'members/m-super'), { role: 'VIEWER' }));
  await assertFails(deleteDoc(doc(asUser('m-admin'), 'members/m-admin')));
  await assertSucceeds(updateDoc(doc(asUser('m-admin'), 'members/m-view'), { role: 'DEVICE_MANAGER' }));
});
test('JEMPUTAN: semak jemputan sendiri yang tiada tidak ralat; jemputan orang lain tidak boleh dibaca', async () => {
  const f = env.authenticatedContext('semak', { email: 'tiada-jemputan@a.com', email_verified: true }).firestore();
  const snap = await assertSucceeds(getDoc(doc(f, 'invites/tiada-jemputan@a.com')));
  assert.equal(snap.exists(), false);
  await assertFails(getDoc(doc(f, 'invites/jemput@a.com')));
});
