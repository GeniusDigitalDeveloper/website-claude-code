// Semak kelulusan admin untuk pautan berhak cipta TANPA kunci rahsia pelayan.
// Pelayan membaca dokumen requests/{id} melalui REST Firestore menggunakan token ID pengguna sendiri.
// Rules Firestore memastikan hanya pemilik (atau admin) boleh membaca dokumen itu dan hanya admin boleh menukar status,
// jadi keputusan "approved" tidak boleh dipalsukan oleh pengguna.
export const PROJECT = process.env.FIREBASE_PROJECT || 'fetchrbox-app-izzul';

export async function checkApproval({ idToken, approvalId, url, project = PROJECT, fetchImpl = fetch }) {
  if (!idToken || !approvalId || !/^[A-Za-z0-9]{10,40}$/.test(String(approvalId))) return false;
  try {
    const r = await fetchImpl(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/requests/${approvalId}`, { headers: { Authorization: 'Bearer ' + idToken } });
    if (!r.ok) return false;
    const f = (await r.json()).fields || {};
    return f.status?.stringValue === 'approved' && f.url?.stringValue === url;
  } catch { return false; }
}
