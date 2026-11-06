// Lapisan data admin. Semua panggilan melalui antara muka ini supaya mudah ditukar kepada Firestore.
// Koleksi Firestore yang dirancang (lihat /firebase/firestore.rules):
//   users/{uid}               { displayName, email, status: 'active'|'suspended', role, createdAt }
//   config/site               { name, logo, slogan, footer, languages[], defaultLang, maintenance }
//   config/tools              { disabled: [toolId, ...] }
//   content/{key}_{lang}      { text, updatedAt }
//   activity/{autoId}         { at, type, actor, detail }
//   stats_daily/{YYYY-MM-DD}  { visits, toolUses: { [toolId]: n } }
//   stats_monthly/{YYYY-MM}   { visits }
//   stats/total               { visits, registeredUsers }
import { loadSummary } from '../statistics/stats.js';

export class NullAdminData {
  get connected() { return false; }
  async summary() { return loadSummary(); }
  async listUsers() { return []; }
  async listActivity() { return []; }
  async dailySeries(/* days */) { return null; }          // [{ key:'2026-11-06', visits: n }, ...]
  async toolUsage() { return null; }                       // [{ id, count }]
  async saveSettings() { throw new Error('not-connected'); }
  async saveToolConfig() { throw new Error('not-connected'); }
  async saveContent() { throw new Error('not-connected'); }
  async setUserStatus() { throw new Error('not-connected'); }
}
export const adminData = new NullAdminData();
