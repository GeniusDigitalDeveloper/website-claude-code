// Bahagian Profil: tab sub-tetapan (Akaun, Perniagaan, Dokumen, Tetapan).
import { t } from "../i18n.js";
import { $, esc } from "../util.js";
import { ico } from "./ui.js";

export const TABS = [["account", "users"], ["business", "building"], ["documents", "doc"], ["settings", "gear"]];
export async function render(el, ctx, sub) {
  sub = TABS.some((x) => x[0] === sub) ? sub : "account";
  el.innerHTML = `<div class="page-h"><div><h1>${t("nav_profile")}</h1><p class="sub">${t("profile_sub")}</p></div></div>
    <nav class="tabs" aria-label="${esc(t("nav_profile"))}">${TABS.map(([k, i]) => `<a href="#/app/profile/${k}" class="${k === sub ? "on" : ""}" ${k === sub ? 'aria-current="page"' : ""}>${ico(i)}<span>${t("prof_" + k)}</span></a>`).join("")}</nav><div id="pbody"></div>`;
  const body = $("#pbody", el);
  if (sub === "business" || sub === "documents") return (await import("./company.js")).render(body, ctx, sub);
  return (await import("./settings.js")).render(body, ctx, sub);
}
