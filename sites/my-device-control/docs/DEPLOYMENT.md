# Deploy ke Interactive Link

Kami tidak mengesahkan runtime Interactive Link, jadi web dibina sebagai **website statik**.

```bash
cd sites/my-device-control/web
cp .env.example .env.local      # isi nilai Firebase (kunci awam sahaja)
npm install
npm run build                   # hasil: web/out/
```
Muat naik **kandungan folder `out/`** ke root hosting Interactive Link. Pastikan:
- `trailingSlash` aktif (URL seperti `/devices/` → `devices/index.html`); jika hosting tidak menyokong folder index, minta tetapan "index document".
- HTTPS aktif; domain ditambah di Firebase Auth → Authorized domains.
- Tiada service account / Admin SDK dalam fail yang dimuat naik.

Selepas muat naik, sahkan sendiri: log masuk, Dashboard memaparkan data, daftar peranti menjana token. Jangan anggap berjaya sebelum diuji.

## Git
Kod berada di repo sedia ada, folder `sites/my-device-control/`. `.env*`, `node_modules`, `out` diabaikan.
