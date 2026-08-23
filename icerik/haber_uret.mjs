// ============================================================================
//  NETVO İÇERİK MOTORU v2 — e-ticaret haber/blog tarayıcı + 6 dile çeviri
//
//  Amaç: Netvo'yu iyi bir E-TİCARET HABER/BLOG sitesi yapmak.
//  Akış: RSS (İngilizce) tara → aday havuzu → HER aday için LLM'e SOR:
//    (1) Bu, e-ticaret / online perakende / pazaryeri / dijital ticaret
//        dünyasını takip eden bir okurun ilgisini çeken GERÇEK bir haber mi?
//    (2) Alakalıysa iyi bir haber metni yaz ve tr/en/de/fr/es/it'ye ÇEVİR.
//  Alakasızsa (tıbbi/sanayi/genel siyaset/borsa/alakasız kurumsal) YAYINLAMA.
//  Anahtar yoksa / LLM hatasıysa YAYINLAMA — çöp/İngilizce içerik markayı yer.
//
//  Çalıştır: node icerik/haber_uret.mjs            (ANTHROPIC_API_KEY gerekli)
//  Kuru tur: node icerik/haber_uret.mjs --dry
// ============================================================================
import fs from "fs";

const KOK = new URL("./", import.meta.url).pathname;
const OUT = KOK + "haberler.json";
const DRY = process.argv.includes("--dry");
const MAX_PUBLISH   = 3;   // günde en fazla yayınlanan haber
const MAX_LLM_CALLS = 8;   // maliyet tavanı
const KEEP = 80;
const LANGS = ["tr","en","de","fr","es","it"];
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "claude-haiku-4-5-20251001";

const SOURCES = [
  "https://www.ecommercebytes.com/rss.xml",
  "https://www.retaildive.com/feeds/news/",
  "https://techcrunch.com/tag/e-commerce/feed/",
  "https://www.digitalcommerce360.com/feed/",
  "https://www.modernretail.co/feed/",
  "https://tamebay.com/feed",
];

// Ön eleme (ucuz): e-ticaret dünyasıyla açıkça ilgili aday sinyalleri.
// Geniş tut — asıl alaka kararını LLM verir; bu sadece havuzu daraltır.
const PRE = /\b(e-?commerce|online (retail|shopping|store|seller|sales)|marketplace|retail(er)?|d2c|dtc|social commerce|dropship|fulfillment|last-?mile|logistics|shipping|checkout|payment|BNPL|VAT|GST|tariff|de ?minimis|customs|cross-?border|commission|seller fee|listing|Amazon|eBay|Etsy|Shopify|Temu|Shein|TikTok Shop|Trendyol|Hepsiburada|Shopee|Lazada|Mercado ?Libre|Allegro|Coupang|Noon|Flipkart|Walmart|Zalando|Vinted|Wildberries|Ozon|Alibaba|AliExpress)\b/i;

function parseRSS(xml){
  const items=[];
  for(const m of xml.matchAll(/<item[\s\S]*?<\/item>/gi)){
    const b=m[0];
    const pick=(tag)=>{ const r=new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)<\\/"+tag+">","i").exec(b); if(!r)return "";
      return r[1].replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g,"").replace(/&#\d+;|&\w+;/g," ").trim(); };
    const title=pick("title"), link=pick("link"), desc=pick("description"), date=pick("pubDate");
    if(title) items.push({title, link, desc:desc.slice(0,600), date});
  }
  return items;
}
async function fetchSource(url){
  try{ const r=await fetch(url,{headers:{"user-agent":"NetvoBot/1.0"}}); if(!r.ok)return [];
    return parseRSS(await r.text()).map(i=>({...i, source:url})); }
  catch(e){ console.error("kaynak atlandı:",url,e.message); return []; }
}
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function loadExisting(){ try{ return JSON.parse(fs.readFileSync(OUT,"utf8")); }catch(e){ return []; } }
function fmtDate(d){ const t=Date.parse(d); const dt=isFinite(t)?new Date(t):new Date();
  const ay=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  return dt.getDate()+" "+ay[dt.getMonth()]+" "+dt.getFullYear(); }

// --- LLM: e-ticaret alaka kontrolü + iyi haber metni + 6 dile çeviri ---
async function evaluate(raw){
  const sys = "Sen Netvo'nun haber editörüsün. Netvo, e-ticaret dünyasının güncel gelişmelerini sade, doğru ve kaynaklı aktaran bir HABER/BLOG platformudur (iyi gazetecilik; tıklama tuzağı ve abartı yasak).";
  const usr =
`Aşağıdaki İngilizce haberi değerlendir.

ADIM 1 — ALAKA: Bu, E-TİCARET / online perakende / pazaryeri / dijital ticaret dünyasını takip eden bir okurun ilgisini çeken GERÇEK bir haber mi? Şunlar "relevant=true": pazaryeri ve platform hamleleri (açılış/kapanış/özellik), komisyon/ücret/politika değişiklikleri, ödeme ve BNPL, lojistik/kargo/fulfillment, sınır ötesi ticaret ve gümrük/vergi (KDV/GST/tarife/de-minimis), sosyal ticaret ve canlı satış, D2C/DTC markaları, yapay zeka/otomasyonun ticarete etkisi, büyük oyuncuların (Amazon, Shopify, Temu, Trendyol vb.) stratejileri, sektör verileri/trendleri.
Şunlar "relevant=false": tıbbi/ilaç/sanayi haberleri, e-ticaretle ilgisiz kurumsal finans/borsa, genel siyaset, magazin, e-ticaretle bağı olmayan perakende.

ADIM 2 — Sadece relevant=true ise: İYİ bir haber metni yaz (düz, bilgilendirici gazetecilik; "satıcının marjı" gibi zorlama kalıplar KULLANMA) ve ALTI DİLE çevir (tr,en,de,fr,es,it). Her dil için: t (başlık, <=90 karakter, net), d (tek cümle spot/özet), body (3-4 cümle: ne oldu, kim/nerede, neden önemli). Kaynak linkini body'ye KOYMA.

SADECE şu JSON'u döndür (başka metin yok):
{"relevant":true|false,"reason":"...","category":"pazar|reg|global|reklam|lojistik","region":"Türkiye|ABD|AB|Global|SEA|Çin S.Ötesi|Rusya|Körfez|LatAm|Hindistan|...","i18n":{"tr":{"t":"","d":"","body":""},"en":{...},"de":{...},"fr":{...},"es":{...},"it":{...}}}

Kategori kılavuzu: pazar=pazaryeri/platform, reg=regülasyon/vergi/gümrük, global=sınır ötesi/genel, reklam=pazarlama/reklam, lojistik=kargo/depo/teslimat.

HABER BAŞLIK: ${raw.title}
ÖZET: ${raw.desc}`;
  const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
    headers:{"content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:MODEL,max_tokens:1800,system:sys,messages:[{role:"user",content:usr}]})});
  if(!r.ok) throw new Error("api "+r.status+" "+(await r.text()).slice(0,200));
  const j=await r.json();
  const txt=(j.content&&j.content[0]&&j.content[0].text)||"";
  const obj=JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}")+1));
  return obj;
}
function valid(obj){
  if(!obj || obj.relevant!==true || !obj.i18n) return false;
  for(const l of LANGS){ const x=obj.i18n[l]; if(!x||!x.t||!x.d||!x.body) return false; }
  return true;
}

async function main(){
  if(!API_KEY){ console.log("ANTHROPIC_API_KEY yok → yayınlama yok (kalite kuralı: çöp basma)."); return; }
  const existing=loadExisting();
  const seen=new Set(existing.map(x=>norm(x.src||"")).concat(
    existing.flatMap(x=>x.i18n?LANGS.map(l=>norm((x.i18n[l]||{}).t)):[norm(x.t)])));

  let pool=[];
  for(const s of SOURCES) pool=pool.concat(await fetchSource(s));
  const cand=pool
    .filter(i=>PRE.test(i.title+" "+i.desc))
    .filter(i=>!seen.has(norm(i.link)) && !seen.has(norm(i.title)))
    .filter((i,ix,arr)=>arr.findIndex(y=>norm(y.title)===norm(i.title))===ix)
    .slice(0, MAX_LLM_CALLS);

  if(!cand.length){ console.log("Ön elemeden geçen yeni aday yok."); return; }

  const written=[]; let calls=0;
  for(const raw of cand){
    if(written.length>=MAX_PUBLISH) break;
    if(calls>=MAX_LLM_CALLS) break;
    calls++;
    try{
      const obj=await evaluate(raw);
      if(!obj || obj.relevant!==true){ console.log("ELENDİ (e-ticaret dışı):", raw.title.slice(0,70)); continue; }
      if(!valid(obj)){ console.log("ELENDİ (eksik çeviri):", raw.title.slice(0,70)); continue; }
      const src=raw.link||raw.source;
      const kaynakSoz={tr:"Kaynak",en:"Source",de:"Quelle",fr:"Source",es:"Fuente",it:"Fonte"};
      const i18n={};
      for(const l of LANGS){ const x=obj.i18n[l];
        i18n[l]={ t:String(x.t).slice(0,120), d:String(x.d).slice(0,240),
          body:String(x.body)+`\n\n${kaynakSoz[l]}: ${src}` }; }
      written.push({ c:["pazar","reg","global","reklam","lojistik"].includes(obj.category)?obj.category:"global",
        dt:fmtDate(raw.date), tag:obj.region||"Global", src, auto:true, i18n });
      console.log("YAYINA UYGUN:", i18n.tr.t);
    }catch(e){ console.error("değerlendirme hatası, atlandı:", e.message); }
  }

  if(!written.length){ console.log(`${calls} aday değerlendirildi; yayına değer yeni haber çıkmadı.`); return; }
  if(DRY){ console.log("--- DRY RUN ---"); written.forEach(w=>console.log(`• [${w.c}/${w.tag}] TR: ${w.i18n.tr.t}  |  EN: ${w.i18n.en.t}`)); return; }
  const out=[...written, ...existing].slice(0, KEEP);
  fs.writeFileSync(OUT, JSON.stringify(out,null,1));
  console.log(`${written.length} çok dilli haber eklendi → haberler.json (toplam ${out.length}).`);
}
main();
