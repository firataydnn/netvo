// ============================================================================
//  NETVO — HABER (NEWS) SEO SAYFA ÜRETİCİ · çok dilli
//  Her haber × dil için ÖNCEDEN-RENDER edilmiş, crawlable, benzersiz statik
//  sayfa üretir:  TR → /haber/<slug>.html   ·   diğer → /<lang>/haber/<slug>.html
//  Her sayfa: <title>, meta description, canonical, hreflang, Open Graph ve
//  JSON-LD NewsArticle şeması taşır → her haber KENDİ değerini taşır (SEO).
//  Ayrıca dil başına /haber/ (ve /<lang>/haber/) haber-endeksi üretir ve tüm
//  URL'leri mevcut sitemap.xml'e dil alternatifleriyle ekler.
//
//  Slug STABİL: her zaman TR (yoksa ilk mevcut dilin) başlığından türetilir —
//  böylece dil değişse de URL sabit kalır ve uygulamanın deep-link'i eşleşir.
//
//  Girdi: ../icerik/haberler.json   ·   Çıktı: seo/site/ (uret.mjs'den SONRA çalışır)
//  Çalıştır: node seo/haber_uret.mjs [taban_url]
// ============================================================================
import fs from "fs";

const BASE  = (process.argv[2] || "https://netvo.co").replace(/\/$/, "");
const KOK   = new URL("../", import.meta.url).pathname;
const OUT   = KOK + "seo/site/";
const BRAND = "Netvo";
const LANGS = ["tr","en","de","fr","es","it"];

let RAW = [];
try { RAW = JSON.parse(fs.readFileSync(KOK + "icerik/haberler.json", "utf8")); }
catch (e) { console.log("→ haberler.json yok — haber SEO üretimi atlandı"); process.exit(0); }
if (!Array.isArray(RAW) || !RAW.length) { console.log("→ haber yok — atlandı"); process.exit(0); }

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
// Uygulamadaki slugify ile AYNI mantık (app deep-link'i ile birebir eşleşsin).
function slugify(s){ return String(s).toLowerCase()
  .replace(/[ışğüöçİ]/g, c => ({ 'ı':'i','ş':'s','ğ':'g','ü':'u','ö':'o','ç':'c','İ':'i' }[c] || c))
  .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60); }

const CATTR = { pazar:"Pazaryeri", reg:"Regülasyon", global:"Global", reklam:"Reklam", lojistik:"Lojistik" };
const AY = { "Oca":"01","Şub":"02","Mar":"03","Nis":"04","May":"05","Haz":"06","Tem":"07","Ağu":"08","Eyl":"09","Eki":"10","Kas":"11","Ara":"12" };
function iso(dt){ const m = /(\d{1,2})\s+(\S+)\s+(\d{4})/.exec(dt || ""); if(!m) return new Date().toISOString().slice(0,10);
  const mo = AY[m[2].slice(0,3)] || "01"; return `${m[3]}-${mo}-${String(m[1]).padStart(2,"0")}`; }

// Dil başına küçük arayüz sözlüğü
const T = {
  tr:{ crumbHome:"Ana sayfa", crumbNews:"Haberler", source:"Kaynak", inApp:"Uygulamada aç →", more:"Tüm haberler →", idxTitle:`E-ticaret haberleri | ${BRAND}`, idxDesc:"E-ticaret dünyasından güncel gelişmeler: pazaryerleri, ödeme, lojistik, regülasyon ve daha fazlası. Her haber kaynaklı.", idxH1:"E-ticaret haberleri", tagline:"E-ticareti doğru yap", read:"Oku →", srcNote:`Haber metinleri ${BRAND} tarafından özgün olarak yazılır; her haberde kaynak bağlantısı verilir.` },
  en:{ crumbHome:"Home", crumbNews:"News", source:"Source", inApp:"Open in app →", more:"All news →", idxTitle:`E-commerce news | ${BRAND}`, idxDesc:"The latest from the world of e-commerce: marketplaces, payments, logistics, regulation and more. Every story sourced.", idxH1:"E-commerce news", tagline:"Do e-commerce right", read:"Read →", srcNote:`Story text is written originally by ${BRAND}; every story links its source.` },
  de:{ crumbHome:"Startseite", crumbNews:"Nachrichten", source:"Quelle", inApp:"In der App öffnen →", more:"Alle Nachrichten →", idxTitle:`E-Commerce-Nachrichten | ${BRAND}`, idxDesc:"Aktuelles aus der E-Commerce-Welt: Marktplätze, Zahlungen, Logistik, Regulierung und mehr. Jede Meldung mit Quelle.", idxH1:"E-Commerce-Nachrichten", tagline:"E-Commerce richtig machen", read:"Lesen →", srcNote:`Meldungstexte werden von ${BRAND} originär verfasst; jede Meldung verlinkt ihre Quelle.` },
  fr:{ crumbHome:"Accueil", crumbNews:"Actualités", source:"Source", inApp:"Ouvrir dans l'app →", more:"Toute l'actualité →", idxTitle:`Actualités e-commerce | ${BRAND}`, idxDesc:"L'actualité du monde de l'e-commerce : places de marché, paiements, logistique, réglementation et plus encore. Chaque article sourcé.", idxH1:"Actualités e-commerce", tagline:"Faire l'e-commerce comme il faut", read:"Lire →", srcNote:`Les textes sont rédigés en propre par ${BRAND} ; chaque article renvoie à sa source.` },
  es:{ crumbHome:"Inicio", crumbNews:"Noticias", source:"Fuente", inApp:"Abrir en la app →", more:"Todas las noticias →", idxTitle:`Noticias de e-commerce | ${BRAND}`, idxDesc:"Lo último del mundo del e-commerce: marketplaces, pagos, logística, regulación y más. Cada noticia con fuente.", idxH1:"Noticias de e-commerce", tagline:"Haz bien el e-commerce", read:"Leer →", srcNote:`Los textos los redacta ${BRAND} de forma original; cada noticia enlaza su fuente.` },
  it:{ crumbHome:"Home", crumbNews:"Notizie", source:"Fonte", inApp:"Apri nell'app →", more:"Tutte le notizie →", idxTitle:`Notizie e-commerce | ${BRAND}`, idxDesc:"Le ultime dal mondo dell'e-commerce: marketplace, pagamenti, logistica, normative e altro. Ogni notizia con fonte.", idxH1:"Notizie e-commerce", tagline:"Fai e-commerce nel modo giusto", read:"Leggi →", srcNote:`I testi sono scritti in modo originale da ${BRAND}; ogni notizia rinvia alla sua fonte.` },
};

const CSS = `*{box-sizing:border-box}body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0b0b12;background:#fff}
a{color:#1F4E79;text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid #eef1f4}header .wrap{display:flex;align-items:center;gap:10px;padding:16px 20px}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;color:#0b0b12}.logo b{font-size:18px}.dot{width:13px;height:13px;border-radius:50%;background:#0b0b12;display:inline-block}
main{padding:26px 0 40px}
.crumb{font-size:13px;color:#6b7280;margin:0 0 14px}.crumb a{color:#6b7280}
.cat{font:600 11px/1 Arial;letter-spacing:.6px;text-transform:uppercase;color:#1F4E79}
h1{font-family:Georgia,"Times New Roman",serif;font-size:30px;line-height:1.25;margin:10px 0 8px}
.meta{font-size:13px;color:#9aa6b6;margin:0 0 20px}
.lede{font-size:18px;color:#42505f;margin:0 0 18px}
.body p{margin:0 0 16px}
.cta{display:inline-block;background:#0b0b12;color:#fff;font-weight:600;padding:12px 18px;border-radius:10px;margin:8px 0 4px}.cta:hover{text-decoration:none;opacity:.92}
.src{font-size:13px;color:#6b7280;border-top:1px solid #eef1f4;margin-top:26px;padding-top:16px}
.rel{margin-top:30px;border-top:1px solid #eef1f4;padding-top:18px}.rel h2{font-size:15px;margin:0 0 10px}
ul.list{list-style:none;padding:0;margin:0}ul.list li{padding:9px 0;border-bottom:1px solid #f2f4f7}ul.list li .cat{margin-right:6px}
footer{border-top:1px solid #eef1f4;color:#9aa6b6;font-size:12px}footer .wrap{padding:18px 20px}
.langs{font-size:12px;color:#9aa6b6;margin-top:6px}.langs a{color:#9aa6b6;margin-right:8px}`;

function head(lang, title, desc, url, alts, extra=""){
  const hrefl = alts.map(a => `<link rel="alternate" hreflang="${a[0]}" href="${a[1]}">`).join("")
    + `<link rel="alternate" hreflang="x-default" href="${alts[0][1]}">`;
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta name="robots" content="index,follow">${hrefl}
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="${BRAND}"><meta name="twitter:card" content="summary">
<link rel="icon" href="${BASE}/marka/netvo-favicon.svg"><style>${CSS}</style>${extra}</head><body>`;
}
function shell(lang){ const t = T[lang]; const home = lang==="tr"?`${BASE}/`:`${BASE}/${lang}/`;
  return { open:`<header><div class="wrap"><a class="logo" href="${home}"><span class="dot"></span><b>netvo</b></a></div></header><main><div class="wrap">`,
    close:(langs,slug)=>{ const ll = langs.map(l=>`<a href="${l==="tr"?`${BASE}/haber/${slug}.html`:`${BASE}/${l}/haber/${slug}.html`}">${l.toUpperCase()}</a>`).join("");
      return `</div></main><footer><div class="wrap">© ${new Date().getFullYear()} ${BRAND} · ${esc(t.tagline)} · <a href="${home}">${esc(t.crumbHome)}</a><div class="langs">${ll}</div></div></footer></body></html>`; } };
}

function articlePage(a, lang, slug, langsAvail){
  const t = T[lang], tr = a.i18n[lang];
  const title = `${tr.t} | ${BRAND}`;
  const desc  = tr.d || tr.t;
  const bodyRaw = String(tr.body || tr.d || "").split(/\nKaynak:|\nSource:|\nQuelle:|\nFonte:|\nFuente:/)[0].trim();
  const paras = bodyRaw.split(/\n+/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join("");
  const url   = lang==="tr" ? `${BASE}/haber/${slug}.html` : `${BASE}/${lang}/haber/${slug}.html`;
  const alts  = langsAvail.map(l => [l, l==="tr"?`${BASE}/haber/${slug}.html`:`${BASE}/${l}/haber/${slug}.html`]);
  const appLink = `${BASE}/?lang=${lang}#/dergi/${slug}`;
  const pub = iso(a.dt);
  const cat = CATTR[a.c] || a.c || "";
  const ld = { "@context":"https://schema.org","@type":"NewsArticle",
    "headline": tr.t, "description": desc, "datePublished": pub, "dateModified": pub,
    "inLanguage": lang, "articleSection": cat,
    "author":{"@type":"Organization","name":BRAND,"url":BASE},
    "publisher":{"@type":"Organization","name":BRAND,"logo":{"@type":"ImageObject","url":`${BASE}/marka/netvo-mark.svg`}},
    "mainEntityOfPage":{"@type":"WebPage","@id":url},
    "isBasedOn": a.src || undefined, "url": url };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  const sh = shell(lang);
  return head(lang, title, desc, url, alts, jsonld) + sh.open
    + `<div class="crumb"><a href="${lang==="tr"?BASE+"/":BASE+"/"+lang+"/"}">${esc(t.crumbHome)}</a> / <a href="${lang==="tr"?BASE+"/haber/":BASE+"/"+lang+"/haber/"}">${esc(t.crumbNews)}</a></div>`
    + `<div class="cat">${esc(cat)}${a.tag?" · "+esc(a.tag):""}</div>`
    + `<h1>${esc(tr.t)}</h1>`
    + `<div class="meta">${esc(a.dt||"")}</div>`
    + (tr.d?`<p class="lede">${esc(tr.d)}</p>`:"")
    + `<div class="body">${paras}</div>`
    + `<p><a class="cta" href="${appLink}">${esc(t.inApp)}</a></p>`
    + `<div class="src">${esc(t.srcNote)}${a.src?` · <a href="${esc(a.src)}" rel="nofollow noopener" target="_blank">${esc(t.source)} →</a>`:""}</div>`
    + sh.close(langsAvail, slug);
}

function indexPage(lang, items){
  const t = T[lang];
  const url  = lang==="tr" ? `${BASE}/haber/` : `${BASE}/${lang}/haber/`;
  const alts = LANGS.map(l => [l, l==="tr"?`${BASE}/haber/`:`${BASE}/${l}/haber/`]);
  const sh = shell(lang);
  const rows = items.map(it => {
    const href = lang==="tr"?`${BASE}/haber/${it.slug}.html`:`${BASE}/${lang}/haber/${it.slug}.html`;
    return `<li><span class="cat">${esc(CATTR[it.c]||it.c||"")}</span><a href="${href}">${esc(it.t)}</a><div class="meta">${esc(it.dt||"")}</div></li>`;
  }).join("");
  return head(lang, t.idxTitle, t.idxDesc, url, alts) + sh.open
    + `<div class="crumb"><a href="${lang==="tr"?BASE+"/":BASE+"/"+lang+"/"}">${esc(t.crumbHome)}</a> / ${esc(t.crumbNews)}</div>`
    + `<h1>${esc(t.idxH1)}</h1>`
    + `<ul class="list">${rows}</ul>`
    + sh.close(LANGS, items[0]?items[0].slug:"") ;
}

// --- üretim ---
const sitemapEntries = [];
const idxItems = {}; LANGS.forEach(l => idxItems[l] = []);
let pageCount = 0;

RAW.forEach(a => {
  if (!a || !a.i18n) return;
  const langsAvail = LANGS.filter(l => a.i18n[l] && a.i18n[l].t);
  if (!langsAvail.length) return;
  // STABİL slug: TR (yoksa EN, yoksa ilk mevcut) başlıktan
  const base = (a.i18n.tr && a.i18n.tr.t) || (a.i18n.en && a.i18n.en.t) || a.i18n[langsAvail[0]].t;
  const slug = slugify(base);
  if (!slug) return;
  langsAvail.forEach(lang => {
    const dir = lang==="tr" ? OUT+"haber/" : OUT+lang+"/haber/";
    fs.mkdirSync(dir, { recursive:true });
    fs.writeFileSync(dir + slug + ".html", articlePage(a, lang, slug, langsAvail));
    pageCount++;
    const loc = lang==="tr" ? `${BASE}/haber/${slug}.html` : `${BASE}/${lang}/haber/${slug}.html`;
    const alts = langsAvail.map(l => [l, l==="tr"?`${BASE}/haber/${slug}.html`:`${BASE}/${l}/haber/${slug}.html`]);
    sitemapEntries.push({ loc, alts, lastmod: iso(a.dt) });
    idxItems[lang].push({ slug, t:a.i18n[lang].t, c:a.c, dt:a.dt });
  });
});

// haber endeksleri (dil başına)
LANGS.forEach(lang => {
  if (!idxItems[lang].length) return;
  const dir = lang==="tr" ? OUT+"haber/" : OUT+lang+"/haber/";
  fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(dir + "index.html", indexPage(lang, idxItems[lang]));
  const loc = lang==="tr" ? `${BASE}/haber/` : `${BASE}/${lang}/haber/`;
  const alts = LANGS.map(l => [l, l==="tr"?`${BASE}/haber/`:`${BASE}/${l}/haber/`]);
  sitemapEntries.push({ loc, alts, lastmod: new Date().toISOString().slice(0,10) });
});

// sitemap.xml'e ekle (uret.mjs önceden yazdı; </urlset> öncesine enjekte et)
try {
  const smPath = OUT + "sitemap.xml";
  let sm = fs.readFileSync(smPath, "utf8");
  const frag = sitemapEntries.map(e =>
    `  <url><loc>${e.loc}</loc>${e.alts.map(a=>`<xhtml:link rel="alternate" hreflang="${a[0]}" href="${a[1]}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${e.alts[0][1]}"/><lastmod>${e.lastmod}</lastmod></url>`
  ).join("\n");
  sm = sm.replace("</urlset>", frag + "\n</urlset>");
  fs.writeFileSync(smPath, sm);
} catch (e) { console.log("sitemap'e haber ekleme atlandı:", e.message); }

console.log("═══ HABER SEO SAYFALARI ÜRETİLDİ ═══");
console.log("haber sayısı     :", RAW.length);
console.log("üretilen sayfa   :", pageCount, "(+", LANGS.filter(l=>idxItems[l].length).length, "endeks)");
console.log("sitemap'e eklenen:", sitemapEntries.length);
console.log("çıktı            : seo/site/haber/ + /<lang>/haber/");
