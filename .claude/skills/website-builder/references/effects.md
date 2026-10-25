# Resipi Kesan — Animasi, Glassmorphism, Gradient

Resipi siap guna untuk stack Next.js + Tailwind + Motion (`motion/react`). Setiap resipi juga ada versi CSS biasa supaya boleh diguna dalam stack HTML tunggal.

Pilih 3-5 resipi setiap halaman. Warna di bawah guna CSS variables daripada design system (`--color-primary`, `--color-accent`, `--color-background`, ...). Jangan tukar ke hex mentah.

---

## 0. Asas dalam `globals.css`

Letak sekali sahaja, selepas `@import "tailwindcss";`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

html { scroll-behavior: smooth; }
```

---

## 1. Latar aurora / mesh gradient beranimasi (hero)

```css
.aurora {
  position: absolute;
  inset: -20%;
  z-index: -1;
  background:
    radial-gradient(40% 35% at 20% 30%, color-mix(in oklab, var(--color-primary) 55%, transparent), transparent 70%),
    radial-gradient(35% 30% at 80% 20%, color-mix(in oklab, var(--color-accent) 45%, transparent), transparent 70%),
    radial-gradient(45% 40% at 60% 80%, color-mix(in oklab, var(--color-secondary) 40%, transparent), transparent 70%);
  filter: blur(60px);
  animation: aurora-drift 18s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes aurora-drift {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(-4%, 3%, 0) scale(1.08); }
  100% { transform: translate3d(3%, -2%, 0) scale(1.02); }
}
```

```tsx
<section className="relative isolate overflow-hidden">
  <div aria-hidden className="aurora" />
  {/* kandungan hero */}
</section>
```

## 2. Grid halus + spotlight

```css
.bg-grid {
  background-image:
    linear-gradient(to right, color-mix(in oklab, var(--color-foreground) 8%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--color-foreground) 8%, transparent) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000 40%, transparent 100%);
}
```

Spotlight ikut kursor (komponen client):

```tsx
"use client";
import { useRef } from "react";

export function Spotlight({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty("--x", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className="relative overflow-hidden [background:radial-gradient(600px_circle_at_var(--x,50%)_var(--y,0%),color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_60%)]"
    >
      {children}
    </div>
  );
}
```

## 3. Glass card (glassmorphism)

```tsx
<div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150 transition-transform duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-white/5">
  ...
</div>
```

CSS biasa:

```css
.glass {
  background: rgb(255 255 255 / 0.10);
  border: 1px solid rgb(255 255 255 / 0.20);
  border-radius: 1rem;
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.12);
}
```

Peraturan: glass hanya cantik di atas latar yang berwarna (aurora, gambar, gradient). Atas latar putih kosong ia nampak pudar — tambah aurora di belakang. Semak kontras teks.

## 4. Navbar glass melekat

```tsx
<header className="fixed inset-x-0 top-4 z-50 mx-auto w-[min(1100px,calc(100%-2rem))] rounded-full border border-white/20 bg-[color-mix(in_oklab,var(--color-background)_60%,transparent)] px-5 py-3 backdrop-blur-xl">
  ...
</header>
```

## 5. Headline gradient

```tsx
<h1 className="bg-gradient-to-br from-[var(--color-foreground)] via-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
  ...
</h1>
```

Tailwind v4 juga terima `bg-linear-to-br`; `bg-gradient-to-br` masih berfungsi.

## 6. Reveal perkataan demi perkataan (hero)

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";

export function WordReveal({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <h1 className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block pr-[0.25em]"
          initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </h1>
  );
}
```

## 7. Fade-up + stagger semasa scroll (setiap seksyen)

```tsx
"use client";
import { motion, useReducedMotion } from "motion/react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

Guna: `{features.map((f, i) => <Reveal key={f.title} delay={i * 0.08}>...</Reveal>)}`.

Versi GSAP (HTML tunggal):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script>
  gsap.registerPlugin(ScrollTrigger);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.from(el.children, {
        y: 32, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });
  }
</script>
```

Untuk lebih banyak preset GSAP: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "scroll reveal stagger" --domain gsap`.

## 8. Logo / testimoni marquee

```css
.marquee { display: flex; gap: 3rem; overflow: hidden; mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent); }
.marquee__track { display: flex; gap: 3rem; flex-shrink: 0; min-width: 100%; animation: marquee 30s linear infinite; }
.marquee:hover .marquee__track { animation-play-state: paused; }
@keyframes marquee { to { transform: translateX(calc(-100% - 3rem)); } }
```

```tsx
<div className="marquee">
  {[0, 1].map((k) => (
    <ul key={k} className="marquee__track" aria-hidden={k === 1}>
      {logos.map((l) => <li key={l.name}>{l.svg}</li>)}
    </ul>
  ))}
</div>
```

## 9. Butang dengan shine

```css
.btn-shine { position: relative; overflow: hidden; }
.btn-shine::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgb(255 255 255 / 0.45) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.7s ease;
}
.btn-shine:hover::after { transform: translateX(120%); }
```

```tsx
<a href="#" className="btn-shine inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-on-accent)] shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
  Mula Sekarang
</a>
```

## 10. Border beam (kad beranimasi)

```css
@property --angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
.beam {
  position: relative; border-radius: 1rem;
  background:
    linear-gradient(var(--color-card), var(--color-card)) padding-box,
    conic-gradient(from var(--angle), transparent 70%, var(--color-primary), var(--color-accent), transparent) border-box;
  border: 1px solid transparent;
  animation: beam-spin 6s linear infinite;
}
@keyframes beam-spin { to { --angle: 360deg; } }
```

Sesuai untuk kad harga "Paling Popular".

## 11. Bento grid (features)

```tsx
<div className="grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-3">
  <div className="glass md:col-span-2 md:row-span-2">...</div>
  <div className="glass">...</div>
  <div className="glass">...</div>
  <div className="glass md:col-span-3">...</div>
</div>
```

## 12. Tekstur grain (rasa premium)

```css
.grain::before {
  content: ""; position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

Letak `className="grain"` pada `<body>`.

---

## Gabungan yang disyorkan mengikut gaya

| Gaya | Gabungan |
|---|---|
| SaaS / AI startup | Aurora + grid, headline gradient, word reveal, bento glass, border beam pada pricing |
| Mewah / premium | Grain, latar gelap + satu gradient emas lembut, font serif, reveal perlahan (0.9s) |
| Kafe / F&B / kedai | Gambar besar + overlay gradient, glass card menu, marquee testimoni, butang WhatsApp shine |
| Portfolio kreatif | Spotlight kursor, word reveal besar, bento projek, hover lift |
| Korporat / klinik / guaman | Grid halus sahaja, glass navbar, fade-up perlahan, tiada aurora berwarna terang |
