/**
 * Branded, responsive HTML password-reset e-mail for LUNARA MUSIC.
 * Table layout + inline styles so it renders in Gmail, Outlook (incl. desktop/Word engine) and mobile mail apps.
 */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function resetEmailHtml({ name, link, appUrl, expiresMinutes = 60 }) {
  const n = esc(name || "Pendengar LUNARA MUSIC");
  const l = esc(link);
  const logo = esc(`${appUrl}/brand/lunara-mark-320.png`);
  return `<!doctype html>
<html lang="ms" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>Tetapkan semula kata laluan LUNARA MUSIC</title>
<!--[if mso]><style>*{font-family:Arial,sans-serif!important}</style><![endif]-->
<style>
  @media (max-width:600px){ .container{width:100%!important} .px{padding-left:24px!important;padding-right:24px!important} .h1{font-size:24px!important} }
</style>
</head>
<body style="margin:0;padding:0;background:#0a0920;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Pautan untuk tetapkan kata laluan baharu anda. Sah selama ${expiresMinutes} minit.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0920;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#131232;border-radius:20px;overflow:hidden;border:1px solid #26244f;">
      <!-- header -->
      <tr><td align="center" style="background:#0b0742;background-image:linear-gradient(135deg,#0b0742,#2a0f7a 55%,#3b0a8a);padding:36px 24px 30px;">
        <img src="${logo}" width="88" alt="LUNARA MUSIC" style="display:block;width:88px;height:auto;border:0;margin:0 auto 12px;">
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:26px;letter-spacing:4px;font-weight:800;color:#ffffff;">LUNARA</div>
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:8px;font-weight:600;color:#e0e7ff;margin-top:2px;">MUSIC</div>
        <div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;color:#eef2ff;margin-top:6px;">Your Music. Your Universe.</div>
      </td></tr>
      <!-- body -->
      <tr><td class="px" style="padding:36px 44px 8px;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#f4f3ff;">
        <h1 class="h1" style="margin:0 0 14px;font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;">Tetapkan semula kata laluan anda</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d4d3ee;">Hai ${n},</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#d4d3ee;">Kami menerima permintaan untuk menetapkan semula kata laluan akaun LUNARA MUSIC anda. Klik butang di bawah untuk mencipta kata laluan baharu.</p>
      </td></tr>
      <tr><td align="center" style="padding:4px 44px 26px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${l}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="#6d28d9"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Tetapkan Kata Laluan</center></v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${l}" style="display:inline-block;background:#6d28d9;background-image:linear-gradient(120deg,#a855f7,#6366f1 55%,#06b6d4);color:#ffffff;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:999px;">Tetapkan Kata Laluan</a>
        <!--<![endif]-->
      </td></tr>
      <tr><td class="px" style="padding:0 44px 8px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1940;border-radius:14px;">
          <tr><td style="padding:16px 18px;font-size:13px;line-height:1.6;color:#c9c8e6;">
            <strong style="color:#ffffff;">Peringatan keselamatan</strong><br>
            &bull; Pautan ini sah selama <strong style="color:#ffffff;">${expiresMinutes} minit</strong> dan hanya boleh digunakan sekali.<br>
            &bull; LUNARA MUSIC tidak akan sekali-kali meminta kata laluan anda melalui e-mel atau telefon.<br>
            &bull; Jika anda tidak membuat permintaan ini, abaikan e-mel ini. Kata laluan anda tidak akan berubah.
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="px" style="padding:20px 44px 32px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a9a8cc;">
        Butang tidak berfungsi? Salin pautan ini ke pelayar anda:<br>
        <a href="${l}" style="color:#a5b4fc;word-break:break-all;">${l}</a>
      </td></tr>
      <!-- footer -->
      <tr><td align="center" style="border-top:1px solid #26244f;padding:22px 24px 28px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8786ad;">
        LUNARA MUSIC &middot; Penstriman muzik tanpa iklan<br>
        E-mel ini dihantar kerana ada permintaan tetapan semula kata laluan untuk akaun anda.<br>
        <a href="${esc(appUrl)}/legal/privacy" style="color:#a5b4fc;">Dasar Privasi</a> &nbsp;&middot;&nbsp; <a href="${esc(appUrl)}/legal/terms" style="color:#a5b4fc;">Terma</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function resetEmailText({ name, link, expiresMinutes = 60 }) {
  return `Hai ${name || "Pendengar LUNARA MUSIC"},

Kami menerima permintaan untuk menetapkan semula kata laluan akaun LUNARA MUSIC anda.
Buka pautan ini untuk mencipta kata laluan baharu (sah ${expiresMinutes} minit, sekali guna):

${link}

Jika anda tidak membuat permintaan ini, abaikan e-mel ini.

LUNARA MUSIC: Your Music. Your Universe.`;
}

/** Turn Firebase's generated action link into a link to OUR branded reset page. */
export function toAppResetLink(firebaseLink, appUrl) {
  const u = new URL(firebaseLink);
  const oob = u.searchParams.get("oobCode");
  if (!oob) throw new Error("oobCode missing");
  const out = new URL("/reset-password", appUrl);
  out.searchParams.set("mode", "resetPassword");
  out.searchParams.set("oobCode", oob);
  return out.toString();
}
