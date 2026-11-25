"use client";
import { Download, Info, KeyRound, LogOut, Mail, Monitor, Moon, ShieldCheck, Sun, Trash2, UserRound, Waves } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { firebaseEnabled } from "@/lib/firebase";
import { getEngine } from "@/lib/audio-engine";
import { authMessage, useAuth } from "@/store/auth";
import { useLibrary } from "@/store/library";
import { usePlayer } from "@/store/player";
import { FADE_OPTIONS, useSettings } from "@/store/settings";
import { toast } from "@/store/toast";
import { Btn, cx, Field, inputCls, Modal, Segmented, Switch } from "@/components/ui";
import { PasswordInput, StrengthMeter } from "@/components/auth/PasswordInput";

function Card({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="panel scroll-mt-24 p-5">
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
        <span className="grad-bg grid h-8 w-8 place-items-center rounded-lg text-white">{icon}</span>
        {title}
      </h2>
      <div className="divide-y divide-[color:var(--line)]">{children}</div>
    </section>
  );
}
function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Live readout of the real Web Audio gain value: proof that fades ramp the audio, not just the UI. */
function GainMeter() {
  const [g, setG] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      try {
        setG(getEngine().debugGain());
      } catch {
        /* ssr */
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const has = usePlayer((s) => s.queue.length > 0);
  const playing = usePlayer((s) => s.playing);
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-line">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">Meter gain fade (langsung dari enjin audio)</span>
        <span className="tabular-nums text-muted">{(g * 100).toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="grad-bg h-full" style={{ width: `${g * 100}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Btn variant="soft" className="px-4 py-1.5 text-xs" disabled={!has} onClick={() => usePlayer.getState().toggle()}>
          {playing ? "Uji fade out (jeda)" : "Uji fade in (main)"}
        </Btn>
        {!has && <span className="text-xs text-muted">Main sebarang lagu untuk menguji.</span>}
      </div>
    </div>
  );
}

function AccountSection() {
  const { user, profile } = useAuth();
  const [modal, setModal] = useState<null | "password" | "email" | "delete" | "link">(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const hasPassword = profile?.providers.includes("password");
  const close = () => {
    setModal(null);
    setCur("");
    setNext("");
    setConf("");
    setEmail("");
    setErr("");
  };
  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      toast(ok);
      close();
    } catch (e) {
      setErr(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!firebaseEnabled)
    return (
      <div className="py-3 text-sm text-muted">
        <p>
          <b className="text-fg">Mod peranti:</b> Firebase belum disambungkan, jadi log masuk, sync dan e-mel reset belum aktif. Semua data disimpan pada peranti ini.
        </p>
        <p className="mt-2 text-xs">Pentadbir: isi pemboleh ubah NEXT_PUBLIC_FIREBASE_* dalam .env.local (lihat docs/SETUP-FIREBASE.md).</p>
      </div>
    );
  if (!user)
    return (
      <Row label="Belum log masuk" desc="Log masuk untuk sync playlist, kegemaran dan tetapan antara peranti.">
        <Btn href="/login">Log masuk</Btn>
      </Row>
    );
  return (
    <>
      <Row label={profile?.displayName ?? ""} desc={`${profile?.email} · ${profile?.providers.map((p) => (p === "google.com" ? "Google" : "E-mel")).join(" + ")}`}>
        <Btn variant="ghost" href="/profile">
          <UserRound className="h-4 w-4" /> Edit profil
        </Btn>
      </Row>
      <Row label="Tukar e-mel" desc="Pautan pengesahan dihantar ke e-mel baharu.">
        <Btn variant="ghost" onClick={() => setModal("email")}>
          <Mail className="h-4 w-4" /> Tukar
        </Btn>
      </Row>
      {hasPassword ? (
        <Row label="Tukar kata laluan" desc="Kata laluan tidak pernah disimpan atau dipaparkan. Anda hanya boleh menggantinya.">
          <Btn variant="ghost" onClick={() => setModal("password")}>
            <KeyRound className="h-4 w-4" /> Tukar
          </Btn>
        </Row>
      ) : (
        <Row label="Tambah kata laluan (pilihan)" desc="Akaun Google tidak perlukan kata laluan. Tambah jika mahu log masuk dengan e-mel juga.">
          <Btn variant="ghost" onClick={() => setModal("link")}>
            <KeyRound className="h-4 w-4" /> Tambah
          </Btn>
        </Row>
      )}
      <Row label="Sesi" desc="Log keluar dari peranti ini. Untuk log keluar semua peranti, tukar kata laluan.">
        <Btn variant="ghost" onClick={() => useAuth.getState().logout().then(() => toast("Anda telah log keluar"))}>
          <LogOut className="h-4 w-4" /> Log keluar
        </Btn>
      </Row>
      <Row label="Padam akaun" desc="Memadam akaun, playlist dan data awan secara kekal. Fail muzik pada peranti tidak terjejas.">
        <Btn variant="danger" onClick={() => setModal("delete")}>
          <Trash2 className="h-4 w-4" /> Padam
        </Btn>
      </Row>

      <Modal open={modal === "password" || modal === "link"} onClose={close} title={modal === "link" ? "Tambah kata laluan" : "Tukar kata laluan"}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (next.length < 8) return setErr("Kata laluan baharu mesti sekurang-kurangnya 8 aksara.");
            if (next !== conf) return setErr("Pengesahan kata laluan tidak sepadan.");
            if (modal === "link") return run(() => useAuth.getState().linkPassword(next), "Kata laluan ditambah");
            void run(() => useAuth.getState().changePassword(cur, next), "Kata laluan ditukar");
          }}
        >
          {modal === "password" && (
            <Field label="Kata laluan semasa">
              <PasswordInput value={cur} onChange={setCur} autoComplete="current-password" required />
            </Field>
          )}
          <Field label="Kata laluan baharu">
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" required />
          </Field>
          <StrengthMeter value={next} />
          <Field label="Sahkan kata laluan baharu">
            <PasswordInput value={conf} onChange={setConf} autoComplete="new-password" required />
          </Field>
          {conf && next !== conf && <p className="text-xs text-rose-500">Tidak sepadan.</p>}
          {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{err}</p>}
          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? "Memproses…" : "Simpan kata laluan"}
          </Btn>
        </form>
      </Modal>

      <Modal open={modal === "email"} onClose={close} title="Tukar e-mel">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => useAuth.getState().changeEmail(hasPassword ? cur : null, email), "Pautan pengesahan dihantar ke e-mel baharu");
          }}
        >
          <Field label="E-mel baharu">
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {hasPassword && (
            <Field label="Kata laluan semasa (untuk sahkan identiti)">
              <PasswordInput value={cur} onChange={setCur} autoComplete="current-password" required />
            </Field>
          )}
          {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{err}</p>}
          <Btn type="submit" disabled={busy} className="w-full">
            Hantar pautan pengesahan
          </Btn>
        </form>
      </Modal>

      <Modal open={modal === "delete"} onClose={close} title="Padam akaun secara kekal">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => useAuth.getState().deleteAccount(hasPassword ? cur : null), "Akaun dipadam");
          }}
        >
          <p className="text-sm text-muted">Semua playlist, kegemaran, sejarah dan gambar profil di awan akan dipadam. Tindakan ini tidak boleh dibatalkan.</p>
          {hasPassword && (
            <Field label="Kata laluan semasa">
              <PasswordInput value={cur} onChange={setCur} autoComplete="current-password" required />
            </Field>
          )}
          {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{err}</p>}
          <Btn type="submit" variant="danger" disabled={busy} className="w-full">
            Ya, padam akaun saya
          </Btn>
        </form>
      </Modal>
    </>
  );
}

export default function SettingsPage() {
  const s = useSettings();
  const f = s.fade;
  const opt = FADE_OPTIONS.map((v) => ({ value: v, label: `${v}s` }));

  const exportData = () => {
    const { favourites, playlists, recent, savedAlbums, searchHistory } = useLibrary.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), favourites, playlists, recent, savedAlbums, searchHistory, settings: { ...s, set: undefined, setFade: undefined, replace: undefined } }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "auralyqo-data.json";
    a.click();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pt-5 md:px-8 md:pt-7">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Tetapan</h1>
      <nav aria-label="Bahagian tetapan" className="no-scrollbar flex gap-2 overflow-x-auto">
        {[
          ["account", "Akaun"],
          ["appearance", "Paparan"],
          ["playback", "Main balik"],
          ["privacy", "Privasi"],
          ["app", "Aplikasi"],
          ["about", "Perihal"],
        ].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ring-line hover:bg-card">
            {l}
          </a>
        ))}
      </nav>

      <Card id="account" title="Akaun" icon={<UserRound className="h-4 w-4" />}>
        <AccountSection />
      </Card>

      <Card id="appearance" title="Paparan" icon={<Sun className="h-4 w-4" />}>
        <Row label="Tema" desc="Disimpan dan disegerak ke peranti lain bila log masuk.">
          <div role="radiogroup" aria-label="Tema" className="flex gap-2">
            {(
              [
                ["light", "Cerah", Sun],
                ["dark", "Gelap", Moon],
                ["system", "Sistem", Monitor],
              ] as const
            ).map(([v, l, I]) => (
              <button key={v} role="radio" aria-checked={s.theme === v} onClick={() => s.set({ theme: v })} className={cx("flex cursor-pointer flex-col items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-semibold ring-1 transition", s.theme === v ? "grad-bg text-white ring-transparent" : "ring-line hover:bg-card")}>
                <I className="h-4 w-4" /> {l}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Layout & warna" desc="Susun seksyen, pilih preset, warna aksen, saiz kad dan banyak lagi.">
          <Btn variant="ghost" href="/studio">
            Buka Layout Studio
          </Btn>
        </Row>
      </Card>

      <Card id="playback" title="Main balik & Fade" icon={<Waves className="h-4 w-4" />}>
        <Switch checked={f.enabled} onChange={(v) => s.setFade({ enabled: v })} label="Aktifkan peralihan fade" desc="Suis utama untuk fade in/out automatik semasa main, jeda dan tukar lagu." />
        <div className={cx(!f.enabled && "pointer-events-none opacity-50")}>
          <Switch checked={f.fadeIn} onChange={(v) => s.setFade({ fadeIn: v })} label="Fade in automatik" desc="Main/sambung bermula senyap dan naik perlahan ke kelantangan anda." disabled={!f.enabled} />
          <Row label="Tempoh fade in">
            <Segmented label="Tempoh fade in" value={f.fadeInSec} onChange={(v) => s.setFade({ fadeInSec: v })} options={opt} />
          </Row>
          <Switch checked={f.fadeOut} onChange={(v) => s.setFade({ fadeOut: v })} label="Fade out automatik" desc="Jeda dan tukar lagu turun perlahan ke senyap dahulu." disabled={!f.enabled} />
          <Row label="Tempoh fade out">
            <Segmented label="Tempoh fade out" value={f.fadeOutSec} onChange={(v) => s.setFade({ fadeOutSec: v })} options={opt} />
          </Row>
        </div>
        <Switch checked={f.crossfade} onChange={(v) => s.setFade({ crossfade: v })} label="Crossfade antara lagu" desc="Tetapan berasingan: lagu seterusnya mula sambil lagu semasa menurun." />
        <Row label={`Tempoh crossfade: ${f.crossfadeSec}s`}>
          <input type="range" className="range w-48" min={1} max={12} step={1} value={f.crossfadeSec} disabled={!f.crossfade} onChange={(e) => s.setFade({ crossfadeSec: Number(e.target.value) })} aria-label="Tempoh crossfade" style={{ ["--pct" as string]: `${((f.crossfadeSec - 1) / 11) * 100}%` }} />
        </Row>
        <div className="py-3">
          <GainMeter />
        </div>
        <Row label="Kualiti audio" desc="Pratonton Deezer = MP3 128 kbps (had pembekal). Fail peranti dimainkan pada kualiti asal (termasuk FLAC lossless).">
          <Segmented
            label="Kualiti audio"
            value={s.quality}
            onChange={(v) => s.set({ quality: v })}
            options={[
              { value: "standard", label: "Standard" },
              { value: "high", label: "Tinggi" },
              { value: "lossless", label: "Lossless*" },
            ]}
          />
        </Row>
        <Switch checked={s.autoplay} onChange={(v) => s.set({ autoplay: v })} label="Autoplay" desc="Bila giliran tamat, sambung dengan lagu serupa (radio artis)." />
        <Switch checked={s.normalize} onChange={(v) => s.set({ normalize: v })} label="Normalisasi kelantangan" desc="Belum disokong: pembekal semasa tidak menghantar data loudness (ReplayGain)." disabled />
        <Row label="Kelajuan main balik">
          <Segmented label="Kelajuan" value={s.playbackRate} onChange={(v) => usePlayer.getState().setRate(v)} options={[0.75, 1, 1.25, 1.5].map((v) => ({ value: v, label: `${v}x` }))} />
        </Row>
      </Card>

      <Card id="privacy" title="Privasi" icon={<ShieldCheck className="h-4 w-4" />}>
        <Switch checked={s.privatePlaylistsByDefault} onChange={(v) => s.set({ privatePlaylistsByDefault: v })} label="Playlist baharu peribadi secara lalai" />
        <Switch checked={s.keepHistory} onChange={(v) => s.set({ keepHistory: v })} label="Simpan sejarah pendengaran" desc="Digunakan untuk Baru Dimainkan, Daily Mix dan Dibuat Untuk Anda." />
        <Row label="Padam sejarah pendengaran">
          <Btn variant="ghost" onClick={() => (useLibrary.getState().clearRecent(), useLibrary.setState({ artistPlays: {} }), toast("Sejarah dipadam"))}>
            Padam
          </Btn>
        </Row>
        <Row label="Muat turun data saya" desc="Eksport playlist, kegemaran dan tetapan dalam format JSON.">
          <Btn variant="ghost" onClick={exportData}>
            <Download className="h-4 w-4" /> Eksport
          </Btn>
        </Row>
      </Card>

      <Card id="app" title="Aplikasi" icon={<Monitor className="h-4 w-4" />}>
        <Row label="Bahasa" desc="Antara muka kini dalam Bahasa Melayu. English sedang diterjemah.">
          <Segmented
            label="Bahasa"
            value={s.language}
            onChange={(v) => {
              s.set({ language: v });
              if (v === "en") toast("Terjemahan English akan datang. Antara muka kekal BM buat masa ini.");
            }}
            options={[
              { value: "ms", label: "Bahasa Melayu" },
              { value: "en", label: "English" },
            ]}
          />
        </Row>
        <Switch
          checked={s.notifications}
          onChange={async (v) => {
            if (v && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
            s.set({ notifications: v });
          }}
          label="Pemberitahuan"
          desc="Keluaran baharu daripada artis kegemaran (memerlukan Firebase Cloud Messaging)."
        />
        <Row label="Kosongkan cache" desc="Buang cache katalog dan imej. Muzik peranti dan playlist tidak terjejas.">
          <Btn
            variant="ghost"
            onClick={async () => {
              if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
              toast("Cache dikosongkan");
              setTimeout(() => location.reload(), 600);
            }}
          >
            Kosongkan
          </Btn>
        </Row>
      </Card>

      <Card id="about" title="Perihal AURALYQO" icon={<Info className="h-4 w-4" />}>
        <div className="space-y-2 py-3 text-sm text-muted">
          <p>
            <b className="text-fg">AURALYQO</b>: Your Music. Your Universe. Versi web 1.0. Tanpa iklan, tiada SDK pengiklanan, tiada penjejakan iklan.
          </p>
          <p>Katalog, carta, metadata dan pratonton 30 saat disediakan oleh Deezer API. Main balik lagu penuh memerlukan perjanjian lesen dengan pembekal berlesen; AURALYQO tidak menggunakan sumber tanpa izin.</p>
          <div className="flex gap-4 pt-1">
            <Link href="/legal/terms" className="font-semibold text-acc underline">
              Terma & Syarat
            </Link>
            <Link href="/legal/privacy" className="font-semibold text-acc underline">
              Dasar Privasi
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
