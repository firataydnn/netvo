// ============================================================================
//  NETVO İÇERİK MOTORU — günlük e-ticaret haber tarayıcı
//
//  Ne yapar: RSS/haber kaynaklarını tarar → satıcının PARASINI etkileyen
//  haberleri filtreler → tekrarı ayıklar → marka tonunda (kaynak+tarih+marj
//  etkisi) kısa metin yazar → icerik/haberler.json'a ekler.
//
//  DÜRÜSTLÜK KURALI: günde 0–2 GERÇEK haber. Alaka eşiğini geçmeyeni YAYINLAMA.
//  Dolgu içerik markayı ve SEO'yu öldürür.
//
//  Çalıştır (yerel test):  node icerik/haber_uret.mjs --dry
//  Production (GitHub Actions): node icerik/haber_uret.mjs   (ANTHROPIC_API_KEY set)
// ============================================================================
import fs from "fs";

const KOK = new URL("./", import.meta.url).pathname;
const OUT = KOK + "haberler.json";
const DRY = process.argv.includes("--dry");
const MAX_PER_RUN = 2;              // günde en fazla 2
const KEEP = 60;                    // dosyada tutulan en fazla haber
const API_KEY = process.env.ANTHROPIC_API_KEY || "";

// --- Kaynaklar (RSS). Genişletmek için ekle. ---
const SOURCES = [
  "https://www.ecommercebytes.com/rss.xml",
  "https://www.retaildive.com/feeds/news/",
  "https://techcrunch.com/tag/e-commerce/feed/",
  "https://www.digitalcommerce360.com/feed/",
];

// --- Alaka filtresi: satıcının parasını/kararını etkileyen konular ---
const KW = /\b(commission|fee|fees|seller fee|referral fee|take rate|payout|marketplace|VAT|GST|tariff|de minimis|customs|duty|payment fee|listing fee|Amazon|eBay|Etsy|Shopify|Temu|Shein|TikTok Shop|Trendyol|Hepsiburada|Shopee|Lazada|Mercado|Allegro|Coupang|Noon|Flipkart)\b/i;
const MONEY = /\b(fee|commission|VAT|GST|tariff|customs|duty|percent|%|price|cost|charge|raise|increase|cut|payout|take rate)\b/i;

// --- kategori tahmini ---
function guessCat(t){ const s=t.toLowerCase();
  if(/vat|gst|tariff|customs|duty|de minimis|regulat|law|tax/.test(s)) return "reg";
  if(/amazon|ebay|etsy|shopee|lazada|trendyol|temu|tiktok|mercado|allegro|coupang|noon|flipkart|marketplace/.test(s)) return "pazar";
  return "global"; }
function guessTag(t){ const s=t.toLowerCase();
  const m=[["Türkiye",/trendyol|hepsiburada|türkiye|turkey/],["ABD",/\bus\b|u\.s\.|amerika|walmart/],["AB",/\beu\b|europe|avrupa|german|france|spain|italy/],
    ["Brezilya",/brazil|brezilya|mercado/],["SEA",/shopee|lazada|singapore|malaysia|vietnam|thailand|indonesia/],["Çin S.Ötesi",/temu|shein|aliexpress|china/]];
  for(const [tag,rx] of m) if(rx.test(s)) return tag; return "Global"; }

// --- basit RSS ayrıştırıcı (regex; bağımlılık yok) ---
function parseRSS(xml){
  const items=[];
  for(const m of xml.matchAll(/<item[\s\S]*?<\/item>/gi)){
    const b=m[0];
    const pick=(tag)=>{ const r=new RegExp("<"+tag+"[^>]*>([\\s\\S]*?)<\\/"+tag+">","i").exec(b); if(!r)return "";
      return r[1].replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g,"").trim(); };
    const title=pick("title"), link=pick("link"), desc=pick("description"), date=pick("pubDate");
    if(title) items.push({title, link, desc, date});
  }
  return items;
}

async function fetchSource(url){
  try{ const r=await fetch(url,{headers:{"user-agent":"NetvoBot/1.0"}}); if(!r.ok)return []; const x=await r.text(); return parseRSS(x).map(i=>({...i, source:url})); }
  catch(e){ console.error("kaynak atlandı:",url,e.message); return []; }
}

const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function loadExisting(){ try{ return JSON.parse(fs.readFileSync(OUT,"utf8")); }catch(e){ return []; } }

// --- marka tonunda metin: LLM varsa onunla, yoksa şablon ---
async function writeItem(raw){
  const cat=guessCat(raw.title), tag=guessTag(raw.title);
  if(API_KEY){
    try{
      const prompt=`Sen Netvo'nun editörüsün. Netvo, e-ticaret satıcılarına bir satıştan gerçekte ne kaldığını (komisyon+vergi+ücret sonrası) gösteren, kaynaklı ve tarafsız bir platform. Aşağıdaki haberi Türkçe, kısa, marka tonunda yaz. Abartma, tıklama tuzağı yok, sadece satıcının PARASINA/MARJINA etkisi. JSON döndür: {"t":"başlık (<=90 karakter)","d":"özet (1 cümle)","body":"2-3 cümle, sonunda marj etkisi"}.\n\nHABER BAŞLIK: ${raw.title}\nÖZET: ${raw.desc}`;
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
        headers:{"content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:400,messages:[{role:"user",content:prompt}]})});
      const j=await r.json(); const txt=j.content&&j.content[0]&&j.content[0].text||"";
      const parsed=JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}")+1));
      return {c:cat, t:parsed.t, d:parsed.d, dt:fmtDate(raw.date), tag,
        body:(parsed.body||"")+`\n\nKaynak: ${raw.link||raw.source}`, src:raw.link||raw.source, auto:true};
    }catch(e){ console.error("LLM atlandı, şablona düşülüyor:",e.message); }
  }
  // Şablon fallback (anahtar yok / hata)
  return {c:cat, t:raw.title.slice(0,90), d:(raw.desc||raw.title).slice(0,160), dt:fmtDate(raw.date), tag,
    body:(raw.desc||raw.title)+`\n\nSatıcı için: bu gelişme komisyon/vergi/ücret kalemlerini etkileyebilir; hesaplayıcıda ilgili pazaryerini seçip marja etkisini test et.\n\nKaynak: ${raw.link||raw.source}`, src:raw.link||raw.source, auto:true};
}
function fmtDate(d){ const t=Date.parse(d); if(!isFinite(t)) return new Date().toISOString().slice(0,10);
  const dt=new Date(t); const ay=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"]; return dt.getDate()+" "+ay[dt.getMonth()]+" "+dt.getFullYear(); }

async function main(){
  const existing=loadExisting();
  const seen=new Set(existing.map(x=>norm(x.t)).concat(existing.map(x=>x.src||"")));
  // topla
  let pool=[];
  for(const s of SOURCES) pool=pool.concat(await fetchSource(s));
  // filtrele + tekrar ayıkla + skorla
  const rel=pool.filter(i=>KW.test(i.title+" "+i.desc) && MONEY.test(i.title+" "+i.desc))
    .filter(i=>!seen.has(norm(i.title)) && !seen.has(i.link))
    .map(i=>({...i, score:(KW.test(i.title)?2:0)+(MONEY.test(i.title)?1:0)}))
    .sort((a,b)=>b.score-a.score);
  // en fazla MAX_PER_RUN, tekilleştir
  const chosen=[]; const used=new Set();
  for(const i of rel){ const k=norm(i.title); if(used.has(k))continue; used.add(k); chosen.push(i); if(chosen.length>=MAX_PER_RUN)break; }

  if(!chosen.length){ console.log("Bugün yayına değer yeni haber yok (dürüstlük kuralı: dolgu yok)."); return; }

  const written=[];
  for(const raw of chosen) written.push(await writeItem(raw));

  const out=[...written, ...existing].slice(0, KEEP);
  if(DRY){ console.log("--- DRY RUN: yazılacak haberler ---"); written.forEach(w=>console.log(`• [${w.c}/${w.tag}] ${w.t}\n  ${w.d}`)); return; }
  fs.writeFileSync(OUT, JSON.stringify(out,null,1));
  console.log(`${written.length} haber eklendi → haberler.json (toplam ${out.length}).`);
}
main();
