// Pembungkus localStorage yang selamat (mod peribadi / kuota penuh tidak memecahkan app).
// Awas: localStorage hanya untuk keutamaan PERIBADI pengguna (bahasa, kegemaran, sejarah).
// Ia BUKAN sumber statistik global.
const PREFIX = 'codelab.';

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(PREFIX + key); } catch { /* abaikan */ } },
};

// ---- Kegemaran, sejarah & penggunaan ----
const listeners = new Set();
export const onUserDataChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => f());

export const favorites = {
  all: () => store.get('favorites', []),
  has: (id) => favorites.all().includes(id),
  toggle(id) {
    const cur = favorites.all();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur];
    store.set('favorites', next); emit();
    return next.includes(id);
  },
};

export const history = {
  all: () => store.get('history', []), // [{id, at}]
  add(id) {
    const cur = history.all().filter((x) => x.id !== id);
    cur.unshift({ id, at: Date.now() });
    store.set('history', cur.slice(0, 50)); emit();
  },
  clear() { store.remove('history'); emit(); },
};

// Kiraan penggunaan PERIBADI (bagi "Alat Popular" tempatan sehingga ada data global).
export const usage = {
  all: () => store.get('usage', {}),
  hit(id) { const u = usage.all(); u[id] = (u[id] || 0) + 1; store.set('usage', u); },
};
