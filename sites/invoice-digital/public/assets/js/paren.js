// Teks dalam kurungan pada label/tajuk (cth: "(jika perlu)", "(RM)", "(%)", "(Pilihan)") -> BOLD ITALIC di seluruh sistem
const PAREN_SEL = "label, .lbl, .lt, .sec-t, summary, th, h2, h3, h4, .iv-l, .qe-lbl, .kv span, .totals span, .ao-sum span, .ao-after span, .muted";
const PAREN_RE = /\([^()\n]{1,40}\)/g;
function boldParens(root) {
  if (!root || !root.querySelectorAll) return;
  const els = root.matches && root.matches(PAREN_SEL) ? [root, ...root.querySelectorAll(PAREN_SEL)] : root.querySelectorAll(PAREN_SEL);
  els.forEach((el) => {
    [...el.childNodes].forEach((n) => {
      if (n.nodeType !== 3 || !PAREN_RE.test(n.nodeValue)) return; PAREN_RE.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m; const v = n.nodeValue;
      while ((m = PAREN_RE.exec(v))) { frag.append(v.slice(last, m.index)); const em = document.createElement("em"); em.className = "paren"; em.textContent = m[0]; frag.append(em); last = m.index + m[0].length; }
      frag.append(v.slice(last)); n.replaceWith(frag);
    });
  });
}
new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && boldParens(n)))).observe(document.body, { childList: true, subtree: true });
boldParens(document.body);
