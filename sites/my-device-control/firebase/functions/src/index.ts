import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onValueWritten } from 'firebase-functions/v2/database';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineString } from 'firebase-functions/params';
import { randomBytes, createHash } from 'node:crypto';
import {
  COMMAND_TTL_MS, ENROLLMENT_TTL_MS, OFFLINE_AFTER_MS, canTransition, hasAtLeast,
  isCommandType, isRole, validDeviceName, CommandStatus, Role,
} from './logic';

initializeApp();
const db = getFirestore();
const REGION = 'asia-southeast1';
const opts = { region: REGION, enforceAppCheck: false } as const; // tukar kepada true selepas App Check didaftarkan

// Senarai e-mel yang dibenarkan mencipta organisasi pertama / jadi SUPER_ADMIN.
// Tetapkan dalam firebase/functions/.env : BOOTSTRAP_ADMIN_EMAILS=a@x.com,b@y.com
const BOOTSTRAP_EMAILS = defineString('BOOTSTRAP_ADMIN_EMAILS', { default: '' });

// ---------- Bantuan ----------
const org = (orgId: string) => db.collection('organizations').doc(orgId);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

type Claims = { orgId?: string; role?: string; deviceId?: string };
function claims(req: CallableRequest): Claims {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sila log masuk.');
  return req.auth.token as unknown as Claims;
}
function requireRole(req: CallableRequest, min: Role): { uid: string; orgId: string; role: string } {
  const c = claims(req);
  if (!c.orgId || !hasAtLeast(c.role, min)) {
    throw new HttpsError('permission-denied', 'Anda tiada kebenaran untuk tindakan ini.');
  }
  return { uid: req.auth!.uid, orgId: c.orgId, role: c.role! };
}
/** SUPER_ADMIN boleh bertindak ke atas organisasi lain; yang lain terkunci pada orgId sendiri. */
function targetOrg(req: CallableRequest, who: { orgId: string; role: string }): string {
  const asked = (req.data as { orgId?: string })?.orgId;
  if (asked && asked !== who.orgId) {
    if (who.role !== 'SUPER_ADMIN') throw new HttpsError('permission-denied', 'Organisasi lain tidak dibenarkan.');
    return asked;
  }
  return who.orgId;
}
function requireDevice(req: CallableRequest): { orgId: string; deviceId: string } {
  const c = claims(req);
  if (c.role !== 'DEVICE' || !c.orgId || !c.deviceId) {
    throw new HttpsError('permission-denied', 'Token peranti diperlukan.');
  }
  return { orgId: c.orgId, deviceId: c.deviceId };
}

async function audit(orgId: string, e: {
  type: string; message: string; actorId?: string | null; deviceId?: string | null; meta?: Record<string, unknown>;
}) {
  await org(orgId).collection('activityLogs').add({
    type: e.type, message: e.message, actorId: e.actorId ?? null, deviceId: e.deviceId ?? null,
    meta: e.meta ?? {}, createdAt: FieldValue.serverTimestamp(),
  });
}

/** Had kadar ringkas berasaskan Firestore (koleksi _rateLimits, ditolak oleh rules). */
async function rateLimit(key: string, max: number, windowSec: number) {
  const ref = db.collection('_rateLimits').doc(sha256(key));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const d = snap.data() as { count: number; resetAt: number } | undefined;
    if (!d || d.resetAt < now) { tx.set(ref, { count: 1, resetAt: now + windowSec * 1000 }); return; }
    if (d.count >= max) throw new HttpsError('resource-exhausted', 'Terlalu banyak percubaan. Cuba sebentar lagi.');
    tx.update(ref, { count: d.count + 1 });
  });
}

// =====================================================================
// 1. ORGANISASI & PENGGUNA (apa-apa penyedia Auth)
// =====================================================================

/**
 * Cipta organisasi dan jadikan pemanggil admin. Berfungsi untuk SEMUA penyedia
 * log masuk (Email, Google, Microsoft, SAML...) kerana hanya bergantung pada uid.
 * Hanya e-mel dalam BOOTSTRAP_ADMIN_EMAILS dibenarkan (SUPER_ADMIN).
 */
export const bootstrapOrganization = onCall(opts, async (req) => {
  const c = claims(req);
  const email = (req.auth!.token.email ?? '').toLowerCase();
  const allow = BOOTSTRAP_EMAILS.value().split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !allow.includes(email) || req.auth!.token.email_verified === false) {
    throw new HttpsError('permission-denied', 'E-mel ini tiada dalam senarai BOOTSTRAP_ADMIN_EMAILS atau belum disahkan.');
  }
  if (c.orgId) throw new HttpsError('already-exists', 'Akaun ini sudah dikaitkan dengan organisasi.');
  const name = String((req.data as { name?: string })?.name ?? '').trim();
  if (name.length < 2 || name.length > 100) throw new HttpsError('invalid-argument', 'Nama organisasi tidak sah.');

  const ref = db.collection('organizations').doc();
  await ref.set({ name, createdAt: FieldValue.serverTimestamp(), createdBy: req.auth!.uid });
  await ref.collection('users').doc(req.auth!.uid).set({
    uid: req.auth!.uid, email, displayName: req.auth!.token.name ?? null,
    role: 'SUPER_ADMIN', provider: req.auth!.token.firebase?.sign_in_provider ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  await getAuth().setCustomUserClaims(req.auth!.uid, { orgId: ref.id, role: 'SUPER_ADMIN' });
  await audit(ref.id, { type: 'ORG_CREATED', message: `Organisasi "${name}" dicipta`, actorId: req.auth!.uid });
  return { orgId: ref.id, note: 'Log keluar & masuk semula (atau refresh token) untuk mengaktifkan peranan.' };
});

/**
 * Hubungkan akaun Auth SEDIA ADA (atau yang ditambah kemudian, apa-apa penyedia)
 * ke organisasi dengan peranan. Rujuk melalui e-mel ATAU uid.
 */
export const assignUser = onCall(opts, async (req) => {
  const who = requireRole(req, 'ORG_ADMIN');
  const orgId = targetOrg(req, who);
  const { email, uid, role } = req.data as { email?: string; uid?: string; role?: string };
  if (!isRole(role)) throw new HttpsError('invalid-argument', 'Peranan tidak sah.');
  if (role === 'SUPER_ADMIN' && who.role !== 'SUPER_ADMIN') {
    throw new HttpsError('permission-denied', 'Hanya SUPER_ADMIN boleh melantik SUPER_ADMIN.');
  }
  let user;
  try {
    user = uid ? await getAuth().getUser(uid) : await getAuth().getUserByEmail(String(email));
  } catch {
    throw new HttpsError('not-found', 'Pengguna Auth tidak dijumpai. Mereka perlu log masuk sekali dahulu.');
  }
  const existing = user.customClaims as Claims | undefined;
  if (existing?.orgId && existing.orgId !== orgId && who.role !== 'SUPER_ADMIN') {
    throw new HttpsError('failed-precondition', 'Pengguna ini milik organisasi lain.');
  }
  await getAuth().setCustomUserClaims(user.uid, { orgId, role });
  await org(orgId).collection('users').doc(user.uid).set({
    uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? null, role,
    provider: user.providerData[0]?.providerId ?? null, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await audit(orgId, { type: 'USER_ROLE_SET', message: `${user.email ?? user.uid} → ${role}`, actorId: who.uid });
  return { uid: user.uid };
});

export const removeUser = onCall(opts, async (req) => {
  const who = requireRole(req, 'ORG_ADMIN');
  const orgId = targetOrg(req, who);
  const uid = String((req.data as { uid?: string }).uid ?? '');
  if (!uid || uid === who.uid) throw new HttpsError('invalid-argument', 'Tidak boleh buang diri sendiri.');
  const user = await getAuth().getUser(uid);
  if ((user.customClaims as Claims | undefined)?.orgId !== orgId) throw new HttpsError('not-found', 'Bukan ahli organisasi ini.');
  await getAuth().setCustomUserClaims(uid, null);
  await getAuth().revokeRefreshTokens(uid);
  await org(orgId).collection('users').doc(uid).delete();
  await audit(orgId, { type: 'USER_REMOVED', message: `${user.email ?? uid} dibuang`, actorId: who.uid });
  return { ok: true };
});

// =====================================================================
// 2. ENROLLMENT & PENDAFTARAN PERANTI
// =====================================================================

export const createEnrollment = onCall(opts, async (req) => {
  const who = requireRole(req, 'DEVICE_MANAGER');
  const orgId = targetOrg(req, who);
  const d = req.data as { deviceType?: string; deviceName?: string; groupId?: string; assignedUserId?: string };
  if (d.deviceType !== 'ANDROID' && d.deviceType !== 'WINDOWS') throw new HttpsError('invalid-argument', 'deviceType mesti ANDROID atau WINDOWS.');
  if (!validDeviceName(d.deviceName)) throw new HttpsError('invalid-argument', 'Nama peranti tidak sah.');

  const token = randomBytes(32).toString('base64url');
  const ref = org(orgId).collection('enrollments').doc();
  await ref.set({
    enrollmentId: ref.id, tokenHash: sha256(token), deviceType: d.deviceType,
    deviceName: d.deviceName!.trim(), groupId: d.groupId ?? null, assignedUserId: d.assignedUserId ?? null,
    status: 'PENDING', createdBy: who.uid, createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + ENROLLMENT_TTL_MS),
  });
  await audit(orgId, { type: 'ENROLLMENT_CREATED', message: `Enrollment ${d.deviceType} "${d.deviceName}"`, actorId: who.uid });
  // Token hanya dipaparkan SEKALI. Payload QR diguna oleh Android Enterprise / agent.
  return { enrollmentId: ref.id, token, qrPayload: JSON.stringify({ v: 1, orgId, enrollmentId: ref.id, token }) };
});

/** Dipanggil oleh agent peranti (tanpa log masuk). Token sekali guna → custom token peranti. */
export const registerDevice = onCall({ ...opts, invoker: 'public' }, async (req) => {
  const { orgId, enrollmentId, token, model, osVersion, fcmToken } = req.data as Record<string, string>;
  if (!orgId || !enrollmentId || !token) throw new HttpsError('invalid-argument', 'Data enrollment tidak lengkap.');
  await rateLimit(`reg:${req.rawRequest.ip}`, 20, 600);

  const eref = org(orgId).collection('enrollments').doc(enrollmentId);
  const deviceId = db.collection('_ids').doc().id;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(eref);
    const e = snap.data();
    if (!e || e.status !== 'PENDING' || e.tokenHash !== sha256(token) || e.expiresAt.toMillis() < Date.now()) {
      throw new HttpsError('permission-denied', 'Token enrollment tidak sah atau telah tamat.');
    }
    tx.update(eref, { status: 'USED', deviceId, usedAt: FieldValue.serverTimestamp() });
    tx.set(org(orgId).collection('devices').doc(deviceId), {
      deviceId, deviceName: e.deviceName, deviceType: e.deviceType,
      deviceModel: String(model ?? '').slice(0, 80), osVersion: String(osVersion ?? '').slice(0, 40),
      status: 'ONLINE', isLocked: false, enrollmentStatus: 'ENROLLED',
      assignedUserId: e.assignedUserId, groupId: e.groupId, fcmToken: fcmToken ?? null,
      batteryLevel: null, lastSeen: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await audit(orgId, { type: 'DEVICE_REGISTERED', message: 'Peranti didaftarkan', deviceId });
  const customToken = await getAuth().createCustomToken(`device:${deviceId}`, { role: 'DEVICE', orgId, deviceId });
  return { deviceId, customToken };
});

export const removeDevice = onCall(opts, async (req) => {
  const who = requireRole(req, 'ORG_ADMIN');
  const orgId = targetOrg(req, who);
  const deviceId = String((req.data as { deviceId?: string }).deviceId ?? '');
  const dref = org(orgId).collection('devices').doc(deviceId);
  if (!(await dref.get()).exists) throw new HttpsError('not-found', 'Peranti tidak dijumpai.');
  const open = await org(orgId).collection('commands').where('deviceId', '==', deviceId)
    .where('status', 'in', ['PENDING', 'SENT']).get();
  const batch = db.batch();
  open.docs.forEach((d) => batch.update(d.ref, { status: 'EXPIRED', errorMessage: 'Peranti dinyahdaftar' }));
  batch.delete(dref);
  await batch.commit();
  await audit(orgId, { type: 'DEVICE_REMOVED', message: 'Peranti dinyahdaftar', actorId: who.uid, deviceId });
  return { ok: true };
});

// =====================================================================
// 3. COMMAND QUEUE
// =====================================================================

export const createCommand = onCall(opts, async (req) => {
  const who = requireRole(req, 'DEVICE_MANAGER');
  const orgId = targetOrg(req, who);
  const d = req.data as { commandType?: string; deviceIds?: string[]; groupId?: string; all?: boolean; platform?: string };
  if (!isCommandType(d.commandType)) throw new HttpsError('invalid-argument', 'Jenis arahan tidak sah.');

  // Pilih sasaran — semuanya disahkan wujud dalam organisasi ini.
  const devices = org(orgId).collection('devices');
  let docs;
  if (d.all) {
    if (!hasAtLeast(who.role, 'ORG_ADMIN')) throw new HttpsError('permission-denied', 'Hanya admin boleh menyasarkan semua peranti.');
    let q = devices.where('enrollmentStatus', '==', 'ENROLLED');
    if (d.platform === 'ANDROID' || d.platform === 'WINDOWS') q = q.where('deviceType', '==', d.platform);
    docs = (await q.get()).docs;
  } else if (d.groupId) {
    docs = (await devices.where('groupId', '==', d.groupId).get()).docs;
  } else if (Array.isArray(d.deviceIds) && d.deviceIds.length > 0 && d.deviceIds.length <= 500) {
    docs = (await db.getAll(...d.deviceIds.map((id) => devices.doc(String(id))))).filter((s) => s.exists);
  } else {
    throw new HttpsError('invalid-argument', 'Pilih peranti, kumpulan atau semua.');
  }
  if (docs.length === 0) throw new HttpsError('failed-precondition', 'Tiada peranti sasaran.');

  const created: string[] = [];
  for (let i = 0; i < docs.length; i += 200) {
    const batch = db.batch();
    for (const dev of docs.slice(i, i + 200)) {
      const cref = org(orgId).collection('commands').doc();
      batch.set(cref, {
        commandId: cref.id, deviceId: dev.id, commandType: d.commandType, status: 'PENDING',
        createdBy: who.uid, createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + COMMAND_TTL_MS),
        sentAt: null, executedAt: null, errorMessage: null,
      });
      created.push(cref.id);
    }
    await batch.commit();
  }
  await audit(orgId, {
    type: 'COMMAND_CREATED', actorId: who.uid,
    message: `${d.commandType} → ${docs.length} peranti`,
    meta: { commandType: d.commandType, count: docs.length, target: d.all ? 'ALL' : d.groupId ? 'GROUP' : 'SELECTED' },
  });

  // Tolak FCM sebagai isyarat "ada arahan"; peranti kemudian memanggil fetchPendingCommands.
  // Arahan kekal PENDING sehingga peranti benar-benar mengambilnya (status SENT).
  const tokens = docs.map((s) => s.get('fcmToken') as string | null).filter((t): t is string => !!t);
  if (tokens.length) {
    for (let i = 0; i < tokens.length; i += 500) {
      await getMessaging().sendEachForMulticast({
        tokens: tokens.slice(i, i + 500), data: { type: 'COMMANDS_AVAILABLE' }, android: { priority: 'high' },
      }).catch(() => undefined);
    }
  }
  return { count: created.length, commandIds: created };
});

/** Peranti mengambil arahan menunggu → ditanda SENT. */
export const fetchPendingCommands = onCall(opts, async (req) => {
  const { orgId, deviceId } = requireDevice(req);
  const snap = await org(orgId).collection('commands')
    .where('deviceId', '==', deviceId).where('status', 'in', ['PENDING', 'SENT']).get();
  const now = Date.now();
  const out: Array<{ commandId: string; commandType: string }> = [];
  const batch = db.batch();
  for (const doc of snap.docs) {
    const c = doc.data();
    if (c.expiresAt.toMillis() <= now) { batch.update(doc.ref, { status: 'EXPIRED' }); continue; }
    if (c.status === 'PENDING') batch.update(doc.ref, { status: 'SENT', sentAt: FieldValue.serverTimestamp() });
    out.push({ commandId: doc.id, commandType: c.commandType });
  }
  await batch.commit();
  return { commands: out };
});

/** Peranti melapor keputusan. Hanya sini status EXECUTED boleh ditetapkan. */
export const ackCommand = onCall(opts, async (req) => {
  const { orgId, deviceId } = requireDevice(req);
  const { commandId, status, error } = req.data as { commandId?: string; status?: CommandStatus; error?: string };
  if (!commandId || !['ACKNOWLEDGED', 'EXECUTED', 'FAILED'].includes(String(status))) {
    throw new HttpsError('invalid-argument', 'Ack tidak sah.');
  }
  if (!(await org(orgId).collection('devices').doc(deviceId).get()).exists) {
    throw new HttpsError('permission-denied', 'Peranti telah dinyahdaftar.');
  }
  const cref = org(orgId).collection('commands').doc(commandId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(cref);
    const c = snap.data();
    if (!c || c.deviceId !== deviceId) throw new HttpsError('not-found', 'Arahan tidak dijumpai.');
    if (c.expiresAt.toMillis() <= Date.now()) throw new HttpsError('failed-precondition', 'Arahan telah tamat tempoh.');
    if (!canTransition(c.status, status!)) throw new HttpsError('failed-precondition', `Peralihan ${c.status} → ${status} tidak sah.`);
    const patch: Record<string, unknown> = { status };
    if (status === 'EXECUTED') {
      patch.executedAt = FieldValue.serverTimestamp();
      if (c.commandType === 'LOCK' || c.commandType === 'UNLOCK') {
        tx.update(org(orgId).collection('devices').doc(deviceId), {
          isLocked: c.commandType === 'LOCK', status: c.commandType === 'LOCK' ? 'LOCKED' : 'ONLINE',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    if (status === 'FAILED') patch.errorMessage = String(error ?? 'Gagal').slice(0, 300);
    tx.update(cref, patch);
  });
  await audit(orgId, { type: `COMMAND_${status}`, message: `Arahan ${commandId} → ${status}`, deviceId });
  return { ok: true };
});

// =====================================================================
// 4. HEARTBEAT (RTDB presence → Firestore) & PENYELENGGARAAN
// =====================================================================

export const onPresenceWrite = onValueWritten(
  { ref: '/presence/{orgId}/{deviceId}', region: REGION },
  async (event) => {
    const after = event.data.after.val() as { status?: string; batteryLevel?: number } | null;
    if (!after) return;
    const { orgId, deviceId } = event.params;
    const ref = org(orgId).collection('devices').doc(deviceId);
    const snap = await ref.get();
    if (!snap.exists) return;
    const locked = snap.get('isLocked') === true;
    const reported = after.status === 'ERROR' ? 'ERROR' : locked ? 'LOCKED' : 'ONLINE';
    const prev = snap.get('status');
    await ref.update({
      status: reported, batteryLevel: typeof after.batteryLevel === 'number' ? after.batteryLevel : snap.get('batteryLevel'),
      lastSeen: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    if (prev === 'OFFLINE') await audit(orgId, { type: 'DEVICE_ONLINE', message: 'Peranti kembali online', deviceId });
  },
);

export const markOfflineDevices = onSchedule({ schedule: 'every 5 minutes', region: REGION }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - OFFLINE_AFTER_MS);
  const snap = await db.collectionGroup('devices')
    .where('status', 'in', ['ONLINE', 'LOCKED', 'ERROR']).where('lastSeen', '<', cutoff).limit(400).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { status: 'OFFLINE', updatedAt: FieldValue.serverTimestamp() }));
  await batch.commit();
  await Promise.all(snap.docs.map((d) => audit(d.ref.parent.parent!.id, { type: 'DEVICE_OFFLINE', message: 'Peranti offline (tiada heartbeat)', deviceId: d.id })));
});

export const expireCommands = onSchedule({ schedule: 'every 15 minutes', region: REGION }, async () => {
  const snap = await db.collectionGroup('commands')
    .where('status', 'in', ['PENDING', 'SENT']).where('expiresAt', '<', Timestamp.now()).limit(400).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { status: 'EXPIRED' }));
  await batch.commit();
});
