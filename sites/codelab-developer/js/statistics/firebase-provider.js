// PLACEHOLDER — Penyedia Firebase (belum diaktifkan). Lihat /firebase/README.md.
//
// Cara mengaktifkan (fasa akan datang):
//  1. Cipta projek Firebase (pelan Spark percuma), aktifkan Firestore + Authentication.
//  2. Salin firebase/firebase-config.example.js → firebase/firebase-config.js dan isi konfigurasi web
//     (konfigurasi web Firebase BUKAN rahsia; keselamatan dikawal oleh Security Rules).
//  3. Deploy firebase/firestore.rules.
//  4. Dalam js/statistics/stats.js tukar `new NullProvider()` kepada `new FirebaseProvider(config)`.
//  5. Buang `throw` di bawah dan gunakan SDK modular (CDN gstatic atau npm).
//
// Kod rujukan di bawah menunjukkan struktur sebenar yang dijangka; ia sengaja belum dijalankan.
import { dayKey, monthKey } from './kl-time.js';

export class FirebaseProvider {
  constructor(config) { this.config = config; }
  get name() { return 'firebase'; }
  get connected() { return false; } // tukar kepada true selepas disambung

  async init() {
    throw new Error('FirebaseProvider belum diaktifkan. Lihat firebase/README.md');
    // const { initializeApp } = await import('https://www.gstatic.com/firebasejs/<versi>/firebase-app.js');
    // const fs = await import('https://www.gstatic.com/firebasejs/<versi>/firebase-firestore.js');
    // this.db = fs.getFirestore(initializeApp(this.config)); this.fs = fs;
  }

  async getSummary() {
    // const { doc, getDoc } = this.fs;
    // const [total, day, month] = await Promise.all([
    //   getDoc(doc(this.db, 'stats', 'total')),
    //   getDoc(doc(this.db, 'stats_daily', dayKey())),      // kunci hari Malaysia
    //   getDoc(doc(this.db, 'stats_monthly', monthKey())),  // kunci bulan Malaysia
    // ]);
    // return {
    //   registeredUsers: total.data()?.registeredUsers ?? 0,
    //   today: day.data()?.visits ?? 0,
    //   month: month.data()?.visits ?? 0,
    //   total: total.data()?.visits ?? 0,
    // };
    void dayKey; void monthKey;
    throw new Error('not-connected');
  }

  async recordVisit() {
    // Gunakan increment() atomik pada tiga dokumen dalam satu writeBatch:
    //   stats/total.visits, stats_daily/{dayKey()}.visits, stats_monthly/{monthKey()}.visits
    // Security Rules mesti mengehadkan penulisan kepada +1 sahaja (lihat firestore.rules).
    throw new Error('not-connected');
  }
}
