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
const MAX_PUBLISH   = 8;   // günde en fazla yayınlanan haber (güncelliğe ağırlık)
const MAX_LLM_CALLS = 40;  // maliyet tavanı (Haiku ile ayda birkaç dolar)
const KEEP = 150;
const LANGS = ["tr","en","de","fr","es","it"];
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "claude-haiku-4-5-20251001";
// Konuyla-alakalı GERÇEK foto (otomatik) — Pixabay. Anahtar yoksa img boş → marka kapağı devrede.
// Pixabay lisansı otomatik indir+barındır+ticari kullanıma izin verir, atıf gerektirmez (Unsplash'in
// aksine — Unsplash "non-automated" + hotlink şartı koştuğu için uygun değildi).
// Ücretsiz anahtar: pixabay.com/api/docs/ (giriş yapınca sayfada görünür) → GitHub secret: PIXABAY_API_KEY
const PIXABAY = process.env.PIXABAY_API_KEY || "";
const ROOT = KOK + "../";
const IMGDIR = ROOT + "marka/haber-gorsel/";
function slugify(s){return String(s||"").toLowerCase().replace(/[ışğüöçİ]/g,c=>({"ı":"i","ş":"s","ğ":"g","ü":"u","ö":"o","ç":"c","İ":"i"}[c]||c)).replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60);}
function imgQuery(enTitle, cat){
  const BRANDS=/\b(amazon|walmart|shopify|tiktok|temu|shein|ebay|etsy|alibaba|aliexpress|adobe|apple|google|microsoft|meta|home ?depot|michaels|yankee|quince|stord|wing|rufus|sam'?s club|trendyol|hepsiburada|shopee|lazada|allegro|coupang|noon|flipkart|zalando|vinted|wildberries|ozon)\b/gi;
  let q=String(enTitle||"").replace(BRANDS," ").replace(/[^a-zA-Z ]/g," ").split(/\s+/).filter(w=>w.length>3).slice(0,4).join(" ");
  const CATQ={pazar:"online shopping ecommerce",reg:"customs trade shipping documents",global:"ecommerce retail technology",reklam:"digital marketing analytics screen",lojistik:"parcel delivery courier warehouse"};
  return (q.trim().length>6) ? (q.trim()+" ecommerce") : (CATQ[cat]||"online shopping ecommerce");
}
const BRANDS_RE=/\b(amazon|walmart|shopify|tiktok|temu|shein|ebay|etsy|alibaba|aliexpress|adobe|apple|google|microsoft|meta|youtube|home ?depot|michaels|yankee|quince|stord|wing|rufus|sam'?s club|trendyol|hepsiburada|shopee|lazada|allegro|coupang|noon|flipkart|zalando|vinted|wildberries|ozon|nvidia|paypal|stripe|klarna)\b/gi;
async function pixabayImg(q, slug){
  if(!PIXABAY) return null;
  try{
    q=String(q||"").replace(BRANDS_RE," ").replace(/\s+/g," ").trim();  // marka adı temizle (yoksa alakasız doğa gelir)
    if(q.length<4) q="online shopping ecommerce";
    const u=`https://pixabay.com/api/?key=${PIXABAY}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&safesearch=true&order=popular&per_page=3`;
    const r=await fetch(u); if(!r.ok) return null;
    const j=await r.json(); const p=(j.hits||[])[0]; if(!p) return null;
    const url=p.largeImageURL||p.webformatURL; if(!url) return null;
    const ir=await fetch(url); if(!ir.ok) return null;
    fs.mkdirSync(IMGDIR,{recursive:true});
    fs.writeFileSync(IMGDIR+slug+".jpg", Buffer.from(await ir.arrayBuffer()));
    return { img:`/marka/haber-gorsel/${slug}.jpg`, imgCredit:(p.user?`${p.user} / Pixabay`:"Pixabay") };
  }catch(e){ return null; }
}

const SOURCES = [
  "https://www.retaildive.com/feeds/news/",
  "https://www.grocerydive.com/feeds/news/",
  "https://www.supplychaindive.com/feeds/news/",
  "https://www.marketingdive.com/feeds/news/",
  "https://www.cfodive.com/feeds/news/",
  "https://www.restaurantdive.com/feeds/news/",
  "https://techcrunch.com/tag/e-commerce/feed/",
  "https://www.digitalcommerce360.com/feed/",
  "https://www.modernretail.co/feed/",
  "https://www.retailwire.com/feed/",
  "https://www.pymnts.com/feed/",
  "https://www.pymnts.com/category/ecommerce/feed/",
  "https://practicalecommerce.com/feed",
  "https://www.glossy.co/feed/",
  "https://www.retailcustomerexperience.com/rss/",
  "https://tamebay.com/feed",
  "https://www.channelx.world/feed/",
  "https://ecommercenews.eu/feed/",
  "https://www.retailgazette.co.uk/feed/",
  "https://internetretailing.net/feed/",
  "https://sifted.eu/feed",
  "https://www.retaildetail.eu/feed/",
  "https://excitingcommerce.de/feed/",
  "https://www.ecommercemag.fr/rss",
  "https://www.emerce.nl/rss",
  "https://twinklemagazine.nl/rss",
  "https://www.retailtimes.co.uk/feed/",
  "https://www.finextra.com/rss/headlines.aspx",
  "https://theloadstar.com/feed/",
  "https://www.parcelandpostaltechnologyinternational.com/feed",
  "https://www.retail.ru/rss/news/",
  "https://webrazzi.com/feed/",
  "https://shiftdelete.net/feed",
  "https://www.perakende.org/rss",
  "https://webtekno.com/rss.xml",
  "https://www.marketingturkiye.com.tr/feed/",
  "https://www.wamda.com/feed",
  "https://waya.media/feed/",
  "https://retail.economictimes.indiatimes.com/rss/topstories",
  "https://inc42.com/feed/",
  "https://yourstory.com/feed",
  "https://technode.com/feed/",
  "https://www.pandaily.com/feed/",
  "https://byline.network/feed/",
  "https://vulcanpost.com/feed/",
  "https://fintechnews.sg/feed/",
  "https://www.america-retail.com/feed/",
  "https://www.ecommercenews.pe/feed",
  "https://contxto.com/en/feed/",
  "https://techcabal.com/feed/",
  "https://disruptafrica.com/feed/",
  "https://www.itnewsafrica.com/feed/",
  "https://insideretail.com.au/feed",
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
  const ac=new AbortController(); const to=setTimeout(()=>ac.abort(),9000); // takılan feed run'ı kilitlemesin
  try{ const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; NetvoBot/1.0)"},redirect:"follow",signal:ac.signal}); clearTimeout(to); if(!r.ok)return [];
    return parseRSS(await r.text()).map(i=>({...i, source:url})); }
  catch(e){ clearTimeout(to); console.error("kaynak atlandı:",url,e.message); return []; }
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

ADIM 2 — Sadece relevant=true ise: İYİ bir haber metni yaz (düz, bilgilendirici gazetecilik; "satıcının marjı" gibi zorlama kalıplar KULLANMA) ve ALTI DİLE çevir (tr,en,de,fr,es,it). Her dil için: t (başlık, <=90 karakter, net), d (tek cümle spot/özet), body (3-6 PARAGRAF, ~350-520 kelime; üst sınır 6 paragraf, daha azı olabilir ama asla tek paragraf/2 cümle bırakma. Dolu, DERİN ve haber değeri yüksek olsun. Paragrafları \n\n ile ayır. P1: NE OLDU — kim, nerede, ne zaman, rakamlar/detaylar. P2: BAĞLAM — neden şimdi oldu, sektörde neye oturuyor, benzer gelişmelerle ilişkisi. P3: E-TİCARET SATICISI/İŞLETME İÇİN NE ANLAMA GELİYOR + kısa ileriye bakış. Uydurma rakam ekleme; kaynakta olmayan spesifik veri icat etme, olguları bilmiyorsan genel-analitik yaz). Kaynak linkini body'ye KOYMA.

TELİF KURALLARI (ZORUNLU): (1) Başlığı KENDİ cümlenle yeniden yaz — kaynağın başlığını birebir kopyalama. (2) Metni tamamen KENDİ sözlerinle yaz; kaynaktan cümle, cümle parçası veya paragraf ALINTILAMA/KOPYALAMA. (3) Yalnızca OLGULARI aktar (kim, ne, nerede, ne zaman, rakamlar) — olgular telife tabi değildir, ifade biçimi tabidir. (4) Kaynağın görsellerini/fotoğraflarını KULLANMA; site kendi kapak görselini üretir. (5) Emin değilsen daha kısa ve genel yaz.

GÖRSEL ARAMA TERİMİ (imgq) — ÇOK ÖNEMLİ: Bu habere kapak fotoğrafı bulmak için stok foto sitesinde aratılacak, İngilizce 2-4 kelimelik SOMUT bir sahne/nesne yaz. KURALLAR: (a) MARKA ADI YASAK (Amazon, Walmart, Shopify, TikTok, Temu, YouTube vb. YAZMA — yoksa alakasız doğa/marka fotosu gelir). (b) Somut, fotoğraflanabilir bir sahne olsun: "delivery drone package", "fulfillment warehouse robots", "contactless payment terminal", "online shopping smartphone", "cargo courier parcels", "customs shipping containers", "influencer live shopping". (c) Soyut kavram/şirket adı DEĞİL, gözle görülür nesne/eylem.

SADECE şu JSON'u döndür (başka metin yok):
{"relevant":true|false,"reason":"...","category":"pazar|reg|global|reklam|lojistik","region":"Türkiye|ABD|AB|Global|SEA|Çin S.Ötesi|Rusya|Körfez|LatAm|Hindistan|...","imgq":"english concrete photo search term, no brand","i18n":{"tr":{"t":"","d":"","body":""},"en":{...},"de":{...},"fr":{...},"es":{...},"it":{...}}}

Kategori kılavuzu: pazar=pazaryeri/platform, reg=regülasyon/vergi/gümrük, global=sınır ötesi/genel, reklam=pazarlama/reklam, lojistik=kargo/depo/teslimat.

HABER BAŞLIK: ${raw.title}
ÖZET: ${raw.desc}`;
  const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
    headers:{"content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:MODEL,max_tokens:8000,system:sys,messages:[{role:"user",content:usr}]})});
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
  for(const arr of await Promise.all(SOURCES.map(fetchSource))) pool=pool.concat(arr);
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
      const cat=["pazar","reg","global","reklam","lojistik"].includes(obj.category)?obj.category:"global";
      // Konuyla-alakalı gerçek foto (Unsplash) — yoksa marka kapağı devrede
      const slug=slugify((obj.i18n.tr&&obj.i18n.tr.t)||i18n.en.t);
      const q=(obj.imgq&&String(obj.imgq).trim().length>3)?String(obj.imgq).trim():imgQuery(i18n.en.t||i18n.tr.t,cat);
      const im=await pixabayImg(q, slug);
      written.push({ c:cat, dt:fmtDate(raw.date), tag:obj.region||"Global", src, auto:true, i18n,
        ...(im?{img:im.img, imgCredit:im.imgCredit}:{}) });
      console.log("YAYINA UYGUN:", i18n.tr.t, im?"(fotolu)":"(marka kapak)");
    }catch(e){ console.error("değerlendirme hatası, atlandı:", e.message); }
  }

  if(!written.length){ console.log(`${calls} aday değerlendirildi; yayına değer yeni haber çıkmadı.`); return; }
  if(DRY){ console.log("--- DRY RUN ---"); written.forEach(w=>console.log(`• [${w.c}/${w.tag}] TR: ${w.i18n.tr.t}  |  EN: ${w.i18n.en.t}`)); return; }
  const out=[...written, ...existing].slice(0, KEEP);
  fs.writeFileSync(OUT, JSON.stringify(out,null,1));
  console.log(`${written.length} çok dilli haber eklendi → haberler.json (toplam ${out.length}).`);
}
main();
