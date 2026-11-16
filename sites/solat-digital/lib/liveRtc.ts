import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { uid } from "./types";
/** Siaran kamera ke skrin TV (WebRTC antara rakan sebaya). Isyarat (offer/answer/ICE) melalui Firestore: tv/{mid}/livesig/s dan sub-koleksi c.
 *  Hanya pelayan STUN awam digunakan; pada rangkaian yang menyekat sambungan terus, siaran mungkin tidak bersambung (tiada pelayan TURN). */
const CFG: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
const sRef = (mid: string) => doc(db, "tv", mid, "livesig", "s");
const cCol = (mid: string) => collection(db, "tv", mid, "livesig", "s", "c");
export type RtcState = "idle" | "connecting" | "live" | "failed";

/** Penyiar (panel pengurus): hantar aliran kamera. Pulangkan fungsi berhenti. */
export function startBroadcast(mid: string, stream: MediaStream, onState: (s: RtcState) => void): () => void {
  let pc: RTCPeerConnection | null = null, sid = "", lastWant = 0, stopped = false, born = 0, pend: RTCIceCandidateInit[] = []; const unsub: (() => void)[] = [];
  const close = () => { pc?.close(); pc = null; };
  const begin = async () => {
    close(); sid = uid() + uid(); born = Date.now(); pend = []; onState("connecting"); const my = sid; const p = (pc = new RTCPeerConnection(CFG)); ((globalThis as unknown as { __pcs?: RTCPeerConnection[] }).__pcs ??= []).push(p);
    stream.getTracks().forEach((t) => p.addTrack(t, stream));
    p.onicecandidate = (e) => { if (e.candidate && my === sid) addDoc(cCol(mid), { sid: my, from: "b", c: JSON.stringify(e.candidate.toJSON()) }).catch(() => {}); };
    p.onconnectionstatechange = () => { if (my !== sid) return; onState(p.connectionState === "connected" ? "live" : p.connectionState === "failed" ? "failed" : "connecting"); };
    const offer = await p.createOffer(); await p.setLocalDescription(offer);
    await setDoc(sRef(mid), { sid: my, offer: { type: offer.type, sdp: offer.sdp }, answer: null, asid: "", t: Date.now() }, { merge: true });
  };
  unsub.push(onSnapshot(sRef(mid), (s) => {
    const d = s.data(); if (!d || stopped) return;
    if (d.answer && d.asid === sid && pc && !pc.remoteDescription) { const p = pc; p.setRemoteDescription(d.answer).then(() => { pend.forEach((c) => p.addIceCandidate(c).catch(() => {})); pend = []; }).catch(() => {}); }
    if (typeof d.want === "number" && d.want > lastWant) { lastWant = d.want; const st = pc?.connectionState; if (!pc || st === "failed" || st === "closed" || st === "disconnected" || (st !== "connected" && Date.now() - born > 20000)) begin().catch(() => onState("failed")); }
  }));
  unsub.push(onSnapshot(cCol(mid), (s) => s.docChanges().forEach((ch) => { if (ch.type !== "added") return; const d = ch.doc.data(); if (d.from !== "v" || d.sid !== sid || !pc) return; const c = JSON.parse(d.c); if (pc.remoteDescription) pc.addIceCandidate(c).catch(() => {}); else pend.push(c); })));
  begin().catch(() => onState("failed"));
  return () => { stopped = true; unsub.forEach((u) => u()); close(); onState("idle"); setDoc(sRef(mid), { offer: null, answer: null, sid: "", t: Date.now() }, { merge: true }).catch(() => {}); getDocs(cCol(mid)).then((q) => q.docs.forEach((x) => deleteDoc(x.ref))).catch(() => {}); };
}

/** Penonton (TV): terima aliran dan panggil onStream. */
export function watchLive(mid: string, onStream: (s: MediaStream | null) => void): () => void {
  let pc: RTCPeerConnection | null = null, cur = "", pend: RTCIceCandidateInit[] = [], stopped = false, got = false;
  const unsub: (() => void)[] = []; const want = () => updateDoc(sRef(mid), { want: Date.now() }).catch(() => setDoc(sRef(mid), { want: Date.now() }, { merge: true }).catch(() => {}));
  unsub.push(onSnapshot(sRef(mid), async (s) => {
    const d = s.data(); if (!d || stopped || !d.offer || !d.sid || d.sid === cur) return;
    cur = d.sid; pend = []; got = false; pc?.close(); const p = (pc = new RTCPeerConnection(CFG)); ((globalThis as unknown as { __pcs?: RTCPeerConnection[] }).__pcs ??= []).push(p); const my = cur;
    p.ontrack = (e) => { got = true; onStream(e.streams[0] ?? null); };
    p.onicecandidate = (e) => { if (e.candidate && my === cur) addDoc(cCol(mid), { sid: my, from: "v", c: JSON.stringify(e.candidate.toJSON()) }).catch(() => {}); };
    try { await p.setRemoteDescription(d.offer); for (const c of pend) await p.addIceCandidate(c).catch(() => {}); pend = []; const a = await p.createAnswer(); await p.setLocalDescription(a); await updateDoc(sRef(mid), { answer: { type: a.type, sdp: a.sdp }, asid: my }); } catch {}
  }));
  unsub.push(onSnapshot(cCol(mid), (s) => s.docChanges().forEach((ch) => { if (ch.type !== "added") return; const d = ch.doc.data(); if (d.from !== "b" || d.sid !== cur) return; const c = JSON.parse(d.c); if (pc && pc.remoteDescription) pc.addIceCandidate(c).catch(() => {}); else pend.push(c); })));
  want(); const t = setInterval(() => { if (!got) want(); }, 12000);
  return () => { stopped = true; clearInterval(t); unsub.forEach((u) => u()); pc?.close(); onStream(null); };
}
