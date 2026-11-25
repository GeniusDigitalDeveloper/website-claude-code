// Usage: GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run set-admin -- email@domain.com [--remove]
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run set-admin -- email@domain.com [--remove]");
  process.exit(1);
}
initializeApp({ credential: applicationDefault() });
const user = await getAuth().getUserByEmail(email);
const admin = flag !== "--remove";
await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin });
await getFirestore().collection("users").doc(user.uid).set({ role: admin ? "admin" : "user" }, { merge: true });
console.log(`${email} -> admin=${admin}. User must sign out/in to refresh the token.`);
