// ============================================================================
//  NETVO VERİ FABRİKASI — tazelik & yenileme pipeline'ı
//
//  HENDEK = doğrulanmış TAZE veri. Bu script, hangi oranların bayatladığını
//  tespit eder, ÖNEMİNE göre önceliklendirir (büyük pazaryeri × bayatlık) ve
//  bir yenileme iş listesi üretir. Böylece tek kişi 136 pazaryerini
//  "neyi önce" bilerek döndürür.
//
//  DÜRÜSTLÜK/BÜTÜNLÜK: Bu script oranları OTOMATİK DEĞİŞTİRMEZ. Sadece TESPİT +
//  ÖNCELİK + İZLEME yapar. Login-duvarı ardındaki oranın gerçek doğrulaması ve
//  arşivlenmesi insanda kalır — provenance'ın anlamı budur.
//
//  Çalıştır: node factory/tazelik.mjs
//  Çıktı   : factory/tazelik_raporu.json + ekran raporu
// ============================================================================
import fs from "fs";
const KOK = new URL("../", import.meta.url).pathname;
const HTML = fs.readFileSync(KOK + "Commera_Site.html", "utf8");

function siteyiOku(){
  const code=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
  const El=()=>{const e={style:{},dataset:{},classList:{add(){},remove(){},toggle:()=>false,contains:()=>false},children:[]};
    ["appendChild","setAttribute","removeAttribute","addEventListener","insertAdjacentHTML","focus","remove"].forEach(f=>e[f]=()=>{});
    e.getAttribute=()=>""; e.querySelector=()=>El(); e.querySelectorAll=()=>[];
    Object.defineProperty(e,"innerHTML",{set(){},get:()=>""});Object.defineProperty(e,"textContent",{set(){},get:()=>""});
    Object.defineProperty(e,"value",{set(){},get:()=>"trendyol"});e.files=[];return e;};
  const doc={getElementById:()=>El(),querySelector:()=>El(),querySelectorAll:()=>[],createElement:()=>El(),createElementNS:()=>El(),body:El(),head:El(),documentElement:El(),addEventListener(){},title:""};
  const win={addEventListener(){},location:{hash:"",search:""},matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){}};
  const fn=new Function("document","window","localStorage","location","navigator","matchMedia","setTimeout","addEventListener","URL","Blob","FileReader","requestAnimationFrame","alert","toast","console",
    code+"\nreturn {MK, CO, provOf};");
  return fn(doc,win,{getItem:()=>null,setItem(){},removeItem(){}},win.location,{language:"tr"},win.matchMedia,f=>{try{f()}catch(e){}},()=>{},{createObjectURL:()=>"x",revokeObjectURL(){}},function(){},function(){},f=>f&&f(),()=>{},()=>{},console);
}
const { MK, CO, provOf } = siteyiOku();

// En çok satılan / önemli pazaryerleri — önceliklendirme ağırlığı
const MAJOR = new Set(["trendyol","hepsiburada","amazontr","amazonus","amazonde","amazonuk","amazonfr","amazonit","amazones","n11","ebayus","ebayuk","etsy","mercadolibre","allegro","shopee","coupang","noon","flipkart","rakuten","walmart","bol","otto","cdiscount","zalando"]);

// tier → aciliyet ağırlığı (yüksek = daha acil)
const TIER_W = { expired:100, estimate:80, unverified:55, stale:50, verified:0 };

const kayit = [];
for (const k of Object.keys(MK)){
  const m = MK[k], p = provOf(k), co = CO[m.co]||{};
  const major = MAJOR.has(k);
  const tw = TIER_W[p.tier] ?? 40;
  // öncelik puanı: aciliyet × önem (büyük pazaryeri 2x)
  const oncelik = tw * (major ? 2 : 1);
  kayit.push({ key:k, ad:m.n, ulke:co.n||m.co, major, tier:p.tier, yas:p.age,
    kaynak:m.source||null, dogrulama:m.verified||null, oncelik });
}
kayit.sort((a,b)=>b.oncelik-a.oncelik);

const acil   = kayit.filter(x=>x.oncelik>=100);            // büyük+bayat / expired / estimate
const yakinda= kayit.filter(x=>x.oncelik>0 && x.oncelik<100);
const iyi    = kayit.filter(x=>x.oncelik===0);             // verified & taze

const ozet = {
  uretim: new Date().toISOString(),
  toplam: kayit.length,
  taze_verified: iyi.length,
  yenileme_gerek: kayit.length - iyi.length,
  acil_is: acil.length,
  buyuk_pazaryeri_bayat: kayit.filter(x=>x.major && x.tier!=="verified").length,
};
const rapor = { ozet, is_listesi: kayit };
fs.writeFileSync(KOK+"factory/tazelik_raporu.json", JSON.stringify(rapor,null,1));

// --- ekran raporu ---
const line = x => `  ${x.major?"★":"·"} ${x.key.padEnd(15)} ${String(x.ad).slice(0,20).padEnd(22)} [${x.tier}${x.yas!=null?"/"+x.yas+"g":""}] ${x.kaynak?"":"(kaynak yok)"}`;
console.log(`\n═══ NETVO VERİ TAZELİĞİ ═══`);
console.log(`toplam pazaryeri        : ${ozet.toplam}`);
console.log(`taze & doğrulanmış      : ${ozet.taze_verified}`);
console.log(`yenileme gerektiren     : ${ozet.yenileme_gerek}`);
console.log(`büyük pazaryeri bayat   : ${ozet.buyuk_pazaryeri_bayat}  ← önce bunlar`);
console.log(`\n▲ ACİL İŞ (öncelik ≥100 — büyük ve/veya expired/estimate):  ${acil.length}`);
acil.slice(0,25).forEach(x=>console.log(line(x)));
if(acil.length>25) console.log(`  … +${acil.length-25} daha (rapor JSON'da)`);
console.log(`\n○ Sıradaki (yakında): ${yakinda.length}   ✓ Taze: ${iyi.length}`);
console.log(`\nRapor: factory/tazelik_raporu.json`);
console.log(`Kural: bu script oranı DEĞİŞTİRMEZ. Doğrula → siteye gir → factory/arsiv/ altına kanıt koy.\n`);
