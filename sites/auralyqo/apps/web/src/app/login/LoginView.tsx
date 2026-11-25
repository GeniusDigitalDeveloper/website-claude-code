"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authMessage, useAuth } from "@/store/auth";
import { AuthLayout, Divider, ErrorBox, GoogleButton } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Btn, Field, inputCls } from "@/components/ui";

export function LoginView() {
  const router = useRouter();
  const sp = useSearchParams();
  const user = useAuth((s) => s.user);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(authMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout title="Selamat kembali" sub="Log masuk untuk sambung muzik anda di mana-mana peranti.">
      {sp.get("reset") && <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Kata laluan berjaya ditukar. Sila log masuk.</p>}
      {sp.get("verified") && <p className="mb-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">E-mel anda telah disahkan.</p>}
      <GoogleButton busy={busy} onClick={() => run(() => useAuth.getState().google())} />
      <Divider />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => useAuth.getState().login(email, pw, remember));
        }}
      >
        <Field label="E-mel">
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Kata laluan">
          <PasswordInput value={pw} onChange={setPw} autoComplete="current-password" required />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[color:var(--acc-via)]" /> Ingat saya
          </label>
          <Link href="/forgot-password" className="font-semibold text-acc hover:underline">
            Lupa kata laluan?
          </Link>
        </div>
        <ErrorBox msg={err} />
        <Btn type="submit" disabled={busy} className="w-full py-3">
          {busy ? "Sedang log masuk…" : "Log masuk"}
        </Btn>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Belum ada akaun?{" "}
        <Link href="/register" className="font-semibold text-acc hover:underline">
          Daftar percuma
        </Link>
      </p>
      <p className="mt-2 text-center">
        <Link href="/" className="text-xs text-faint hover:text-fg">
          Teruskan tanpa akaun (mod peranti)
        </Link>
      </p>
    </AuthLayout>
  );
}
