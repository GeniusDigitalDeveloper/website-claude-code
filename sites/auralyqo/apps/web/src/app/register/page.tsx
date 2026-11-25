"use client";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { authMessage, useAuth } from "@/store/auth";
import { AuthLayout, Divider, ErrorBox, GoogleButton } from "@/components/auth/AuthLayout";
import { PasswordInput, StrengthMeter } from "@/components/auth/PasswordInput";
import { Btn, Field, inputCls } from "@/components/ui";

export default function Register() {
  const [f, setF] = useState({ name: "", email: "", pw: "", pw2: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const submit = async () => {
    setErr("");
    if (f.name.trim().length < 2) return setErr("Sila masukkan nama penuh.");
    if (f.pw.length < 8) return setErr("Kata laluan mesti sekurang-kurangnya 8 aksara.");
    if (f.pw !== f.pw2) return setErr("Pengesahan kata laluan tidak sepadan.");
    setBusy(true);
    try {
      await useAuth.getState().register(f.name.trim(), f.email.trim(), f.pw);
      setDone(true);
    } catch (e) {
      setErr(authMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (done)
    return (
      <AuthLayout title="Semak e-mel anda" sub={`Kami telah hantar pautan pengesahan ke ${f.email}.`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grad-bg grid h-14 w-14 place-items-center rounded-2xl text-white">
            <MailCheck className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted">Klik pautan dalam e-mel untuk sahkan akaun. Anda sudah boleh mula mendengar sekarang.</p>
          <Btn href="/" className="w-full">
            Mula mendengar
          </Btn>
          <button onClick={() => useAuth.getState().resendVerification()} className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">
            Hantar semula e-mel pengesahan
          </button>
        </div>
      </AuthLayout>
    );
  return (
    <AuthLayout title="Cipta akaun AURALYQO" sub="Percuma, tanpa iklan. Playlist anda ikut ke semua peranti.">
      <GoogleButton
        busy={busy}
        label="Daftar dengan Google"
        onClick={async () => {
          setBusy(true);
          setErr("");
          try {
            await useAuth.getState().google();
            location.href = "/";
          } catch (e) {
            setErr(authMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      <Divider />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Nama penuh">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" required />
        </Field>
        <Field label="E-mel">
          <input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" required />
        </Field>
        <Field label="Kata laluan">
          <PasswordInput value={f.pw} onChange={(v) => setF({ ...f, pw: v })} autoComplete="new-password" required />
        </Field>
        <StrengthMeter value={f.pw} />
        <Field label="Sahkan kata laluan">
          <PasswordInput value={f.pw2} onChange={(v) => setF({ ...f, pw2: v })} autoComplete="new-password" required />
        </Field>
        {f.pw2 && f.pw !== f.pw2 && <p className="text-xs text-rose-500">Kata laluan tidak sepadan.</p>}
        <ErrorBox msg={err} />
        <Btn type="submit" disabled={busy} className="w-full py-3">
          {busy ? "Mencipta akaun…" : "Daftar"}
        </Btn>
        <p className="text-center text-[11px] text-faint">
          Dengan mendaftar, anda bersetuju dengan{" "}
          <Link href="/legal/terms" className="underline">
            Terma
          </Link>{" "}
          dan{" "}
          <Link href="/legal/privacy" className="underline">
            Dasar Privasi
          </Link>
          .
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Sudah ada akaun?{" "}
        <Link href="/login" className="font-semibold text-acc hover:underline">
          Log masuk
        </Link>
      </p>
    </AuthLayout>
  );
}
