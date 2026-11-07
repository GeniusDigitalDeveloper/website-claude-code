// Bahagian Profil: tiga sub — Perniagaan, Sejarah Dokumen, Tetapan (akaun, lalai dokumen, bahasa, kata laluan).
import { t } from "../i18n.js";
import { $, esc } from "../util.js";
import { ico } from "./ui.js";

export const TABS = [["business", "building"], ["history", "clock"], ["settings", "gear"]];
const ALIAS = { account: "settings", documents: "settings" };
export async function render(el, ctx, sub) {
  sub = ALIAS[sub] || sub; sub = TABS.some((x) => x[0] === sub) ? sub : "business";
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_profile")}</h1><p class="sub">${t("profile_sub")}</p></div><button class="btn logout" data-logout>${ico("logout")}<span>${t("logout")}</span></button></div>
    <nav class="tabs" aria-label="${esc(t("nav_profile"))}">${TABS.map(([k, i]) => `<a href="#/app/profile/${k}" class="${k === sub ? "on" : ""}" ${k === sub ? 'aria-current="page"' : ""}>${ico(i)}<span>${t("sub_" + k)}</span></a>`).join("")}</nav><div id="pbody"></div>`;
  $("[data-logout]", el).onclick = () => ctx.logout();
  const body = $("#pbody", el);
  if (sub === "business") return (await import("./company.js")).render(body, ctx, "business");
  if (sub === "history") return (await import("./history.js")).render(body, ctx, true);
  // Tetapan: akaun + lalai dokumen + bahasa & kata laluan
  body.innerHTML = `<h2 class="sec-t">${t("prof_account")}</h2><div id="s1"></div><h2 class="sec-t">${t("prof_documents")}</h2><div id="s2"></div><h2 class="sec-t">${t("language")} &amp; ${t("password")}</h2><div id="s3"></div>`;
  const S = await import("./settings.js"), C = await import("./company.js");
  await Promise.all([S.render($("#s1", body), ctx, "account"), C.render($("#s2", body), ctx, "documents"), S.render($("#s3", body), ctx, "settings")]);
}
