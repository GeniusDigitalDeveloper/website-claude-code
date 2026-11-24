// Rakam paparan sebenar (data live Firebase) untuk buku preview.
// Guna: node buku/snap.js  (perlu server di http://localhost:8765 berakar di folder site)
const {chromium}=require('playwright');const path=require('path');
const out=path.join(__dirname,'snap');require('fs').mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();
for(const [k,f] of [['awam','panel-awam.html'],['admin','portal-admin.html']]){
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.goto('http://localhost:8765/'+f,{waitUntil:'networkidle',timeout:90000}).catch(()=>{});
  await p.waitForTimeout(12000);
  // scroll perlahan supaya gambar lazy-load & animasi reveal muncul
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,250));}window.scrollTo(0,0);});
  await p.waitForTimeout(3000);
  const h=await p.evaluate(()=>document.documentElement.scrollHeight);
  await p.screenshot({path:path.join(out,k+'.jpg'),fullPage:true,type:'jpeg',quality:70});
  console.log(k,'height',h);
}
await b.close();})();
