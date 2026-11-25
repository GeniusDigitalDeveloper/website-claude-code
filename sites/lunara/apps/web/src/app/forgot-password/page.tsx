"use client";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { authMessage, useAuth } from "@/store/auth";
import { AuthLayout, ErrorBox } from "@/components/auth/AuthLayout";
import { Btn, Field, inputCls } from "@/components/ui";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <AuthLayout title={sent ? "Semak peti masuk anda" : "Lupa kata laluan?"} sub={sent ? "Jika e-mel itu berdaftar, pautan reset telah dihantar." : "Masukkan e-mel berdaftar. Kami akan hantar pautan untuk tetapkan kata laluan baharu."}>
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grad-bg grid h-14 w-14 place-items-center rounded-2xl text-white">
            <MailCheck className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted">
            Pautan sah selama <b className="text-fg">1 jam</b> dan hanya boleh digunakan sekali. Semak juga folder Spam.
          </p>
          <Btn href="/login" className="w-full">
            Kembali ke log masuk
          </Btn>
          <button onClick={() => setSent(false)} className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">
            Guna e-mel lain
          </button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr("");
            try {
              await useAuth.getState().forgot(email.trim());
              setSent(true);
            } catch (e) {
              // Do not reveal whether an e-mail is registered
              if ((e as { code?: string }).code === "auth/user-not-found") setSent(true);
              else setErr(authMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="E-mel berdaftar">
            <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          <ErrorBox msg={err} />
          <Btn type="submit" disabled={busy} className="w-full py-3">
            {busy ? "Menghantar…" : "Hantar pautan reset"}
          </Btn>
          <p className="text-center text-sm">
            <Link href="/login" className="font-semibold text-acc hover:underline">
              Kembali ke log masuk
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
