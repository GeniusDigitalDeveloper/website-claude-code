"use client";
import { Copy, Eye, EyeOff, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";
import { Btn, cx } from "./ui";

/**
 * The listener's personal LUNARA API key: generate, show/hide, copy, delete, generate a new one.
 * Free. Stored in their own account (lunara_users/{uid}/data/apikey), readable only by them,
 * so it stays the same on every device until they replace or delete it.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function newKey() {
  // 40 random characters from the browser's cryptographic generator (≈ 238 bits)
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  let out = "lnr_";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

const mask = (k: string) => `${k.slice(0, 8)}${"•".repeat(24)}${k.slice(-4)}`;

export function ApiKeyCard() {
  const user = useAuth((s) => s.user);
  const [key, setKey] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "delete" | "regen">(null);

  const ref = () => (user && db() ? doc(db()!, "lunara_users", user.uid, "data", "apikey") : null);

  useEffect(() => {
    const r = ref();
    if (!r) return void setLoading(false);
    setLoading(true);
    getDoc(r)
      .then((s) => {
        const d = s.data() as { key?: string; createdAt?: Timestamp } | undefined;
        setKey(d?.key ?? null);
        setCreatedAt(d?.createdAt?.toDate?.() ?? null);
      })
      .catch(() => toast("API key tidak dapat dimuatkan."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const generate = async () => {
    const r = ref();
    if (!r) return;
    setBusy(true);
    try {
      const k = newKey();
      await setDoc(r, { key: k, createdAt: serverTimestamp() });
      setKey(k);
      setCreatedAt(new Date());
      setShown(true);
      setConfirm(null);
      toast("API key baharu dijana.");
    } catch {
      toast("API key tidak dapat disimpan. Cuba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const r = ref();
    if (!r) return;
    setBusy(true);
    try {
      await deleteDoc(r);
      setKey(null);
      setCreatedAt(null);
      setShown(false);
      setConfirm(null);
      toast("API key dipadam.");
    } catch {
      toast("API key tidak dapat dipadam. Cuba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      toast("API key disalin.");
    } catch {
      toast("Tidak dapat menyalin. Tekan ikon mata dan salin secara manual.");
    }
  };

  if (!user)
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <KeyRound className="h-4 w-4" /> Log masuk untuk jana API key anda.
        <Btn href="/login" variant="soft">
          Log masuk
        </Btn>
      </div>
    );

  if (loading) return <p className="text-sm text-muted">Memuatkan…</p>;

  const iconBtn = "grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full ring-1 ring-line hover:bg-card-hover disabled:opacity-40";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">API key peribadi anda. Percuma. Simpan secara rahsia dan jangan kongsi dengan orang lain.</p>
      {key ? (
        <>
          <div className="flex items-center gap-2">
            <code translate="no" className={cx("min-w-0 flex-1 truncate rounded-xl bg-card px-3 py-2.5 font-mono text-sm ring-1 ring-line", !shown && "tracking-wider")} aria-label="API key">
              {shown ? key : mask(key)}
            </code>
            <button type="button" className={iconBtn} aria-label={shown ? "Sorok API key" : "Tunjuk API key"} title={shown ? "Sorok" : "Tunjuk"} onClick={() => setShown((v) => !v)}>
              {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button type="button" className={iconBtn} aria-label="Salin API key" title="Salin" onClick={copy}>
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {createdAt && <p className="text-xs text-faint">Dijana pada {createdAt.toLocaleString("ms-MY")}</p>}
          {confirm ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-3 text-sm ring-1 ring-line">
              <span className="flex-1">{confirm === "delete" ? "Padam API key ini? Ia tidak boleh dipulihkan." : "Jana API key baharu? Key lama akan diganti dan tidak lagi sah."}</span>
              <Btn variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
                Batal
              </Btn>
              <Btn variant={confirm === "delete" ? "danger" : "primary"} onClick={confirm === "delete" ? remove : generate} disabled={busy}>
                {confirm === "delete" ? "Padam" : "Jana baharu"}
              </Btn>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Btn variant="soft" onClick={() => setConfirm("regen")} disabled={busy}>
                <RefreshCw className="h-4 w-4" /> Jana key baharu
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirm("delete")} disabled={busy}>
                <Trash2 className="h-4 w-4" /> Padam
              </Btn>
            </div>
          )}
        </>
      ) : (
        <Btn onClick={generate} disabled={busy}>
          <KeyRound className="h-4 w-4" /> {busy ? "Menjana…" : "Jana API key"}
        </Btn>
      )}
      <p className="text-xs text-faint">
        Disimpan dalam akaun anda sahaja dan kekal sama di semua peranti sehingga anda padam atau jana yang baharu.
      </p>
    </div>
  );
}
