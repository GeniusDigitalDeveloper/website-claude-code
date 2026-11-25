"use client";
import { CalendarDays, Camera, Clock3, Crop, Heart, ListMusic, LogOut, Mail, Pencil, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, authMessage } from "@/store/auth";
import { useLibrary } from "@/store/library";
import { useLocalProfile } from "@/store/profile";
import { toast } from "@/store/toast";
import { ImageCropper, normalizeImage } from "@/components/media/ImageCropper";
import { TrackList } from "@/components/music/TrackRow";
import { Btn, Field, inputCls, Modal, SectionHead } from "@/components/ui";

async function shrink(src: string, max: number, q: number) {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const local = useLocalProfile();
  const favs = useLibrary((s) => s.favourites.length);
  const pls = useLibrary((s) => s.playlists.length);
  const localCount = useLibrary((s) => s.localTracks.length);
  const recent = useLibrary((s) => s.recent);
  const artistPlays = useLibrary((s) => s.artistPlays);
  const [editor, setEditor] = useState<string | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const owner = user?.uid ?? "device";

  const photo = profile?.photoURL ?? (owner === "device" ? local.avatar : undefined);
  const displayName = profile?.displayName ?? (local.name || "Pendengar LUNARA MUSIC");
  const topArtist = Object.values(artistPlays).sort((a, b) => b.count - a.count)[0];

  const pick = async (f: File) => {
    const src = await normalizeImage(f);
    setEditor(src);
  };

  /** Re-crop using the original upload: from this device, or from the cloud copy on another device. */
  const recrop = async () => {
    if (local.original && local.originalFor === owner) return setEditor(local.original);
    const d = db();
    if (user && d) {
      try {
        setBusy(true);
        const snap = await getDoc(doc(d, "lunara_users", user.uid, "data", "avatar"));
        const src = snap.data()?.original as string | undefined;
        if (src) {
          local.set({ original: src, originalFor: owner });
          setEditor(src);
          return;
        }
      } catch {
        /* fall through */
      } finally {
        setBusy(false);
      }
    }
    if (photo) setEditor(photo);
    else fileRef.current?.click();
  };

  const save = async (cropped: string) => {
    const original = editor!;
    try {
      const d = db();
      if (user && d) {
        // Firestore docs are limited to 1 MB: keep the cloud copy of the original at ≤ 1024 px
        const cloudOriginal = await shrink(original, 1024, 0.8);
        await setDoc(doc(d, "lunara_users", user.uid, "data", "avatar"), { original: cloudOriginal });
        await useAuth.getState().setPhoto(await shrink(cropped, 384, 0.85));
      }
      local.set({ avatar: owner === "device" ? cropped : local.avatar, original, originalFor: owner });
      setEditor(null);
      toast("Gambar profil disimpan");
    } catch (e) {
      toast(`Gagal simpan: ${authMessage(e)}`);
    }
  };

  const remove = async () => {
    if (!confirm("Buang gambar profil?")) return;
    const d = db();
    if (user && d) {
      await deleteDoc(doc(d, "lunara_users", user.uid, "data", "avatar")).catch(() => {});
      await useAuth.getState().setPhoto(null);
    }
    local.set({ avatar: undefined, original: undefined, originalFor: undefined });
    toast("Gambar profil dibuang");
  };

  const stats = [
    { icon: Heart, label: "Lagu kegemaran", v: favs, href: "/favourites" },
    { icon: ListMusic, label: "Playlist", v: pls, href: "/library" },
    { icon: Clock3, label: "Baru dimainkan", v: recent.length, href: "/library?tab=recent" },
    { icon: Upload, label: "Muzik peranti", v: localCount, href: "/local" },
  ];

  return (
    <div className="px-4 pt-6 md:px-8 md:pt-10">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
        <div className="group relative">
          <div className="grad-bg h-36 w-36 overflow-hidden rounded-full p-1 shadow-2xl md:h-44 md:w-44">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Gambar profil" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center rounded-full bg-panel font-display text-5xl font-extrabold">{displayName[0]?.toUpperCase()}</span>
            )}
          </div>
          <button aria-label="Tukar gambar profil" onClick={() => fileRef.current?.click()} className="grad-bg absolute right-1 bottom-1 grid h-11 w-11 cursor-pointer place-items-center rounded-full text-white shadow-lg ring-4 ring-[color:var(--bg)]">
            <Camera className="h-5 w-5" />
          </button>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Profil</p>
          <h1 className="font-display text-3xl font-extrabold md:text-5xl">{displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted md:justify-start">
            {profile ? (
              <>
                <span>@{profile.username}</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {profile.email} {!profile.emailVerified && profile.providers.includes("password") && <span className="rounded bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">Belum disahkan</span>}
                </span>
                {profile.createdAt && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> Ahli sejak {new Date(profile.createdAt).toLocaleDateString("ms-MY", { month: "long", year: "numeric" })}
                  </span>
                )}
              </>
            ) : (
              <span>Mod peranti · data disimpan pada peranti ini</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <Btn variant="soft" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> {photo ? "Ganti gambar" : "Muat naik gambar"}
            </Btn>
            {(photo || local.original) && (
              <Btn variant="soft" onClick={recrop} disabled={busy}>
                <Crop className="h-4 w-4" /> Potong semula
              </Btn>
            )}
            {photo && (
              <Btn variant="ghost" onClick={remove}>
                <Trash2 className="h-4 w-4" /> Buang
              </Btn>
            )}
            <Btn
              variant="ghost"
              onClick={() => {
                setName(displayName);
                setUsername(profile?.username ?? "");
                setEditName(true);
              }}
            >
              <Pencil className="h-4 w-4" /> Edit nama
            </Btn>
            {user ? (
              <Btn variant="ghost" onClick={() => useAuth.getState().logout()}>
                <LogOut className="h-4 w-4" /> Log keluar
              </Btn>
            ) : (
              <Btn href="/login">Log masuk untuk sync</Btn>
            )}
          </div>
          {profile && !profile.emailVerified && profile.providers.includes("password") && (
            <button onClick={() => useAuth.getState().resendVerification().then(() => toast("E-mel pengesahan dihantar"))} className="mt-3 cursor-pointer text-xs font-semibold text-acc underline">
              Hantar semula e-mel pengesahan
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-[var(--radius)] bg-card p-4 ring-1 ring-line transition hover:bg-card-hover">
            <s.icon className="h-5 w-5 text-acc" />
            <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{s.v}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Link>
        ))}
      </div>
      {topArtist && (
        <p className="mt-4 text-sm text-muted">
          Artis paling kerap didengar: <b className="text-fg">{topArtist.name}</b> ({topArtist.count} kali)
        </p>
      )}

      <section className="mt-10">
        <SectionHead title="Baru dimainkan" href="/library?tab=recent" />
        {recent.length ? <TrackList tracks={recent} limit={8} /> : <p className="text-sm text-muted">Belum ada.</p>}
      </section>

      <Modal open={!!editor} onClose={() => setEditor(null)} title="Edit gambar profil">
        {editor && <ImageCropper src={editor} round outputSize={512} onCancel={() => setEditor(null)} onPickNew={() => fileRef.current?.click()} onSave={save} />}
      </Modal>
      <Modal open={editName} onClose={() => setEditName(false)} title="Edit profil">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (user) await useAuth.getState().updateName(name.trim(), username.trim().replace(/[^a-z0-9._]/gi, ""));
              else local.set({ name: name.trim() });
              setEditName(false);
              toast("Profil dikemas kini");
            } catch (err) {
              toast(authMessage(err));
            }
          }}
        >
          <Field label="Nama penuh">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </Field>
          {user && (
            <Field label="Nama pengguna" hint="Huruf, nombor, titik dan garis bawah sahaja.">
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
            </Field>
          )}
          <Btn type="submit" className="w-full">
            Simpan
          </Btn>
        </form>
      </Modal>
    </div>
  );
}
