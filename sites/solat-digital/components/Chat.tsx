"use client";
import { useEffect, useRef, useState } from "react";
import { addDoc, collection, doc, increment, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { Send, Smile } from "lucide-react";
import { db } from "@/lib/firebase";
import { EMOJI } from "@/lib/emoji";
import type { ChatMsg } from "@/lib/types";

const TAGS = ["Cadangan", "Masalah", "Soalan", "Lain-lain"];
const hm = (t: number) => new Date(t).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
const dayLbl = (t: number) => new Date(t).toLocaleDateString("ms-MY", { weekday: "long", day: "numeric", month: "long" });

/** Sembang ringkas gaya WhatsApp: teks dan emoji sahaja. Owner <-> satu masjid. */
export default function Chat({ mid, me, mosqueName }: { mid: string; me: "owner" | "masjid"; mosqueName: string }) {
  const [msgs, setMsgs] = useState<(ChatMsg & { id: string })[]>([]);
  const [txt, setTxt] = useState(""); const [emo, setEmo] = useState(false); const [tag, setTag] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => onSnapshot(query(collection(db, "chats", mid, "msgs"), orderBy("at")), (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMsg) }))), () => {}), [mid]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length]);
  // tandakan telah dibaca
  useEffect(() => { const last = msgs[msgs.length - 1]; if (!last || last.from === me) return; setDoc(doc(db, "chats", mid), me === "owner" ? { unreadOwner: 0 } : { unreadMasjid: 0 }, { merge: true }).catch(() => {}); }, [msgs.length, me, mid]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    const text = txt.trim(); if (!text || busy) return; setBusy(true);
    try {
      const at = Date.now();
      await addDoc(collection(db, "chats", mid, "msgs"), { from: me, text: text.slice(0, 1000), ...(tag && me === "masjid" ? { tag } : {}), at });
      await setDoc(doc(db, "chats", mid), me === "masjid"
        ? { name: mosqueName, lastText: text.slice(0, 120), lastAt: at, lastFrom: "masjid", unreadOwner: increment(1), unreadMasjid: 0 }
        : { name: mosqueName, lastText: text.slice(0, 120), lastAt: at, lastFrom: "owner", unreadMasjid: increment(1), unreadOwner: 0 }, { merge: true });
      setTxt(""); setEmo(false); setTag("");
    } catch {}
    setBusy(false); ta.current?.focus();
  };
  const addEmoji = (e: string) => { const el = ta.current; const s = el?.selectionStart ?? txt.length, en = el?.selectionEnd ?? txt.length; setTxt(txt.slice(0, s) + e + txt.slice(en)); requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + e.length, s + e.length); }); };
  let lastDay = "";
  return (
    <div className="chat">
      <div className="chat-body" role="log" aria-live="polite">
        {!msgs.length && <p className="m-auto text-center text-sm text-sub">{me === "owner" ? "Belum ada mesej dengan masjid ini." : "Belum ada mesej. Hantar cadangan atau masalah anda kepada Owner."}</p>}
        {msgs.map((m) => { const dl = dayLbl(m.at); const show = dl !== lastDay; lastDay = dl; const mine = m.from === me; return (
          <div key={m.id}>
            {show && <div className="chat-day">{dl}</div>}
            <div className={`bubble ${mine ? "mine" : "theirs"}`}>
              {m.tag && <span className="bubble-tag">{m.tag}</span>}
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <span className="bubble-time">{hm(m.at)}</span>
            </div>
          </div>); })}
        <div ref={end} />
      </div>
      {me === "masjid" && <div className="flex flex-wrap gap-2 px-1 pt-2" role="group" aria-label="Jenis mesej">
        {TAGS.map((t) => <label key={t} className={`tag-pill ${tag === t ? "on" : ""}`}><input type="checkbox" className="sr-only" checked={tag === t} onChange={() => setTag(tag === t ? "" : t)} />{t}</label>)}
      </div>}
      {emo && <div className="emoji-pop" role="dialog" aria-label="Pilih emoji">{EMOJI.map((g) => <div key={g.label}><p className="emoji-lbl">{g.label}</p><div className="emoji-grid">{g.list.map((e) => <button key={e} type="button" className="emoji-btn" aria-label={`Emoji ${e}`} onClick={() => addEmoji(e)}>{e}</button>)}</div></div>)}</div>}
      <div className="chat-input">
        <button type="button" className="btn !px-3" aria-label="Emoji" aria-expanded={emo} onClick={() => setEmo((v) => !v)}><Smile size={20} /></button>
        <textarea ref={ta} rows={1} className="inp !min-h-11 resize-none" aria-label="Tulis mesej" placeholder="Tulis mesej…" maxLength={1000} value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="button" className="btn btn-primary !px-3" aria-label="Hantar mesej" disabled={!txt.trim() || busy} onClick={send}><Send size={20} /></button>
      </div>
    </div>
  );
}

/** Siaran: hantar satu mesej kepada banyak masjid sekali gus. */
export function Broadcast({ targets, onDone }: { targets: { id: string; name: string }[]; onDone?: (n: number) => void }) {
  const [txt, setTxt] = useState(""); const [emo, setEmo] = useState(false); const [busy, setBusy] = useState(false); const ta = useRef<HTMLTextAreaElement>(null);
  const send = async () => {
    const text = txt.trim(); if (!text || !targets.length || busy) return; setBusy(true);
    try {
      const { writeBatch } = await import("firebase/firestore"); const at = Date.now();
      for (let i = 0; i < targets.length; i += 100) {
        const b = writeBatch(db);
        targets.slice(i, i + 100).forEach((t) => { b.set(doc(collection(db, "chats", t.id, "msgs")), { from: "owner", text: text.slice(0, 1000), tag: "Siaran", at }); b.set(doc(db, "chats", t.id), { name: t.name, lastText: text.slice(0, 120), lastAt: at, lastFrom: "owner", unreadMasjid: increment(1), unreadOwner: 0 }, { merge: true }); });
        await b.commit();
      }
      setTxt(""); setEmo(false); onDone?.(targets.length);
    } catch {}
    setBusy(false);
  };
  const addEmoji = (e: string) => { const el = ta.current; const s = el?.selectionStart ?? txt.length, en = el?.selectionEnd ?? txt.length; setTxt(txt.slice(0, s) + e + txt.slice(en)); requestAnimationFrame(() => el?.focus()); };
  return (
    <div>
      <textarea ref={ta} rows={3} className="inp" aria-label="Mesej siaran" placeholder="Tulis mesej untuk dihantar kepada masjid terpilih…" maxLength={1000} value={txt} onChange={(e) => setTxt(e.target.value)} />
      {emo && <div className="emoji-pop mt-2 rounded-xl border border-line">{EMOJI.map((g) => <div key={g.label}><p className="emoji-lbl">{g.label}</p><div className="emoji-grid">{g.list.map((e) => <button key={e} type="button" className="emoji-btn" aria-label={`Emoji ${e}`} onClick={() => addEmoji(e)}>{e}</button>)}</div></div>)}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" className="btn" aria-expanded={emo} onClick={() => setEmo((v) => !v)}><Smile size={18} /> Emoji</button>
        <button type="button" className="btn btn-primary" disabled={!txt.trim() || !targets.length || busy} onClick={send}><Send size={18} /> {busy ? "Menghantar…" : `Hantar kepada ${targets.length} masjid`}</button></div>
    </div>
  );
}
