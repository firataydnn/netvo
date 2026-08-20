// ============================================================================
//  KAYNAK ENVANTERİ — provenance defteri
//
//  Ne yapar: Commera_Site.html'deki HER pazaryerinin kaynağını (URL, tarih,
//  güven katmanı) okur; her birine bir run_id + arşiv-durumu ekler ve
//  factory/kaynak_envanteri.json'a yazar. Arşiv kopyası eksik olanları listeler.
//
//  Neden: "bu %18 nereden geldi?" sorusunun cevabı bu defterdedir. URL ölse
//  bile factory/arsiv/ altındaki kopya kanıttır.
//
//  Çalıştır: node factory/kaynak_envanteri.mjs
// ============================================================================
import fs from "fs";

const KOK = new URL("../", import.meta.url).pathname;
const HTML = fs.readFileSync(KOK + "Commera_Site.html", "utf8");
const ARSIV = KOK + "factory/arsiv/";

// --- Siteyi güvenli DOM-stub ile çalıştırıp MK + provOf'u al (regex değil) ---
function siteyiOku() {
  const code = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
  const El = () => { const e = { style:{}, dataset:{}, classList:{add(){},remove(){},toggle:()=>false,contains:()=>false}, children:[] };
    e.appendChild=()=>{}; e.setAttribute=()=>{}; e.getAttribute=()=>""; e.removeAttribute=()=>{}; e.addEventListener=()=>{};
    e.querySelector=()=>El(); e.querySelectorAll=()=>[]; e.insertAdjacentHTML=()=>{}; e.focus=()=>{}; e.remove=()=>{};
    Object.defineProperty(e,"innerHTML",{set(){},get:()=>""}); Object.defineProperty(e,"textContent",{set(){},get:()=>""});
    Object.defineProperty(e,"value",{set(){},get:()=>"trendyol"}); e.files=[]; return e; };
  const doc = { _e:{}, getElementById(){return El();}, querySelector:()=>El(), querySelectorAll:()=>[],
    createElement:()=>El(), createElementNS:()=>El(), body:El(), head:El(), documentElement:El(), addEventListener(){}, title:"" };
  const win = { addEventListener(){}, location:{hash:""}, matchMedia:()=>({matches:false,addEventListener(){}}), scrollTo(){} };
  const ls = { getItem:()=>null, setItem(){}, removeItem(){} };
  const fn = new Function("document","window","localStorage","location","navigator","matchMedia","setTimeout","addEventListener","URL","Blob","FileReader","requestAnimationFrame","alert","toast","console",
    code + "\nreturn {MK, CO, provOf};");
  return fn(doc, win, ls, win.location, {language:"tr"}, win.matchMedia, f=>{try{f()}catch(e){}}, ()=>{},
    {createObjectURL:()=>"x",revokeObjectURL(){}}, function(){}, function(){}, f=>f&&f(), ()=>{}, ()=>{}, console);
}

const { MK, CO, provOf } = siteyiOku();

// --- Arşivde hangi dosyalar var? ---
const arsivVar = fs.existsSync(ARSIV) ? fs.readdirSync(ARSIV).filter(f => !f.startsWith("README")) : [];
const arsivKopyasi = key => arsivVar.filter(f => f.startsWith(key + "-")).sort().pop() || null;

// --- Defteri kur ---
const RUN = "run-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");
const kayitlar = [];
for (const k of Object.keys(MK)) {
  const m = MK[k], p = provOf(k), co = CO[m.co] || {};
  kayitlar.push({
    key: k,
    ad: m.n,
    ulke: co.n || m.co,
    kaynak_url: m.source || null,
    kaynak_ad: m.sourceLabel || null,
    dogrulama_tarihi: m.verified || null,
    guven: p.tier,                              // verified / unverified / stale / estimate / expired
    kdv_kurali: m.comVatIncl ? "KDV_dahil" : "KDV_haric",
    matrah: m.base === "net" ? "KDV_haric_fiyat" : "KDV_dahil_fiyat",
    arsiv_kopyasi: arsivKopyasi(k),             // factory/arsiv/ altındaki dosya (yoksa null)
    run_id: RUN,
  });
}

// --- Öncelik: kaynağı VAR (doğrulanmış/referans) ama arşiv kopyası YOK olanlar ---
const kaynakli = kayitlar.filter(x => x.kaynak_url);
const arsivEksik = kaynakli.filter(x => !x.arsiv_kopyasi);
const dogrulanmis = kayitlar.filter(x => x.guven === "verified");
const dogrulanmisArsivEksik = dogrulanmis.filter(x => !x.arsiv_kopyasi);

const defter = {
  run_id: RUN,
  uretim: new Date().toISOString(),
  ozet: {
    toplam_pazaryeri: kayitlar.length,
    kaynagi_olan: kaynakli.length,
    dogrulanmis: dogrulanmis.length,
    arsiv_kopyasi_olan: kayitlar.filter(x => x.arsiv_kopyasi).length,
    arsiv_eksik_kaynakli: arsivEksik.length,
  },
  kayitlar,
};
fs.writeFileSync(KOK + "factory/kaynak_envanteri.json", JSON.stringify(defter, null, 1));

// --- Rapor ---
console.log(`\n═══ KAYNAK ENVANTERİ · ${RUN} ═══`);
console.log(`toplam pazaryeri     : ${defter.ozet.toplam_pazaryeri}`);
console.log(`kaynağı olan         : ${defter.ozet.kaynagi_olan}`);
console.log(`doğrulanmış (verified): ${defter.ozet.dogrulanmis}`);
console.log(`arşiv kopyası olan   : ${defter.ozet.arsiv_kopyasi_olan}`);
console.log(`\n⚠ ARŞİV KOPYASI EKSİK — DOĞRULANMIŞ oranlar (önce bunlar):`);
if (!dogrulanmisArsivEksik.length) console.log("  (yok — hepsi arşivli 🎉)");
dogrulanmisArsivEksik.forEach(x =>
  console.log(`  ○ ${x.key.padEnd(16)} ${String(x.ad).slice(0,22).padEnd(24)} → ${x.kaynak_url || "URL yok"}`));
console.log(`\nKaynağı olup arşivi eksik TÜM kayıtlar: ${arsivEksik.length}`);
console.log(`Defter yazıldı: factory/kaynak_envanteri.json`);
console.log(`Kopyaları koyacağın yer: factory/arsiv/<key>-<YYYY-MM-DD>.pdf|png\n`);
