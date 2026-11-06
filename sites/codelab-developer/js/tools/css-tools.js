import { cssTool, h } from './lib/ui.js';
import { parseHex, hslToHex, rgbToHsl, clamp } from './lib/color.js';

const R = (id, label, min, max, value, unit = '', step = 1) => ({ key: id, type: 'range', label, min, max, value, unit, step });
const C = (id, label, value) => ({ key: id, type: 'color', label, value });
const S = (id, label, value, opts) => ({ key: id, type: 'select', label, value, options: opts.map((o) => (Array.isArray(o) ? { v: o[0], l: o[1] } : { v: o, l: o, raw: true })) });
const K = (id, label, value) => ({ key: id, type: 'checkbox', label, value });
const rgba = (hex, a) => { const c = parseHex(hex) || { r: 0, g: 0, b: 0 }; return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`; };
const box = (cls = 'demo', text = '') => h('div', { class: cls }, text);
const shade = (hex, d) => { const c = parseHex(hex); if (!c) return hex; const x = rgbToHsl(c); return hslToHex(x.h, x.s, clamp(x.l + d, 0, 100)); };

export const tools = {
  'css-gradient': () => cssTool({ filename: 'gradient.css', selector: '.demo',
    controls: [S('type', 'css.type', 'linear', [['linear', 'css.linear'], ['radial', 'css.radial'], ['conic', 'css.conic']]), R('angle', 'css.angle', 0, 360, 135, '°'),
      C('c1', 'css.color1', '#6366f1'), R('p1', 'css.pos1', 0, 100, 0, '%'), C('c2', 'css.color2', '#a855f7'), R('p2', 'css.pos2', 0, 100, 55, '%'),
      K('use3', 'css.useThird', true), C('c3', 'css.color3', '#06b6d4'), R('p3', 'css.pos3', 0, 100, 100, '%')],
    presets: [{ n: 'Ocean', raw: true, v: { c1: '#2563eb', c2: '#06b6d4', c3: '#22d3ee', p2: 50 } }, { n: 'Sunset', raw: true, v: { c1: '#f97316', c2: '#ec4899', c3: '#8b5cf6' } }, { n: 'Mint', raw: true, v: { c1: '#10b981', c2: '#3b82f6', use3: false } }, { n: 'Genius', raw: true, v: { c1: '#4f46e5', c2: '#7c3aed', c3: '#2563eb' } }],
    css: (v) => {
      const stops = [`${v.c1} ${v.p1}%`, `${v.c2} ${v.p2}%`].concat(v.use3 ? [`${v.c3} ${v.p3}%`] : []).join(', ');
      const g = v.type === 'linear' ? `linear-gradient(${v.angle}deg, ${stops})` : v.type === 'radial' ? `radial-gradient(circle, ${stops})` : `conic-gradient(from ${v.angle}deg, ${stops})`;
      return `.demo {\n  width: 100%;\n  height: 240px;\n  border-radius: 16px;\n  background: ${v.c1};\n  background: ${g};\n}`;
    } }),

  'css-box-shadow': () => cssTool({ filename: 'box-shadow.css', stageBg: '#f1f5f9',
    controls: [R('x', 'css.offsetX', -60, 60, 0, 'px'), R('y', 'css.offsetY', -60, 60, 12, 'px'), R('blur', 'css.blur', 0, 100, 32, 'px'), R('spread', 'css.spread', -50, 50, -6, 'px'),
      C('color', 'css.shadowColor', '#4f46e5'), R('op', 'css.opacity', 0, 100, 30, '%'), K('inset', 'css.inset', false),
      K('two', 'css.secondLayer', true), R('y2', 'css.offsetY2', -60, 60, 2, 'px'), R('blur2', 'css.blur2', 0, 60, 6, 'px')],
    presets: [{ n: 'ui.pSoft', v: { x: 0, y: 8, blur: 24, spread: 0, op: 15, two: false } }, { n: 'ui.pDeep', v: { x: 0, y: 24, blur: 60, spread: -10, op: 40, two: true } }, { n: 'ui.pFlat', v: { x: 6, y: 6, blur: 0, spread: 0, op: 100, two: false } }],
    css: (v) => {
      const l1 = `${v.inset ? 'inset ' : ''}${v.x}px ${v.y}px ${v.blur}px ${v.spread}px ${rgba(v.color, v.op / 100)}`;
      const l2 = `0 ${v.y2}px ${v.blur2}px ${rgba('#0f172a', 0.12)}`;
      return `.demo {\n  width: 200px;\n  height: 200px;\n  border-radius: 20px;\n  background: #ffffff;\n  box-shadow: ${l1}${v.two ? `,\n    ${l2}` : ''};\n}`;
    }, render: () => box('demo') }),

  'css-border-radius': () => cssTool({ filename: 'border-radius.css', stageBg: '#f8fafc',
    controls: [S('unit', 'css.unit', 'px', ['px', '%']), R('tl', 'css.topLeft', 0, 200, 40, ''), R('tr', 'css.topRight', 0, 200, 40, ''), R('br', 'css.bottomRight', 0, 200, 40, ''), R('bl', 'css.bottomLeft', 0, 200, 40, ''),
      K('ell', 'css.elliptical', false), R('vtl', 'css.vTopLeft', 0, 200, 80, ''), R('vtr', 'css.vTopRight', 0, 200, 20, ''), R('vbr', 'css.vBottomRight', 0, 200, 80, ''), R('vbl', 'css.vBottomLeft', 0, 200, 20, '')],
    presets: [{ n: 'ui.pPill', v: { unit: 'px', tl: 120, tr: 120, br: 120, bl: 120, ell: false } }, { n: 'ui.pCircle', v: { unit: '%', tl: 50, tr: 50, br: 50, bl: 50, ell: false } }, { n: 'Leaf', raw: true, v: { unit: '%', tl: 0, tr: 70, br: 0, bl: 70, ell: false } }, { n: 'Blob', raw: true, v: { unit: '%', tl: 30, tr: 70, br: 70, bl: 30, ell: true, vtl: 30, vtr: 30, vbr: 70, vbl: 70 } }],
    css: (v) => {
      const m = (n) => (v.unit === '%' ? Math.min(n, 100) : n) + v.unit;
      const h1 = `${m(v.tl)} ${m(v.tr)} ${m(v.br)} ${m(v.bl)}`;
      const r = v.ell ? `${h1} / ${m(v.vtl)} ${m(v.vtr)} ${m(v.vbr)} ${m(v.vbl)}` : h1;
      return `.demo {\n  width: 240px;\n  height: 240px;\n  background: linear-gradient(135deg, #6366f1, #a855f7);\n  border-radius: ${r};\n}`;
    } }),

  'css-glassmorphism': () => cssTool({ filename: 'glassmorphism.css', stageBg: 'linear-gradient(135deg,#4f46e5 0%,#06b6d4 50%,#f472b6 100%)',
    controls: [C('color', 'css.glassColor', '#ffffff'), R('op', 'css.transparency', 0, 100, 18, '%'), R('blur', 'css.blur', 0, 40, 16, 'px'), R('sat', 'css.saturation', 100, 250, 160, '%'), R('border', 'css.borderOpacity', 0, 100, 35, '%'), R('radius', 'css.radius', 0, 60, 24, 'px')],
    css: (v) => `.demo {\n  width: 280px;\n  padding: 28px;\n  color: #ffffff;\n  background: ${rgba(v.color, v.op / 100)};\n  border: 1px solid ${rgba('#ffffff', v.border / 100)};\n  border-radius: ${v.radius}px;\n  -webkit-backdrop-filter: blur(${v.blur}px) saturate(${v.sat}%);\n  backdrop-filter: blur(${v.blur}px) saturate(${v.sat}%);\n  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.2);\n}`,
    render: () => h('div', { class: 'demo' }, h('strong', {}, 'Glassmorphism'), h('p', { style: 'margin:.5rem 0 0' }, 'CodeLab Developer')) }),

  'css-neumorphism': () => cssTool({ filename: 'neumorphism.css',
    controls: [C('bg', 'css.background', '#e6ebf5'), S('shape', 'css.shape', 'flat', [['flat', 'css.flat'], ['concave', 'css.concave'], ['convex', 'css.convex'], ['pressed', 'css.pressed']]), R('size', 'css.size', 80, 320, 200, 'px'), R('radius', 'css.radius', 0, 160, 36, 'px'), R('dist', 'css.distance', 2, 40, 14, 'px'), R('blur', 'css.blur', 0, 80, 30, 'px'), R('int', 'css.intensity', 4, 30, 14, '')],
    css: (v) => {
      const lt = shade(v.bg, v.int), dk = shade(v.bg, -v.int), inset = v.shape === 'pressed' ? 'inset ' : '';
      const bg = v.shape === 'concave' ? `linear-gradient(145deg, ${shade(v.bg, -v.int / 2)}, ${shade(v.bg, v.int / 2)})` : v.shape === 'convex' ? `linear-gradient(145deg, ${shade(v.bg, v.int / 2)}, ${shade(v.bg, -v.int / 2)})` : v.bg;
      return `.demo {\n  width: ${v.size}px;\n  height: ${v.size}px;\n  border-radius: ${v.radius}px;\n  background: ${bg};\n  box-shadow: ${inset}${v.dist}px ${v.dist}px ${v.blur}px ${dk},\n    ${inset}-${v.dist}px -${v.dist}px ${v.blur}px ${lt};\n}`;
    }, render: (v) => { const w = h('div', { class: 'neu-bg', style: `background:${v.bg};padding:48px;border-radius:16px;display:grid;place-items:center` }, box('demo')); return w; } }),

  'css-button': () => cssTool({ filename: 'button.css', stageBg: '#f8fafc',
    controls: [C('bg', 'css.background', '#4f46e5'), K('grad', 'css.useGradient', true), C('bg2', 'css.color2', '#7c3aed'), C('fg', 'css.textColor', '#ffffff'), R('fs', 'css.fontSize', 12, 28, 16, 'px'), R('px', 'css.padX', 8, 64, 28, 'px'), R('py', 'css.padY', 4, 28, 12, 'px'), R('radius', 'css.radius', 0, 60, 12, 'px'), R('bw', 'css.borderWidth', 0, 6, 0, 'px'), C('bc', 'css.borderColor', '#312e81'), K('shadow', 'css.shadow', true),
      S('hover', 'css.hoverEffect', 'lift', [['none', 'css.none'], ['lift', 'css.lift'], ['darken', 'css.darken'], ['glow', 'css.glow']]), R('dur', 'css.duration', 0, 800, 200, 'ms', 50)],
    css: (v) => {
      const bg = v.grad ? `linear-gradient(135deg, ${v.bg}, ${v.bg2})` : v.bg;
      const hv = { none: '', lift: '  transform: translateY(-2px);\n  box-shadow: 0 10px 24px ' + rgba(v.bg, 0.4) + ';\n', darken: `  filter: brightness(0.9);\n`, glow: `  box-shadow: 0 0 0 4px ${rgba(v.bg, 0.25)}, 0 0 24px ${rgba(v.bg, 0.55)};\n` }[v.hover];
      return `.demo {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: ${v.py}px ${v.px}px;\n  font: 600 ${v.fs}px/1.2 system-ui, sans-serif;\n  color: ${v.fg};\n  background: ${bg};\n  border: ${v.bw}px solid ${v.bw ? v.bc : 'transparent'};\n  border-radius: ${v.radius}px;\n  cursor: pointer;${v.shadow ? `\n  box-shadow: 0 4px 14px ${rgba(v.bg, 0.35)};` : ''}\n  transition: transform ${v.dur}ms ease, box-shadow ${v.dur}ms ease, filter ${v.dur}ms ease;\n}\n\n.demo:hover {\n${hv}}\n\n.demo:focus-visible {\n  outline: 3px solid ${rgba(v.bg, 0.5)};\n  outline-offset: 3px;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .demo { transition: none; }\n}`;
    }, render: () => h('button', { class: 'demo', type: 'button' }, 'Butang CodeLab') }),

  'css-animation': () => cssTool({ filename: 'animation.css', stageBg: '#f8fafc',
    controls: [S('kind', 'css.animation', 'bounce', [['fade', 'css.aFade'], ['slide', 'css.aSlide'], ['bounce', 'css.aBounce'], ['pulse', 'css.aPulse'], ['spin', 'css.aSpin'], ['shake', 'css.aShake'], ['flip', 'css.aFlip'], ['zoom', 'css.aZoom']]),
      R('dur', 'css.durationS', 0.2, 5, 1.2, 's', 0.1), R('delay', 'css.delay', 0, 3, 0, 's', 0.1), S('timing', 'css.timing', 'ease-in-out', ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(0.34, 1.56, 0.64, 1)']),
      S('iter', 'css.iterations', 'infinite', ['1', '2', '3', 'infinite']), S('dir', 'css.direction', 'normal', ['normal', 'reverse', 'alternate', 'alternate-reverse'])],
    css: (v) => {
      const kf = {
        fade: '  from { opacity: 0; }\n  to { opacity: 1; }', slide: '  from { opacity: 0; transform: translateY(40px); }\n  to { opacity: 1; transform: translateY(0); }',
        bounce: '  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-40px); }', pulse: '  0%, 100% { transform: scale(1); opacity: 1; }\n  50% { transform: scale(1.12); opacity: 0.8; }',
        spin: '  from { transform: rotate(0deg); }\n  to { transform: rotate(360deg); }', shake: '  0%, 100% { transform: translateX(0); }\n  20%, 60% { transform: translateX(-12px); }\n  40%, 80% { transform: translateX(12px); }',
        flip: '  from { transform: perspective(400px) rotateY(0); }\n  to { transform: perspective(400px) rotateY(360deg); }', zoom: '  from { opacity: 0; transform: scale(0.3); }\n  to { opacity: 1; transform: scale(1); }',
      }[v.kind];
      return `@keyframes ${v.kind} {\n${kf}\n}\n\n.demo {\n  width: 120px;\n  height: 120px;\n  border-radius: 24px;\n  background: linear-gradient(135deg, #6366f1, #a855f7);\n  animation: ${v.kind} ${v.dur}s ${v.timing} ${v.delay}s ${v.iter} ${v.dir} both;\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .demo { animation: none; }\n}`;
    } }),

  'css-transform': () => cssTool({ filename: 'transform.css', stageBg: '#f8fafc',
    controls: [R('rot', 'css.rotate', -360, 360, 15, '°'), R('sx', 'css.scaleX', 0.2, 2, 1, '', 0.05), R('sy', 'css.scaleY', 0.2, 2, 1, '', 0.05), R('tx', 'css.translateX', -150, 150, 0, 'px'), R('ty', 'css.translateY', -150, 150, 0, 'px'), R('kx', 'css.skewX', -60, 60, 0, '°'), R('ky', 'css.skewY', -60, 60, 0, '°'),
      R('rx', 'css.rotateX', -180, 180, 0, '°'), R('ry', 'css.rotateY', -180, 180, 0, '°'), R('persp', 'css.perspective', 0, 1200, 600, 'px', 50), S('origin', 'css.origin', 'center', ['center', 'top left', 'top right', 'bottom left', 'bottom right', 'top', 'bottom'])],
    css: (v) => {
      const parts = [];
      if (v.persp && (v.rx || v.ry)) parts.push(`perspective(${v.persp}px)`);
      if (v.tx || v.ty) parts.push(`translate(${v.tx}px, ${v.ty}px)`);
      if (v.rx) parts.push(`rotateX(${v.rx}deg)`); if (v.ry) parts.push(`rotateY(${v.ry}deg)`);
      if (v.rot) parts.push(`rotate(${v.rot}deg)`);
      if (v.sx !== 1 || v.sy !== 1) parts.push(`scale(${v.sx}, ${v.sy})`);
      if (v.kx || v.ky) parts.push(`skew(${v.kx}deg, ${v.ky}deg)`);
      return `.demo {\n  width: 140px;\n  height: 140px;\n  border-radius: 16px;\n  background: linear-gradient(135deg, #6366f1, #06b6d4);\n  transform-origin: ${v.origin};\n  transform: ${parts.join(' ') || 'none'};\n}`;
    } }),

  'css-flexbox': () => cssTool({ filename: 'flexbox.css', stageBg: '#f8fafc',
    controls: [S('dir', 'css.flexDirection', 'row', ['row', 'row-reverse', 'column', 'column-reverse']), S('wrap', 'css.flexWrap', 'wrap', ['nowrap', 'wrap', 'wrap-reverse']), S('jc', 'css.justifyContent', 'center', ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']),
      S('ai', 'css.alignItems', 'center', ['stretch', 'flex-start', 'center', 'flex-end', 'baseline']), S('ac', 'css.alignContent', 'normal', ['normal', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'stretch']), R('gap', 'css.gap', 0, 60, 12, 'px'), R('n', 'css.itemCount', 1, 12, 5, '')],
    css: (v) => `.container {\n  display: flex;\n  flex-direction: ${v.dir};\n  flex-wrap: ${v.wrap};\n  justify-content: ${v.jc};\n  align-items: ${v.ai};\n  align-content: ${v.ac};\n  gap: ${v.gap}px;\n}`,
    render: (v) => h('div', { class: 'container', style: 'min-height:260px;background:#e2e8f0;border-radius:12px;padding:12px' }, Array.from({ length: v.n }, (_, i) => h('div', { class: 'flex-item', style: `min-width:56px;padding:${10 + (i % 3) * 8}px 14px;background:#4f46e5;color:#fff;border-radius:8px;font-weight:700;text-align:center` }, String(i + 1)))) }),

  'css-grid': () => cssTool({ filename: 'grid.css', stageBg: '#f8fafc',
    controls: [S('mode', 'css.gridMode', 'equal', [['equal', 'css.gridEqual'], ['auto', 'css.gridAuto'], ['custom', 'css.gridCustom']]), R('cols', 'css.columns', 1, 8, 3, ''), R('rows', 'css.rows', 1, 6, 2, ''), { key: 'custom', type: 'text', label: 'css.customTemplate', value: '1fr 2fr 1fr', ph: '1fr 2fr 1fr', dir: 'ltr' },
      R('cg', 'css.columnGap', 0, 60, 12, 'px'), R('rg', 'css.rowGap', 0, 60, 12, 'px'), S('ji', 'css.justifyItems', 'stretch', ['stretch', 'start', 'center', 'end']), S('ai', 'css.alignItems', 'stretch', ['stretch', 'start', 'center', 'end'])],
    css: (v) => {
      const safe = /^[\w\s().,%-]+$/.test(v.custom) ? v.custom.trim() : '1fr';
      const tpl = v.mode === 'equal' ? `repeat(${v.cols}, 1fr)` : v.mode === 'auto' ? 'repeat(auto-fit, minmax(120px, 1fr))' : safe;
      return `.container {\n  display: grid;\n  grid-template-columns: ${tpl};\n  grid-auto-rows: minmax(64px, auto);\n  gap: ${v.rg}px ${v.cg}px;\n  justify-items: ${v.ji};\n  align-items: ${v.ai};\n}`;
    },
    render: (v) => { const cols = v.mode === 'custom' ? Math.max((v.custom.trim().split(/\s+/).length) || 1, 1) : v.cols; return h('div', { class: 'container', style: 'background:#e2e8f0;border-radius:12px;padding:12px' }, Array.from({ length: cols * v.rows }, (_, i) => h('div', { style: 'padding:14px;background:#4f46e5;color:#fff;border-radius:8px;font-weight:700;text-align:center' }, String(i + 1)))); } }),

  'css-text-shadow': () => cssTool({ filename: 'text-shadow.css', stageBg: '#0f172a',
    controls: [{ key: 'text', type: 'text', label: 'css.previewText', value: 'CodeLab' }, C('tc', 'css.textColor', '#ffffff'), R('x', 'css.offsetX', -30, 30, 0, 'px'), R('y', 'css.offsetY', -30, 30, 4, 'px'), R('blur', 'css.blur', 0, 60, 18, 'px'), C('color', 'css.shadowColor', '#818cf8'), R('op', 'css.opacity', 0, 100, 80, '%'), K('two', 'css.secondLayer', true), R('blur2', 'css.blur2', 0, 80, 40, 'px')],
    css: (v) => `.demo {\n  font: 800 64px/1.1 system-ui, sans-serif;\n  color: ${v.tc};\n  text-shadow: ${v.x}px ${v.y}px ${v.blur}px ${rgba(v.color, v.op / 100)}${v.two ? `,\n    0 0 ${v.blur2}px ${rgba(v.color, v.op / 200)}` : ''};\n}`,
    render: (v) => h('div', { class: 'demo', style: 'text-align:center;word-break:break-word' }, v.text || ' ') }),

  'css-clip-path': () => {
    const SHAPES = { triangle: '50% 0%, 0% 100%, 100% 100%', trapezoid: '20% 0%, 80% 0%, 100% 100%, 0% 100%', rhombus: '50% 0%, 100% 50%, 50% 100%, 0% 50%', pentagon: '50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%', hexagon: '25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%', octagon: '30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%', star: '50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%', arrow: '0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%', cross: '35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%', message: '0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%' };
    return cssTool({ filename: 'clip-path.css', stageBg: '#f8fafc',
      controls: [S('shape', 'css.shape', 'hexagon', [['circle', 'css.circle'], ['ellipse', 'css.ellipse'], ['inset', 'css.insetShape'], ...Object.keys(SHAPES).map((k) => [k, `css.sh_${k}`]), ['custom', 'css.customPolygon']]),
        R('r', 'css.radius', 5, 100, 50, '%'), R('inset', 'css.inset', 0, 45, 10, '%'), R('round', 'css.insetRound', 0, 50, 12, 'px'), { key: 'pts', type: 'text', label: 'css.polygonPoints', value: '50% 0%, 100% 100%, 0% 100%', ph: '50% 0%, 100% 100%, 0% 100%', dir: 'ltr', wide: true }],
      css: (v) => {
        let cp;
        if (v.shape === 'circle') cp = `circle(${v.r}% at 50% 50%)`;
        else if (v.shape === 'ellipse') cp = `ellipse(${v.r}% ${Math.round(v.r * 0.7)}% at 50% 50%)`;
        else if (v.shape === 'inset') cp = `inset(${v.inset}% round ${v.round}px)`;
        else if (v.shape === 'custom') { const ok = /^\s*(-?\d*\.?\d+(%|px)?\s+-?\d*\.?\d+(%|px)?\s*,\s*){2,}-?\d*\.?\d+(%|px)?\s+-?\d*\.?\d+(%|px)?\s*$/.test(v.pts); cp = `polygon(${ok ? v.pts.trim() : SHAPES.triangle})`; }
        else cp = `polygon(${SHAPES[v.shape]})`;
        return `.demo {\n  width: 260px;\n  height: 260px;\n  background: linear-gradient(135deg, #6366f1, #a855f7 60%, #06b6d4);\n  -webkit-clip-path: ${cp};\n  clip-path: ${cp};\n}`;
      } });
  },
};
