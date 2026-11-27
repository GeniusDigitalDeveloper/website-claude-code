// Teks dalam kurungan pada label/tajuk (cth: "(jika perlu)", "(RM)", "(%)", "(Pilihan)") -> BOLD ITALIC di seluruh sistem
const PAREN_SEL = "label, .lbl, .lt, .sec-t, summary, th, h2, h3, h4, .iv-l, .qe-lbl, .kv span, .totals span, .ao-sum span, .ao-after span, .muted";
const PAREN_RE = /\([^()\n]{1,40}\)/g;
function boldParens(root) {
  if (!root || !root.querySelectorAll) return;
  const els = root.matches && root.matches(PAREN_SEL) ? [root, ...root.querySelectorAll(PAREN_SEL)] : root.querySelectorAll(PAREN_SEL);
  els.forEach((el) => {
    [...el.childNodes].forEach((n) => {
      if (n.nodeType !== 3 || (n.parentElement && n.parentElement.classList.contains("pt")) || !PAREN_RE.test(n.nodeValue)) return; PAREN_RE.lastIndex = 0;
      // dibungkus dalam SATU span supaya kekal sebaris walaupun induknya flex (cth: label medan borang)
      const wrap = document.createElement("span"); wrap.className = "pt"; let last = 0, m; const v = n.nodeValue;
      while ((m = PAREN_RE.exec(v))) { wrap.append(v.slice(last, m.index)); const em = document.createElement("em"); em.className = "paren"; em.textContent = m[0]; wrap.append(em); last = m.index + m[0].length; }
      wrap.append(v.slice(last)); n.replaceWith(wrap);
    });
  });
}
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && boldParens(n)))).observe(document.body, { childList: true, subtree: true });
boldParens(document.body);
