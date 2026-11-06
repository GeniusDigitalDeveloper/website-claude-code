// Penyedia statistik Firebase (Firestore). Projek: GENIUS DIGITAL (dikongsi) — semua koleksi CodeLab
// menggunakan awalan `codelab_` supaya tidak berlanggar dengan aplikasi lain dalam projek yang sama.
//
//   codelab_stats/total                { visits, registeredUsers? }
//   codelab_stats_daily/{YYYY-MM-DD}   { visits }   ← kunci waktu Malaysia → reset automatik 00:00 MYT
//   codelab_stats_monthly/{YYYY-MM}    { visits }   ← kunci bulan waktu Malaysia
import { dayKey, monthKey } from './kl-time.js';

export class FirebaseProvider {
  constructor(config, bundle = '../../assets/vendor/firebase-firestore.bundle.js') { this.config = config; this.bundle = bundle; this._ready = null; this._on = false; }
  get name() { return 'firebase'; }
  get connected() { return this._on; }

  init() {
    this._ready ||= (async () => {
      const m = await import(/* @vite-ignore */ new URL(this.bundle, import.meta.url).href);
      this.m = m;
      this.app = m.getApps().find((a) => a.name === 'codelab') || m.initializeApp(this.config, 'codelab');
      this.db = m.getFirestore(this.app);
      this._on = true;
    })();
    return this._ready;
  }

  async getSummary() {
    await this.init();
    const { doc, getDoc } = this.m;
    const [total, day, month] = await Promise.all([
      getDoc(doc(this.db, 'codelab_stats', 'total')),
      getDoc(doc(this.db, 'codelab_stats_daily', dayKey())),
      getDoc(doc(this.db, 'codelab_stats_monthly', monthKey())),
    ]);
    return {
      registeredUsers: total.data()?.registeredUsers ?? 0,
      today: day.data()?.visits ?? 0,
      month: month.data()?.visits ?? 0,
      total: total.data()?.visits ?? 0,
    };
  }

  /** Senarai id alat yang dinyahaktifkan admin (dokumen awam codelab_config/tools). */
  async getDisabledTools() {
    await this.init();
    const s = await this.m.getDoc(this.m.doc(this.db, 'codelab_config', 'tools'));
    return (s.exists() && Array.isArray(s.data().disabled)) ? s.data().disabled : [];
  }

  /** +1 atomik pada tiga dokumen (Security Rules hanya benarkan kenaikan +1 pada medan visits). */
  async recordVisit() {
    await this.init();
    const { doc, writeBatch, increment } = this.m;
    const b = writeBatch(this.db);
    for (const ref of [['codelab_stats', 'total'], ['codelab_stats_daily', dayKey()], ['codelab_stats_monthly', monthKey()]]) {
      b.set(doc(this.db, ...ref), { visits: increment(1) }, { merge: true });
    }
    await b.commit();
  }
}
