"use client";
import { useEffect, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { Check, CheckSquare, Pencil, Send, Smile, Trash2, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { EMOJI } from "@/lib/emoji";
import { chatSfx } from "@/lib/sfx";
import type { ChatMsg } from "@/lib/types";

type Msg = ChatMsg & { id: string; edited?: boolean };
const TAGS = ["Cadangan", "Masalah", "Soalan", "Lain-lain"];
const hm = (t: number) => new Date(t).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });
const dayLbl = (t: number) => new Date(t).toLocaleDateString("ms-MY", { weekday: "long", day: "numeric", month: "long" });

/** Sembang gaya WhatsApp: teks dan emoji sahaja. Owner <-> satu masjid. Sunting/padam mesej sendiri. */
export default function Chat({ mid, me, mosqueName, title, subtitle }: { mid: string; me: "owner" | "masjid"; mosqueName: string; title: string; subtitle?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [txt, setTxt] = useState(""); const [emo, setEmo] = useState(false); const [tag, setTag] = useState("");
  const [selMode, setSelMode] = useState(false); const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const body = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null); const prev = useRef(-1);

  useEffect(() => { prev.current = -1; return onSnapshot(query(collection(db, "chats", mid, "msgs"), orderBy("at")), (s) => setMsgs(s.docs.map((d) => ({ ...(d.data() as Msg), id: d.id }))), () => {}); }, [mid]);
  // skrol HANYA bila mesej baharu tiba (bukan bila padam/sunting/pilih); bunyi bila mesej orang lain tiba
  useEffect(() => {
    const n = msgs.length, p = prev.current;
    if (n > p && body.current) { const first = p === -1; body.current.scrollTo({ top: body.current.scrollHeight, behavior: first ? "auto" : "smooth" }); if (!first && msgs[n - 1].from !== me) chatSfx("recv"); }
    prev.current = n;
  }, [msgs, me]);
  // tandakan telah dibaca
  useEffect(() => { const last = msgs[msgs.length - 1]; if (!last || last.from === me) return; setDoc(doc(db, "chats", mid), me === "owner" ? { unreadOwner: 0 } : { unreadMasjid: 0 }, { merge: true }).catch(() => {}); }, [msgs.length, me, mid]); // eslint-disable-line react-hooks/exhaustive-deps

  const queue = useRef<Promise<void>>(Promise.resolve());
  // Hantar serta-merta: input dikosongkan terus, penulisan ke pangkalan data berjalan mengikut giliran di belakang.
  const send = () => {
    const text = txt.trim(); if (!text) return; chatSfx("send");
    const t = tag, at = Date.now(); setTxt(""); setEmo(false); setTag(""); ta.current?.focus();
    queue.current = queue.current.then(async () => {
      try {
        await addDoc(collection(db, "chats", mid, "msgs"), { from: me, text: text.slice(0, 1000), ...(t && me === "masjid" ? { tag: t } : {}), at });
        const last = text.slice(0, 120);
        await setDoc(doc(db, "chats", mid), me === "masjid"
          ? { name: mosqueName, lastText: last, lastAt: at, lastFrom: "masjid", unreadOwner: increment(1), unreadMasjid: 0 }
          : { name: mosqueName, lastText: last, lastAt: at, lastFrom: "owner", unreadMasjid: increment(1), unreadOwner: 0 }, { merge: true });
      } catch {}
    });
  };
  const addEmoji = (e: string) => { const el = ta.current; const s = el?.selectionStart ?? txt.length, en = el?.selectionEnd ?? txt.length; setTxt(txt.slice(0, s) + e + txt.slice(en)); requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + e.length, s + e.length); }); };
  const removeMsgs = async (ids: string[]) => {
    if (!ids.length || !confirm(ids.length === 1 ? "Padam mesej ini?" : `Padam ${ids.length} mesej?`)) return;
    chatSfx("delete");
    for (const id of ids) { const m = msgs.find((x) => x.id === id); if (!m) continue; await deleteDoc(doc(db, "chats", mid, "msgs", id)).catch(() => {}); }
    if (ids.includes(msgs[msgs.length - 1]?.id)) setDoc(doc(db, "chats", mid), { lastText: "(mesej dipadam)" }, { merge: true }).catch(() => {});
    setPicked([]); setSelMode(false);
  };
  const saveEdit = async () => { if (!editing) return; const t = editing.text.trim(); if (!t) return; await updateDoc(doc(db, "chats", mid, "msgs", editing.id), { text: t.slice(0, 1000), edited: true }).catch(() => {}); setEditing(null); };
  const mineIds = msgs.filter((m) => m.from === me).map((m) => m.id);
  let lastDay = "";
  return (
    <div className="chat">
      <div className="chat-head">
        <span className="chat-avatar" aria-hidden="true">{title.trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1"><b className="block truncate">{title}</b>{subtitle && <span className="block truncate text-xs text-sub">{subtitle}</span>}</div>
        {selMode ? <>
          <span className="text-sm font-semibold text-sub">{picked.length} dipilih</span>
          <button type="button" className="btn btn-danger !min-h-10 !px-3" disabled={!picked.length} aria-label="Padam mesej terpilih" onClick={() => removeMsgs(picked)}><Trash2 size={18} /></button>
          <button type="button" className="btn !min-h-10 !px-3" aria-label="Batal pilih" onClick={() => { setSelMode(false); setPicked([]); }}><X size={18} /></button></>
          : <button type="button" className="btn !min-h-10 !px-3" aria-label="Pilih mesej untuk dipadam" disabled={!mineIds.length} onClick={() => { setSelMode(true); setPicked([]); }}><CheckSquare size={18} /></button>}
      </div>
      <div className="chat-body" ref={body} role="log" aria-live="polite">
        {!msgs.length && <p className="m-auto text-center text-sm text-sub">{me === "owner" ? "Belum ada mesej dengan masjid ini." : "Belum ada mesej. Hantar cadangan atau masalah anda kepada Owner."}</p>}
        {msgs.map((m) => { const dl = dayLbl(m.at); const show = dl !== lastDay; lastDay = dl; const mine = m.from === me; const isEd = editing?.id === m.id; return (
          <div key={m.id}>
            {show && <div className="chat-day">{dl}</div>}
            <div className={`msg-row ${mine ? "mine" : "theirs"}`}>
              {mine && selMode && <input type="checkbox" className="size-5 accent-green-700" aria-label="Pilih mesej" checked={picked.includes(m.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))} />}
              {mine && !selMode && !isEd && <div className="msg-actions"><button type="button" aria-label="Sunting mesej" onClick={() => setEditing({ id: m.id, text: m.text })}><Pencil size={15} /></button><button type="button" aria-label="Padam mesej" onClick={() => removeMsgs([m.id])}><Trash2 size={15} /></button></div>}
              <div className={`bubble ${mine ? "mine" : "theirs"}`}>
                {m.tag && <span className="bubble-tag">{m.tag}</span>}
                {isEd ? (<div className="grid gap-2"><textarea autoFocus rows={2} className="inp !min-h-0" aria-label="Sunting mesej" value={editing!.text} onChange={(e) => setEditing({ id: m.id, text: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") setEditing(null); }} />
                  <div className="flex gap-2"><button type="button" className="btn btn-primary !min-h-9 !px-3" onClick={saveEdit}><Check size={16} /> Simpan</button><button type="button" className="btn !min-h-9 !px-3" onClick={() => setEditing(null)}>Batal</button></div></div>)
                  : (m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>)}
                <span className="bubble-time">{m.edited ? "disunting · " : ""}{hm(m.at)}</span>
              </div>
            </div>
          </div>); })}
      </div>
      {me === "masjid" && <div className="flex flex-wrap gap-2 px-3 pt-2" role="group" aria-label="Jenis mesej">
        {TAGS.map((t) => <label key={t} className={`tag-pill ${tag === t ? "on" : ""}`}><input type="checkbox" className="sr-only" checked={tag === t} onChange={() => setTag(tag === t ? "" : t)} />{t}</label>)}
      </div>}
      {emo && <div className="emoji-pop" role="dialog" aria-label="Pilih emoji">{EMOJI.map((g) => <div key={g.label}><p className="emoji-lbl">{g.label}</p><div className="emoji-grid">{g.list.map((e) => <button key={e} type="button" className="emoji-btn" aria-label={`Emoji ${e}`} onClick={() => addEmoji(e)}>{e}</button>)}</div></div>)}</div>}
      <div className="chat-input">
        <button type="button" className="btn !px-3" aria-label="Emoji" aria-expanded={emo} onClick={() => setEmo((v) => !v)}><Smile size={20} /></button>
        <textarea ref={ta} rows={1} className="inp !min-h-11 resize-none" aria-label="Tulis mesej" placeholder="Tulis mesej…" maxLength={1000} value={txt} onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="button" className="btn btn-primary !px-3" aria-label="Hantar mesej" disabled={!txt.trim()} onClick={send}><Send size={20} /></button>
      </div>
    </div>
  );
}

/** Siaran: hantar satu mesej kepada banyak masjid sekali gus. */
export function Broadcast({ targets, onDone }: { targets: { id: string; name: string }[]; onDone?: (n: number) => void }) {
  const [txt, setTxt] = useState(""); const [emo, setEmo] = useState(false); const [busy, setBusy] = useState(false); const ta = useRef<HTMLTextAreaElement>(null);
  const send = async () => {
    const text = txt.trim(); if (!text || !targets.length || busy) return; setBusy(true); chatSfx("send");
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
