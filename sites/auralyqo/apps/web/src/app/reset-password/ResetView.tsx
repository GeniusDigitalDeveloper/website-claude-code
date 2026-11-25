"use client";
import { CheckCircle2 } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { authMessage } from "@/store/auth";
import { AuthLayout, ErrorBox } from "@/components/auth/AuthLayout";
import { PasswordInput, StrengthMeter } from "@/components/auth/PasswordInput";
import { Btn, Field } from "@/components/ui";

/** Secure reset page the branded e-mail links to (Firebase oobCode, time-limited, single use). */
export function ResetView() {
  const sp = useSearchParams();
  const code = sp.get("oobCode") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const a = auth();
    if (!a || !code) return setState("invalid");
    verifyPasswordResetCode(a, code)
      .then((e) => (setEmail(e), setState("ready")))
      .catch((e) => (setErr(authMessage(e)), setState("invalid")));
  }, [code]);

  if (state === "done")
    return (
      <AuthLayout title="Kata laluan dikemas kini" sub="Anda kini boleh log masuk dengan kata laluan baharu.">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <Btn href="/login?reset=1" className="w-full">
            Kembali ke log masuk
          </Btn>
        </div>
      </AuthLayout>
    );
  if (state === "invalid")
    return (
      <AuthLayout title="Pautan tidak sah" sub="Pautan reset mungkin telah tamat tempoh atau sudah digunakan.">
        <ErrorBox msg={err} />
        <Btn href="/forgot-password" className="mt-4 w-full">
          Minta pautan baharu
        </Btn>
      </AuthLayout>
    );
  return (
    <AuthLayout title="Tetapkan kata laluan baharu" sub={email ? `Untuk ${email}` : "Mengesahkan pautan…"}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          if (pw.length < 8) return setErr("Minimum 8 aksara.");
          if (pw !== pw2) return setErr("Pengesahan kata laluan tidak sepadan.");
          setBusy(true);
          try {
            await confirmPasswordReset(auth()!, code, pw);
            setState("done");
          } catch (e) {
            setErr(authMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Kata laluan baharu">
          <PasswordInput value={pw} onChange={setPw} autoComplete="new-password" required />
        </Field>
        <StrengthMeter value={pw} />
        <Field label="Sahkan kata laluan baharu">
          <PasswordInput value={pw2} onChange={setPw2} autoComplete="new-password" required />
        </Field>
        <ErrorBox msg={err} />
        <Btn type="submit" disabled={busy || state !== "ready"} className="w-full py-3">
          {busy ? "Menyimpan…" : "Simpan kata laluan"}
        </Btn>
      </form>
    </AuthLayout>
  );
}
