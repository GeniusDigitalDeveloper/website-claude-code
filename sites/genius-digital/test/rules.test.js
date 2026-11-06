/* =====================================================================
   GENIUS DIGITAL — ujian Firestore Security Rules (Firebase Emulator)
   Cara jalankan (dari folder projek):
     npm i --no-save firebase @firebase/rules-unit-testing firebase-tools
     npx firebase emulators:exec --only firestore --project demo-genius "node test/rules.test.js"
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp, Timestamp } = require('firebase/firestore');

const root = path.join(__dirname, '..');
let passed = 0, failed = 0;
async function check(name, promise) {
  try { await promise; passed++; console.log('  ✔', name); }
  catch (e) { failed++; console.log('  ✘', name, '\n     ', String(e.message || e).split('\n')[0]); }
}

const validProduct = (slug, extra = {}) => ({
  name: 'Produk ' + slug, slug, category: 'Digital Tools', description: 'Penerangan', thumbnailURL: '',
  status: 'active', productURL: '', displayOrder: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra
});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-genius',
    firestore: { rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 }
  });

  // ---------- seed (bypass rules) ----------
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore(), now = Timestamp.now();
    const base = { category: 'Digital Tools', description: '', thumbnailURL: '', productURL: '', displayOrder: 1, createdAt: now, updatedAt: now };
    await setDoc(doc(db, 'products/live'), { ...base, name: 'Live', slug: 'live', status: 'active' });
    await setDoc(doc(db, 'products/soon'), { ...base, name: 'Soon', slug: 'soon', status: 'coming-soon' });
    await setDoc(doc(db, 'products/secret'), { ...base, name: 'Secret', slug: 'secret', status: 'hidden' });
    await setDoc(doc(db, 'other/x'), { a: 1 });
  });

  const anon = env.unauthenticatedContext().firestore();
  const user = env.authenticatedContext('user1', { email_verified: true }).firestore();
  const fakeAdmin = env.authenticatedContext('user2', { admin: 'true' }).firestore();     // string, bukan boolean true
  const admin = env.authenticatedContext('admin1', { admin: true }).firestore();
  const PUBLIC_Q = (db) => query(collection(db, 'products'), where('status', 'in', ['active', 'coming-soon']));

  console.log('\nFirestore — baca');
  await check('awam boleh get produk active', assertSucceeds(getDoc(doc(anon, 'products/live'))));
  await check('awam boleh get produk coming-soon', assertSucceeds(getDoc(doc(anon, 'products/soon'))));
  await check('awam TIDAK boleh get produk hidden', assertFails(getDoc(doc(anon, 'products/secret'))));
  await check('awam boleh query status in [active, coming-soon]', assertSucceeds(getDocs(PUBLIC_Q(anon))));
  await check('awam TIDAK boleh senarai semua produk', assertFails(getDocs(collection(anon, 'products'))));
  await check('awam TIDAK boleh query status == hidden', assertFails(getDocs(query(collection(anon, 'products'), where('status', '==', 'hidden')))));
  await check('pengguna biasa TIDAK boleh get hidden', assertFails(getDoc(doc(user, 'products/secret'))));
  await check('admin palsu (claim string) TIDAK boleh get hidden', assertFails(getDoc(doc(fakeAdmin, 'products/secret'))));
  await check('admin boleh get hidden', assertSucceeds(getDoc(doc(admin, 'products/secret'))));
  await check('admin boleh senarai semua', assertSucceeds(getDocs(collection(admin, 'products'))));
  await check('koleksi lain ditolak (awam)', assertFails(getDoc(doc(anon, 'other/x'))));
  await check('koleksi lain ditolak (admin)', assertFails(getDoc(doc(admin, 'other/x'))));

  console.log('\nFirestore — tulis');
  await check('awam TIDAK boleh create', assertFails(setDoc(doc(anon, 'products/new1'), validProduct('new1'))));
  await check('pengguna biasa TIDAK boleh create', assertFails(setDoc(doc(user, 'products/new1'), validProduct('new1'))));
  await check('claim admin palsu TIDAK boleh create', assertFails(setDoc(doc(fakeAdmin, 'products/new1'), validProduct('new1'))));
  await check('admin boleh create produk sah', assertSucceeds(setDoc(doc(admin, 'products/new1'), validProduct('new1'))));
  await check('admin: slug != ID dokumen ditolak', assertFails(setDoc(doc(admin, 'products/new2'), validProduct('lain'))));
  await check('admin: status tidak sah ditolak', assertFails(setDoc(doc(admin, 'products/new3'), validProduct('new3', { status: 'deleted' }))));
  await check('admin: medan tambahan ditolak', assertFails(setDoc(doc(admin, 'products/new4'), validProduct('new4', { isAdmin: true }))));
  await check('admin: productURL http:// ditolak', assertFails(setDoc(doc(admin, 'products/new5'), validProduct('new5', { productURL: 'http://x.com' }))));
  await check('admin: productURL javascript: ditolak', assertFails(setDoc(doc(admin, 'products/new6'), validProduct('new6', { productURL: 'javascript:alert(1)' }))));
  await check('admin: displayOrder bukan nombor ditolak', assertFails(setDoc(doc(admin, 'products/new7'), validProduct('new7', { displayOrder: '1' }))));
  await check('admin: createdAt dari klien ditolak', assertFails(setDoc(doc(admin, 'products/new8'), validProduct('new8', { createdAt: Timestamp.fromDate(new Date('2020-01-01')) }))));
  await check('admin: nama kosong ditolak', assertFails(setDoc(doc(admin, 'products/new9'), validProduct('new9', { name: '' }))));
  await check('admin: setDoc ke dokumen sedia ada (tulis ganti) ditolak', assertFails(setDoc(doc(admin, 'products/live'), validProduct('live'))));
  await check('awam TIDAK boleh update', assertFails(updateDoc(doc(anon, 'products/live'), { name: 'Hack', updatedAt: serverTimestamp() })));
  await check('pengguna biasa TIDAK boleh update', assertFails(updateDoc(doc(user, 'products/live'), { name: 'Hack', updatedAt: serverTimestamp() })));
  await check('admin boleh update', assertSucceeds(updateDoc(doc(admin, 'products/live'), { name: 'Live 2', status: 'hidden', updatedAt: serverTimestamp() })));
  await check('admin: tukar slug ditolak', assertFails(updateDoc(doc(admin, 'products/soon'), { slug: 'soon-x', updatedAt: serverTimestamp() })));
  await check('admin: ubah createdAt ditolak', assertFails(updateDoc(doc(admin, 'products/soon'), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
  await check('admin: updatedAt mesti masa pelayan', assertFails(updateDoc(doc(admin, 'products/soon'), { name: 'X', updatedAt: Timestamp.fromDate(new Date('2020-01-01')) })));
  await check('awam TIDAK boleh delete', assertFails(deleteDoc(doc(anon, 'products/soon'))));
  await check('pengguna biasa TIDAK boleh delete', assertFails(deleteDoc(doc(user, 'products/soon'))));
  await check('admin boleh delete', assertSucceeds(deleteDoc(doc(admin, 'products/soon'))));

  // ---------- Thumbnail dalam Firestore (tiada Storage) ----------
  console.log('\nFirestore — thumbnail');
  const dataJpeg = (n) => 'data:image/jpeg;base64,' + 'A'.repeat(n);
  await check('admin boleh simpan thumbnail data URL JPEG (~100 KB)', assertSucceeds(setDoc(doc(admin, 'products/img1'), validProduct('img1', { thumbnailURL: dataJpeg(135000) }))));
  await check('admin boleh simpan thumbnail URL https://', assertSucceeds(setDoc(doc(admin, 'products/img2'), validProduct('img2', { thumbnailURL: 'https://example.com/a.jpg' }))));
  await check('admin boleh kosongkan thumbnail (update)', assertSucceeds(updateDoc(doc(admin, 'products/img1'), { thumbnailURL: '', updatedAt: serverTimestamp() })));
  await check('thumbnail data URL > 150000 aksara ditolak', assertFails(setDoc(doc(admin, 'products/img3'), validProduct('img3', { thumbnailURL: dataJpeg(150100) }))));
  await check('thumbnail data:text/html ditolak', assertFails(setDoc(doc(admin, 'products/img4'), validProduct('img4', { thumbnailURL: 'data:text/html;base64,PHNjcmlwdD4=' }))));
  await check('thumbnail data:image/svg+xml ditolak', assertFails(setDoc(doc(admin, 'products/img5'), validProduct('img5', { thumbnailURL: 'data:image/svg+xml;base64,PHN2Zz4=' }))));
  await check('thumbnail http:// ditolak', assertFails(setDoc(doc(admin, 'products/img6'), validProduct('img6', { thumbnailURL: 'http://example.com/a.jpg' }))));
  await check('thumbnail javascript: ditolak', assertFails(setDoc(doc(admin, 'products/img7'), validProduct('img7', { thumbnailURL: 'javascript:alert(1)' }))));
  await check('medan lama thumbnailPath ditolak (tiada Storage)', assertFails(setDoc(doc(admin, 'products/img8'), validProduct('img8', { thumbnailPath: 'products/x.jpg' }))));
  await check('awam boleh baca produk dengan thumbnail data URL', assertSucceeds(getDoc(doc(anon, 'products/img2'))));
  await check('pengguna biasa TIDAK boleh simpan thumbnail', assertFails(setDoc(doc(user, 'products/img9'), validProduct('img9', { thumbnailURL: dataJpeg(100) }))));

  // ---------- Terjemahan produk (BI / BA) ----------
  console.log('\nFirestore — terjemahan');
  await check('admin boleh simpan terjemahan BI + BA', assertSucceeds(setDoc(doc(admin, 'products/tr1'), validProduct('tr1', { nameEn: 'Invoice', categoryEn: 'Business Tools', descriptionEn: 'An invoicing system.', nameAr: 'الفواتير', categoryAr: 'أدوات الأعمال', descriptionAr: 'نظام للفواتير.' }))));
  await check('terjemahan kosong ("") dibenarkan', assertSucceeds(setDoc(doc(admin, 'products/tr2'), validProduct('tr2', { nameEn: '', descriptionAr: '' }))));
  await check('admin boleh kemas kini terjemahan', assertSucceeds(updateDoc(doc(admin, 'products/tr1'), { descriptionEn: 'Updated text.', updatedAt: serverTimestamp() })));
  await check('terjemahan bukan string ditolak', assertFails(setDoc(doc(admin, 'products/tr3'), validProduct('tr3', { nameEn: 123 }))));
  await check('nameEn > 120 aksara ditolak', assertFails(setDoc(doc(admin, 'products/tr4'), validProduct('tr4', { nameEn: 'x'.repeat(121) }))));
  await check('descriptionAr > 1000 aksara ditolak', assertFails(setDoc(doc(admin, 'products/tr5'), validProduct('tr5', { descriptionAr: 'ا'.repeat(1001) }))));
  await check('pengguna biasa TIDAK boleh tulis terjemahan', assertFails(updateDoc(doc(user, 'products/tr1'), { nameEn: 'Hack', updatedAt: serverTimestamp() })));
  await check('awam boleh baca terjemahan', assertSucceeds(getDoc(doc(anon, 'products/tr1'))));

  await env.cleanup();
  console.log(`\n${passed} lulus, ${failed} gagal`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
