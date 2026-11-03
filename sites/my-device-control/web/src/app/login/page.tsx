'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { auth, firebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { LOGIN_PROVIDERS } from '@/lib/auth-providers';
import { errMsg } from '@/lib/api';

export default function Login() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (!loading && user) router.replace('/dashboard/'); }, [loading, user, router]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: errMsg(e) }); } finally { setBusy(false); }
  }
  const submit = (e: FormEvent) => { e.preventDefault(); void run(() => signInWithEmailAndPassword(auth, email, password)); };
  const reset = () => email
    ? run(async () => { await sendPasswordResetEmail(auth, email); setMsg({ ok: true, text: 'Pautan tetap semula kata laluan telah dihantar.' }); })
    : setMsg({ ok: false, text: 'Masukkan e-mel dahulu.' });

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="card w-full max-w-sm space-y-5 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-white"><ShieldCheck /></span>
          <div><h1 className="text-lg font-extrabold leading-tight">MY DEVICE CONTROL</h1><p className="text-xs text-mutedfg">Log masuk pentadbir</p></div>
        </div>
        {!firebaseConfigured && (
          <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Firebase belum disambungkan. Isi <code>.env.local</code> (lihat <code>.env.example</code>) kemudian bina semula.
          </p>
        )}
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-semibold">E-mel
            <input type="email" required autoComplete="username" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm font-semibold">Kata laluan
            <input type="password" required autoComplete="current-password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn-primary w-full" disabled={busy || !firebaseConfigured}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Log masuk</button>
          <button type="button" className="w-full text-center text-sm font-semibold text-accent underline" onClick={reset}>Lupa kata laluan?</button>
        </form>
        {LOGIN_PROVIDERS.map((p) => (
          <button key={p.id} className="btn-ghost w-full" disabled={busy || !firebaseConfigured} onClick={() => run(() => signInWithPopup(auth, p.create()))}>{p.label}</button>
        ))}
        {msg && <p role="alert" className={`text-sm ${msg.ok ? 'text-ok' : 'text-danger'}`}>{msg.text}</p>}
      </div>
    </main>
  );
}
