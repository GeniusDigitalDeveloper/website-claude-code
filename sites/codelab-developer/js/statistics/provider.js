// Kontrak penyedia statistik. Kod UI hanya bercakap dengan antara muka ini — tukar penyedia
// (NullProvider → FirebaseProvider) tanpa mengubah UI.
//
// Bentuk data (Firestore, fasa akan datang):
//   stats/total                 { visits: number, registeredUsers: number }
//   stats_daily/{YYYY-MM-DD}    { visits: number }      ← kunci waktu Malaysia → reset automatik jam 00:00 MYT
//   stats_monthly/{YYYY-MM}     { visits: number }      ← reset automatik pada hari pertama bulan baharu
//
// Setiap penyedia mesti melaksanakan:
//   async getSummary()   → { registeredUsers, today, month, total }   (nombor, atau null jika tiada data)
//   async recordVisit()  → catat satu lawatan (sekali sehari setiap pelayar; dikawal oleh stats.js)
//   get connected()      → boolean
//   get name()           → string

export class NullProvider {
  get name() { return 'none'; }
  get connected() { return false; }
  async getSummary() { return { registeredUsers: null, today: null, month: null, total: null }; }
  async recordVisit() { /* tiada pangkalan data — tidak ada apa-apa dicatat */ }
}
