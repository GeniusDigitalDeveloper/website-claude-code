// Penyerlah sintaks ringan (tanpa dependency). Output = DOM node (bukan innerHTML) → selamat XSS.
const RULES = {
  json: [['str', /"(?:\\.|[^"\\])*"(?=\s*:)/y, 'key'], ['str', /"(?:\\.|[^"\\])*"/y], ['num', /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y], ['kw', /\b(?:true|false|null)\b/y], ['pun', /[{}[\],:]/y]],
  js: [['com', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y], ['str', /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y], ['kw', /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false)\b/y], ['num', /\b\d+(?:\.\d+)?\b/y], ['fn', /[A-Za-z_$][\w$]*(?=\()/y]],
  css: [['com', /\/\*[\s\S]*?\*\//y], ['str', /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y], ['kw', /@[\w-]+/y], ['key', /[\w-]+(?=\s*:)/y], ['num', /#[0-9a-fA-F]{3,8}\b|-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg)?/y]],
  html: [['com', /<!--[\s\S]*?-->/y], ['kw', /<\/?[A-Za-z][\w:-]*|\/?>|<![A-Za-z]+/y], ['key', /[\w:-]+(?==)/y], ['str', /"[^"]*"|'[^']*'/y]],
  sql: [['com', /--[^\n]*|\/\*[\s\S]*?\*\//y], ['str', /'(?:''|[^'])*'/y], ['kw', /\b(?:select|from|where|and|or|not|insert|into|values|update|set|delete|create|table|alter|drop|join|left|right|inner|outer|on|group|by|order|having|limit|offset|as|distinct|union|all|null|is|in|like|between|case|when|then|else|end|primary|key|index|asc|desc)\b/yi], ['num', /\b\d+(?:\.\d+)?\b/y]],
  md: [['kw', /^#{1,6} .*$/my], ['str', /`[^`\n]+`|```[\s\S]*?```/y], ['key', /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)/y], ['com', /^\s*(?:[-*+]|\d+\.) /my]],
};
RULES.xml = RULES.html; RULES.svg = RULES.html;
RULES.txt = [];

export function highlight(code, lang = 'txt') {
  const frag = document.createDocumentFragment();
  const rules = RULES[lang] || [];
  if (!rules.length || code.length > 200000) { frag.append(document.createTextNode(code)); return frag; }
  let i = 0, plain = '';
  const flush = () => { if (plain) { frag.append(document.createTextNode(plain)); plain = ''; } };
  while (i < code.length) {
    let hit = null;
    for (const [cls, re, alt] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m.index === i && m[0].length) { hit = [alt || cls, m[0]]; break; }
    }
    if (hit) {
      flush();
      const s = document.createElement('span'); s.className = 'tok-' + hit[0]; s.textContent = hit[1];
      frag.append(s); i += hit[1].length;
    } else { plain += code[i++]; }
  }
  flush();
  return frag;
}
