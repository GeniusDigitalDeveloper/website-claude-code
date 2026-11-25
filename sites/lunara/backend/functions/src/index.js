/**
 * LUNARA MUSIC Cloud Functions (region asia-southeast1).
 *
 * Secrets (set once, never committed):
 *   firebase functions:secrets:set SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS
 * Params (in .env.<project>):
 *   APP_URL=https://lunara.app   MAIL_FROM="LUNARA MUSIC <no-reply@lunara.app>"
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import * as functionsV1 from "firebase-functions/v1";
import { logger } from "firebase-functions";
import nodemailer from "nodemailer";
import { resetEmailHtml, resetEmailText, toAppResetLink } from "./email-reset.js";

initializeApp();

const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const APP_URL = defineString("APP_URL");
const MAIL_FROM = defineString("MAIL_FROM", { default: "LUNARA MUSIC <no-reply@lunara.app>" });

const REGION = "asia-southeast1";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Max 3 reset e-mails per address per hour, 20 per IP per hour. */
async function rateLimit(key, max) {
  const db = getFirestore();
  const ref = db.collection("rate_limits").doc(key);
  const hour = Math.floor(Date.now() / 3_600_000);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    const count = d && d.hour === hour ? d.count : 0;
    if (count >= max) return false;
    tx.set(ref, { hour, count: count + 1, expiresAt: new Date(Date.now() + 2 * 3_600_000) });
    return true;
  });
}

export const sendBrandedPasswordReset = onCall(
  { region: REGION, secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS], enforceAppCheck: false, maxInstances: 10 },
  async (req) => {
    const email = String(req.data?.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpsError("invalid-argument", "E-mel tidak sah.");
    const ip = (req.rawRequest.headers["x-forwarded-for"] ?? req.rawRequest.ip ?? "unknown").toString().split(",")[0].trim();
    const okEmail = await rateLimit(`reset_email_${Buffer.from(email).toString("base64url")}`, 3);
    const okIp = await rateLimit(`reset_ip_${ip.replace(/[^a-zA-Z0-9]/g, "_")}`, 20);
    if (!okEmail || !okIp) throw new HttpsError("resource-exhausted", "Terlalu banyak permintaan. Cuba lagi dalam sejam.");

    let user;
    try {
      user = await getAuth().getUserByEmail(email);
    } catch {
      // Don't reveal whether the address is registered.
      logger.info("reset requested for unknown e-mail");
      return { ok: true };
    }
    const appUrl = APP_URL.value();
    const fbLink = await getAuth().generatePasswordResetLink(email, { url: `${appUrl}/login?reset=1` });
    const link = toAppResetLink(fbLink, appUrl);

    const transport = nodemailer.createTransport({
      host: SMTP_HOST.value(),
      port: Number(SMTP_PORT.value() || 465),
      secure: Number(SMTP_PORT.value() || 465) === 465,
      auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
    });
    await transport.sendMail({
      from: MAIL_FROM.value(),
      to: email,
      subject: "Tetapkan semula kata laluan LUNARA MUSIC anda",
      html: resetEmailHtml({ name: user.displayName, link, appUrl }),
      text: resetEmailText({ name: user.displayName, link }),
    });
    logger.info("branded reset e-mail sent", { uid: user.uid });
    return { ok: true };
  },
);

/** When an account is deleted, remove its cloud data (Firestore + profile images). */
export const cleanupDeletedUser = functionsV1
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    const db = getFirestore();
    await db.recursiveDelete(db.collection("users").doc(user.uid));
    await getStorage().bucket().deleteFiles({ prefix: `users/${user.uid}/` }).catch(() => {});
    logger.info("cleaned up user", { uid: user.uid });
  });

/** Admins can suspend users: disables sign-in and revokes sessions. */
export const setUserSuspended = onCall({ region: REGION }, async (req) => {
  if (req.auth?.token?.admin !== true) throw new HttpsError("permission-denied", "Admin sahaja.");
  const { uid, suspended } = req.data ?? {};
  if (typeof uid !== "string" || typeof suspended !== "boolean") throw new HttpsError("invalid-argument", "uid/suspended diperlukan.");
  await getAuth().updateUser(uid, { disabled: suspended });
  if (suspended) await getAuth().revokeRefreshTokens(uid);
  await getFirestore().collection("users").doc(uid).set({ suspended, suspendedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});
