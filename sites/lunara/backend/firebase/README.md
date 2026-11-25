# Deploy LUNARA MUSIC ke projek Firebase dikongsi (genius-digital-40bc9)

PENTING: `firestore.rules` di sini ialah rules **seluruh projek** (7+ app). Sebelum deploy rules, sentiasa ambil rules
aktif terkini dari projek dan tambah blok LUNARA (`../security-rules/lunara-firestore.block.rules`) di hujung sahaja.

```bash
cd ../../apps/web && npm run build && rm -rf ../../backend/firebase/public && cp -r out ../../backend/firebase/public
cd ../../backend/firebase
firebase deploy --only hosting:lunara-music   # https://lunara-music.web.app
firebase deploy --only firestore:rules        # selepas gabung rules terkini
```
Cloud Functions (`../functions`) tidak di-deploy: e-mel reset guna e-mel Firebase lalai sehingga SMTP disediakan.
