"use client";
import { Activity, AlertTriangle, Flag, ListMusic, Plus, RefreshCw, Shield, Tags, Trash2, Users } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDocs, limit, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { db, firebaseEnabled } from "@/lib/firebase";
import { testYouTube } from "@/lib/youtube";
import { useAuth } from "@/store/auth";
import { toast } from "@/store/toast";
import { Btn, cx, Empty, inputCls, Spinner } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = { id: string } & Record<string, any>;

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function ApiStatus() {
  const [s, setS] = useState<{ ok: boolean; ms: number; at: string; detail: string } | null>(null);
  const check = useCallback(async () => {
    const t0 = performance.now();
    const r = await testYouTube();
    setS({ ok: r.ok, ms: Math.round(performance.now() - t0), at: new Date().toLocaleTimeString("ms-MY"), detail: r.detail });
  }, []);
  useEffect(() => void check(), [check]);
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted">
          <Activity className="h-4 w-4" /> Status API YouTube
        </p>
        <button onClick={check} aria-label="Semak semula" className="cursor-pointer text-muted hover:text-fg">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {s ? (
        <p className="mt-2 flex items-center gap-2 text-lg font-bold">
          <span className={cx("h-3 w-3 rounded-full", s.ok ? "bg-emerald-500" : "bg-rose-500")} /> {s.ok ? `Beroperasi · ${s.ms} ms` : `Tidak dapat dicapai: ${s.detail}`}
          <span className="text-xs font-normal text-muted">({s.at})</span>
        </p>
      ) : (
        <Spinner />
      )}
    </div>
  );
}

function useCol(name: string, order = "createdAt", n = 50) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db()!, name), orderBy(order, "desc"), limit(n)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setErr((e as Error).message);
      setRows([]);
    }
  }, [name, order, n]);
  useEffect(() => void load(), [load]);
  return { rows, err, load };
}

const when = (v: any) => (v?.toDate ? v.toDate().toLocaleString("ms-MY") : "—");

function Featured() {
  const { rows, load } = useCol("lunara_featured");
  const [f, setF] = useState({ title: "", ytPlaylistId: "" });
  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <ListMusic className="h-5 w-5 text-acc" /> Playlist pilihan (promosi tanpa iklan)
      </h2>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          // accepts a playlist link or a bare ID
          const id = /[?&]list=([A-Za-z0-9_-]+)/.exec(f.ytPlaylistId)?.[1] ?? f.ytPlaylistId.trim();
          if (!/^[A-Za-z0-9_-]{10,64}$/.test(id)) return toast("Tampal pautan atau ID playlist YouTube yang sah");
          await addDoc(collection(db()!, "lunara_featured"), { title: f.title, ytPlaylistId: id, active: true, createdAt: serverTimestamp() });
          setF({ title: "", ytPlaylistId: "" });
          void load();
        }}
      >
        <input className={cx(inputCls, "max-w-xs")} placeholder="Tajuk paparan" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
        <input className={cx(inputCls, "max-w-sm")} placeholder="Pautan atau ID playlist YouTube" value={f.ytPlaylistId} onChange={(e) => setF({ ...f, ytPlaylistId: e.target.value })} required />
        <Btn type="submit">
          <Plus className="h-4 w-4" /> Tambah
        </Btn>
      </form>
      <div className="mt-3 divide-y divide-[color:var(--line)]">
        {rows?.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="flex-1 truncate font-medium">{r.title}</span>
            <span className="text-xs text-muted">{r.ytPlaylistId ?? "(lama)"}</span>
            <button onClick={async () => (await updateDoc(doc(db()!, "lunara_featured", r.id), { active: !r.active }), load())} className={cx("cursor-pointer rounded-full px-2 py-0.5 text-xs font-semibold ring-1", r.active ? "text-emerald-600 ring-emerald-500/40 dark:text-emerald-300" : "text-muted ring-line")}>
              {r.active ? "Aktif" : "Tidak aktif"}
            </button>
            <button aria-label="Padam" onClick={async () => (await deleteDoc(doc(db()!, "lunara_featured", r.id)), load())} className="cursor-pointer text-muted hover:text-rose-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {rows?.length === 0 && <p className="py-2 text-sm text-muted">Tiada lagi.</p>}
      </div>
    </div>
  );
}

function Genres() {
  const { rows, load } = useCol("lunara_genres", "name");
  const [name, setName] = useState("");
  return (
    <div className="panel p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Tags className="h-5 w-5 text-acc" /> Genre
      </h2>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await addDoc(collection(db()!, "lunara_genres"), { name: name.trim(), createdAt: serverTimestamp() });
          setName("");
          void load();
        }}
      >
        <input className={inputCls} placeholder="Nama genre, contoh: Nasyid" value={name} onChange={(e) => setName(e.target.value)} required />
        <Btn type="submit">Tambah</Btn>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows?.map((g) => (
          <span key={g.id} className="flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs ring-1 ring-line">
            {g.name}
            <button aria-label={`Padam ${g.name}`} onClick={async () => (await deleteDoc(doc(db()!, "lunara_genres", g.id)), load())} className="cursor-pointer text-faint hover:text-rose-500">
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function Table({ title, icon, rows, cols, empty }: { title: string; icon: ReactNode; rows: Row[] | null; cols: [string, (r: Row) => ReactNode][]; empty: string }) {
  return (
    <div className="panel overflow-hidden p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        {icon} {title}
      </h2>
      {!rows ? (
        <Spinner className="mt-3 h-5 w-5" />
      ) : rows.length ? (
        <div className="thin-scroll mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                {cols.map(([h]) => (
                  <th key={h} className="py-2 pr-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {rows.map((r) => (
                <tr key={r.id}>
                  {cols.map(([h, f]) => (
                    <td key={h} className="max-w-[260px] truncate py-2 pr-4">
                      {f(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

export default function Admin() {
  const { ready, profile } = useAuth();
  const [counts, setCounts] = useState<{ users?: number; errors?: number; reports?: number }>({});
  const users = useCol("lunara_users");
  const errors = useCol("lunara_error_logs", "at", 30);
  const reports = useCol("lunara_reports");
  useEffect(() => {
    if (!profile?.isAdmin) return;
    const c = (n: string) => getCountFromServer(collection(db()!, n)).then((s) => s.data().count).catch(() => undefined);
    void Promise.all([c("lunara_users"), c("lunara_error_logs"), c("lunara_reports")]).then(([u, e, r]) => setCounts({ users: u, errors: e, reports: r }));
  }, [profile?.isAdmin]);

  if (!firebaseEnabled)
    return (
      <div className="p-8">
        <Empty icon={<Shield className="h-6 w-6" />} title="Admin memerlukan Firebase">
          Sambungkan Firebase dahulu (NEXT_PUBLIC_FIREBASE_* dalam .env.local).
        </Empty>
      </div>
    );
  if (!ready) return <Spinner className="m-8 h-6 w-6" />;
  if (!profile?.isAdmin)
    return (
      <div className="p-8">
        <Empty icon={<Shield className="h-6 w-6" />} title="Akses ditolak">
          Halaman ini hanya untuk pentadbir LUNARA MUSIC. Log masuk dengan akaun pentadbir.
        </Empty>
      </div>
    );

  return (
    <div className="space-y-5 px-4 pt-5 md:px-8 md:pt-7">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Papan Pentadbir</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Pengguna berdaftar" value={counts.users ?? "…"} />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Ralat penstriman (log)" value={counts.errors ?? "…"} />
        <Stat icon={<Flag className="h-4 w-4" />} label="Laporan kandungan" value={counts.reports ?? "…"} />
        <ApiStatus />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Featured />
        <Genres />
      </div>
      <Table
        title="Pengguna terkini"
        icon={<Users className="h-5 w-5 text-acc" />}
        rows={users.rows}
        empty={users.err || "Tiada pengguna."}
        cols={[
          ["Nama", (r) => r.displayName],
          ["E-mel", (r) => r.email],
          ["Peranan", (r) => r.role ?? "user"],
          ["Daftar", (r) => when(r.createdAt)],
          [
            "Status",
            (r) => (
              <button
                onClick={async () => {
                  await updateDoc(doc(db()!, "lunara_users", r.id), { suspended: !r.suspended });
                  void users.load();
                  toast(r.suspended ? "Akaun diaktifkan semula" : "Akaun digantung");
                }}
                className={cx("cursor-pointer rounded-full px-2 py-0.5 text-xs font-semibold ring-1", r.suspended ? "text-rose-500 ring-rose-500/40" : "text-emerald-600 ring-emerald-500/40 dark:text-emerald-300")}
              >
                {r.suspended ? "Digantung" : "Aktif"}
              </button>
            ),
          ],
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Table title="Ralat penstriman terkini" icon={<AlertTriangle className="h-5 w-5 text-acc" />} rows={errors.rows} empty={errors.err || "Tiada ralat dilog."} cols={[["Masa", (r) => when(r.at)], ["Lagu", (r) => r.trackId], ["Mesej", (r) => r.message]]} />
        <Table
          title="Laporan kandungan"
          icon={<Flag className="h-5 w-5 text-acc" />}
          rows={reports.rows}
          empty={reports.err || "Tiada laporan."}
          cols={[
            ["Masa", (r) => when(r.createdAt)],
            ["Jenis", (r) => r.type],
            ["Butiran", (r) => r.detail],
            [
              "",
              (r) => (
                <button onClick={async () => (await updateDoc(doc(db()!, "lunara_reports", r.id), { resolved: true }), reports.load())} className="cursor-pointer text-xs font-semibold text-acc">
                  {r.resolved ? "Selesai" : "Tandakan selesai"}
                </button>
              ),
            ],
          ]}
        />
      </div>
    </div>
  );
}
