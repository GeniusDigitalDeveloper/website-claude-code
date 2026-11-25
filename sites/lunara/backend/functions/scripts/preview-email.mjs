import { writeFileSync } from "node:fs";
import { resetEmailHtml, toAppResetLink } from "../src/email-reset.js";

const appUrl = process.argv[2] ?? "https://lunara.app";
const link = toAppResetLink("https://lunara.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=CONTOH-KOD-SEKALI-GUNA&apiKey=x", appUrl);
const out = new URL("../../email-templates/reset-password.html", import.meta.url);
writeFileSync(out, resetEmailHtml({ name: "Ahmad", link, appUrl }));
console.log("written", out.pathname);
