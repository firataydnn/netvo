// ============================================================================
//  PROGRAMMATIC SEO ÜRETİCİ — ÇOK DİLLİ (TR/EN/DE/FR/ES/IT)
//
//  Neden: SPA Google'a boştur. Her pazaryeri × dil için önceden-render edilmiş,
//  benzersiz, kaynaklı statik sayfa → o dildeki uzun-kuyruk aramaları yakalar
//  ("Trendyol Provision", "Amazon commission", "comisiones Etsy"...).
//
//  Çok dilli SEO: her sayfa <html lang>, çevrilmiş title/meta/H1/FAQ, ve TÜM
//  dillere + x-default'a hreflang alternatif linkleri taşır. Sitemap her URL'in
//  dil alternatiflerini xhtml:link ile bildirir (Google i18n standardı).
//
//  Yol yapısı:  TR → /pazaryeri/<k>.html   ·   diğer → /<lang>/pazaryeri/<k>.html
//  Girdi: ../Commera_Site.html (tek kaynak)   Çıktı: seo/site/
//  Çalıştır: node seo/uret.mjs [taban_url]
//  Dil eklemek: LANGS'a kod ekle + T[kod] ve COUNTRY/CAT'e çeviri ekle.
// ============================================================================
import fs from "fs";

const BASE  = (process.argv[2] || "https://netvo.co").replace(/\/$/, "");
const APP   = BASE + "/";   // uygulama artık kökte (netvo.co = güzel site)
const BRAND = "Netvo";                   // marka adı — tek yerden değişir
const YEAR  = new Date().getFullYear();
const KOK   = new URL("../", import.meta.url).pathname;
const OUT   = KOK + "seo/site/";
const HTML  = fs.readFileSync(KOK + "Commera_Site.html", "utf8");

// Yayın stratejisi: önce TR+EN'i kanıtla, sonra hepsini aç (kurul kararı, Mert).
// Alt küme üret:  NETVO_LANGS="tr,en" node seo/uret.mjs https://netvo.co
const LANGS = (process.env.NETVO_LANGS || "tr,en,de,fr,es,it").split(",").map(s=>s.trim()).filter(Boolean);

function siteyiOku() {
  const code = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
  const El = () => { const e = { style:{}, dataset:{}, classList:{add(){},remove(){},toggle:()=>false,contains:()=>false}, children:[] };
    e.appendChild=()=>{}; e.setAttribute=()=>{}; e.getAttribute=()=>""; e.removeAttribute=()=>{}; e.addEventListener=()=>{};
    e.querySelector=()=>El(); e.querySelectorAll=()=>[]; e.insertAdjacentHTML=()=>{}; e.focus=()=>{}; e.remove=()=>{};
    Object.defineProperty(e,"innerHTML",{set(){},get:()=>""}); Object.defineProperty(e,"textContent",{set(){},get:()=>""});
    Object.defineProperty(e,"value",{set(){},get:()=>"trendyol"}); e.files=[]; return e; };
  const doc = { getElementById:()=>El(), querySelector:()=>El(), querySelectorAll:()=>[], createElement:()=>El(),
    createElementNS:()=>El(), body:El(), head:El(), documentElement:El(), addEventListener(){}, title:"" };
  const win = { addEventListener(){}, location:{hash:""}, matchMedia:()=>({matches:false,addEventListener(){}}), scrollTo(){} };
  const ls = { getItem:()=>null, setItem(){}, removeItem(){} };
  const fn = new Function("document","window","localStorage","location","navigator","matchMedia","setTimeout","addEventListener","URL","Blob","FileReader","requestAnimationFrame","alert","toast","console",
    code + "\nreturn {MK, CO, INFO:(typeof INFO!=='undefined'?INFO:{}), provOf, mkShort:(typeof mkShort!=='undefined'?mkShort:(x=>x))};");
  return fn(doc, win, ls, win.location, {language:"tr"}, win.matchMedia, f=>{try{f()}catch(e){}}, ()=>{},
    {createObjectURL:()=>"x",revokeObjectURL(){}}, function(){}, function(){}, f=>f&&f(), ()=>{}, ()=>{}, console);
}
const { MK, CO, INFO, provOf, mkShort } = siteyiOku();

const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const medyan = a => { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2?s[m]:+((s[m-1]+s[m])/2).toFixed(1); };
function oranAraligi(m){ if(!m.cats||!m.cats.length) return m.fixedRate!=null?("%"+m.fixedRate):"—"; const r=m.cats.map(c=>c[1]); const lo=Math.min(...r),hi=Math.max(...r); return lo===hi?("%"+lo):("%"+lo+"–"+hi); }
function temsilciOran(m){ if(m.cats&&m.cats.length) return medyan(m.cats.map(c=>c[1])); return m.fixedRate!=null?m.fixedRate:null; }
function pazaryeriKesintisi(m, co){
  const rate = temsilciOran(m); if(rate==null) return null;
  const vat = (co.vat||0)/100, S = 1000;
  let d = S * (rate/100) * (m.comVatIncl ? 1 : (1+vat));
  (m.pct||[]).forEach(p => d += S * ((p[1]!=null?p[1]:parseFloat(p[0])||0)/100));
  (m.fixed||[]).forEach(f => d += (f[1]!=null?f[1]:0));
  return { ilanRate: rate, toplamPct: +(d/S*100).toFixed(1) };
}

// ---- vergi kelimesi ----
const TAX = { tr:"KDV", en:"VAT", de:"MwSt.", fr:"TVA", es:"IVA", it:"IVA" };

// ---- ülke adı (koda göre, 6 dil) ----
const COUNTRY = {
  AE:{tr:"BAE",en:"UAE",de:"VAE",fr:"EAU",es:"EAU",it:"EAU"},
  AU:{tr:"Avustralya",en:"Australia",de:"Australien",fr:"Australie",es:"Australia",it:"Australia"},
  BR:{tr:"Brezilya",en:"Brazil",de:"Brasilien",fr:"Brésil",es:"Brasil",it:"Brasile"},
  CA:{tr:"Kanada",en:"Canada",de:"Kanada",fr:"Canada",es:"Canadá",it:"Canada"},
  CH:{tr:"İsviçre",en:"Switzerland",de:"Schweiz",fr:"Suisse",es:"Suiza",it:"Svizzera"},
  CL:{tr:"Şili",en:"Chile",de:"Chile",fr:"Chili",es:"Chile",it:"Cile"},
  CN:{tr:"Çin",en:"China",de:"China",fr:"Chine",es:"China",it:"Cina"},
  CO:{tr:"Kolombiya",en:"Colombia",de:"Kolumbien",fr:"Colombie",es:"Colombia",it:"Colombia"},
  DE:{tr:"Almanya",en:"Germany",de:"Deutschland",fr:"Allemagne",es:"Alemania",it:"Germania"},
  EG:{tr:"Mısır",en:"Egypt",de:"Ägypten",fr:"Égypte",es:"Egipto",it:"Egitto"},
  ES:{tr:"İspanya",en:"Spain",de:"Spanien",fr:"Espagne",es:"España",it:"Spagna"},
  FR:{tr:"Fransa",en:"France",de:"Frankreich",fr:"France",es:"Francia",it:"Francia"},
  GL:{tr:"Global",en:"Global",de:"Global",fr:"International",es:"Global",it:"Globale"},
  ID:{tr:"Endonezya",en:"Indonesia",de:"Indonesien",fr:"Indonésie",es:"Indonesia",it:"Indonesia"},
  IN:{tr:"Hindistan",en:"India",de:"Indien",fr:"Inde",es:"India",it:"India"},
  IT:{tr:"İtalya",en:"Italy",de:"Italien",fr:"Italie",es:"Italia",it:"Italia"},
  JP:{tr:"Japonya",en:"Japan",de:"Japan",fr:"Japon",es:"Japón",it:"Giappone"},
  KE:{tr:"Kenya",en:"Kenya",de:"Kenia",fr:"Kenya",es:"Kenia",it:"Kenya"},
  KR:{tr:"G. Kore",en:"South Korea",de:"Südkorea",fr:"Corée du Sud",es:"Corea del Sur",it:"Corea del Sud"},
  KZ:{tr:"Kazakistan",en:"Kazakhstan",de:"Kasachstan",fr:"Kazakhstan",es:"Kazajistán",it:"Kazakistan"},
  MX:{tr:"Meksika",en:"Mexico",de:"Mexiko",fr:"Mexique",es:"México",it:"Messico"},
  MY:{tr:"Malezya",en:"Malaysia",de:"Malaysia",fr:"Malaisie",es:"Malasia",it:"Malaysia"},
  NG:{tr:"Nijerya",en:"Nigeria",de:"Nigeria",fr:"Nigéria",es:"Nigeria",it:"Nigeria"},
  NL:{tr:"Hollanda",en:"Netherlands",de:"Niederlande",fr:"Pays-Bas",es:"Países Bajos",it:"Paesi Bassi"},
  NZ:{tr:"Yeni Zelanda",en:"New Zealand",de:"Neuseeland",fr:"Nouvelle-Zélande",es:"Nueva Zelanda",it:"Nuova Zelanda"},
  PE:{tr:"Peru",en:"Peru",de:"Peru",fr:"Pérou",es:"Perú",it:"Perù"},
  PK:{tr:"Pakistan",en:"Pakistan",de:"Pakistan",fr:"Pakistan",es:"Pakistán",it:"Pakistan"},
  PL:{tr:"Polonya",en:"Poland",de:"Polen",fr:"Pologne",es:"Polonia",it:"Polonia"},
  RO:{tr:"Romanya",en:"Romania",de:"Rumänien",fr:"Roumanie",es:"Rumanía",it:"Romania"},
  RU:{tr:"Rusya",en:"Russia",de:"Russland",fr:"Russie",es:"Rusia",it:"Russia"},
  SA:{tr:"S. Arabistan",en:"Saudi Arabia",de:"Saudi-Arabien",fr:"Arabie saoudite",es:"Arabia Saudí",it:"Arabia Saudita"},
  SE:{tr:"İsveç",en:"Sweden",de:"Schweden",fr:"Suède",es:"Suecia",it:"Svezia"},
  SG:{tr:"Singapur",en:"Singapore",de:"Singapur",fr:"Singapour",es:"Singapur",it:"Singapore"},
  TR:{tr:"Türkiye",en:"Türkiye",de:"Türkei",fr:"Turquie",es:"Turquía",it:"Turchia"},
  UK:{tr:"Birleşik Krallık",en:"United Kingdom",de:"Vereinigtes Königreich",fr:"Royaume-Uni",es:"Reino Unido",it:"Regno Unito"},
  US:{tr:"ABD",en:"United States",de:"USA",fr:"États-Unis",es:"EE. UU.",it:"Stati Uniti"},
  VN:{tr:"Vietnam",en:"Vietnam",de:"Vietnam",fr:"Vietnam",es:"Vietnam",it:"Vietnam"},
  ZA:{tr:"G. Afrika",en:"South Africa",de:"Südafrika",fr:"Afrique du Sud",es:"Sudáfrica",it:"Sudafrica"},
};
const ulkeAd = (code, lang) => (COUNTRY[code] && COUNTRY[code][lang]) || (CO[code]||{}).n || code;
// Pazaryeri adındaki Türkçe ülke kelimesini yerelleştir: "Amazon Almanya" → "Amazon Germany"
const yerelAd = (m, lang) => {
  let name = m.n;
  if (lang !== "tr" && COUNTRY[m.co]) {
    const trC = COUNTRY[m.co].tr, locC = COUNTRY[m.co][lang];
    if (trC && locC && trC !== locC && name.includes(trC)) name = name.split(trC).join(locC);
  }
  return name;
};

// ---- kategori sözlüğü (TR etiket → dil); yoksa TR'ye düşer ----
const CAT = {
  "Genel":{en:"General",de:"Allgemein",fr:"Général",es:"General",it:"Generale"},
  "Elektronik":{en:"Electronics",de:"Elektronik",fr:"Électronique",es:"Electrónica",it:"Elettronica"},
  "Moda":{en:"Fashion",de:"Mode",fr:"Mode",es:"Moda",it:"Moda"},
  "Giyim":{en:"Apparel",de:"Bekleidung",fr:"Vêtements",es:"Ropa",it:"Abbigliamento"},
  "Moda & Aksesuar":{en:"Fashion & accessories",de:"Mode & Accessoires",fr:"Mode & accessoires",es:"Moda y accesorios",it:"Moda e accessori"},
  "Kozmetik":{en:"Cosmetics",de:"Kosmetik",fr:"Cosmétiques",es:"Cosmética",it:"Cosmetici"},
  "Kişisel Bakım":{en:"Personal care",de:"Körperpflege",fr:"Soins personnels",es:"Cuidado personal",it:"Cura della persona"},
  "Ev":{en:"Home",de:"Haushalt",fr:"Maison",es:"Hogar",it:"Casa"},
  "Ev & Yaşam":{en:"Home & living",de:"Haus & Wohnen",fr:"Maison & déco",es:"Hogar y vida",it:"Casa e vivere"},
  "Kitap":{en:"Books",de:"Bücher",fr:"Livres",es:"Libros",it:"Libri"},
  "Oyuncak":{en:"Toys",de:"Spielzeug",fr:"Jouets",es:"Juguetes",it:"Giocattoli"},
  "Spor":{en:"Sports",de:"Sport",fr:"Sport",es:"Deporte",it:"Sport"},
  "Spor & Outdoor":{en:"Sports & outdoor",de:"Sport & Outdoor",fr:"Sport & plein air",es:"Deporte y aire libre",it:"Sport e outdoor"},
  "Gıda":{en:"Food",de:"Lebensmittel",fr:"Alimentation",es:"Alimentación",it:"Alimentari"},
  "Süpermarket":{en:"Grocery",de:"Supermarkt",fr:"Épicerie",es:"Supermercado",it:"Supermercato"},
  "Mobilya":{en:"Furniture",de:"Möbel",fr:"Meubles",es:"Muebles",it:"Mobili"},
  "Aksesuar":{en:"Accessories",de:"Accessoires",fr:"Accessoires",es:"Accesorios",it:"Accessori"},
  "Ayakkabı":{en:"Shoes",de:"Schuhe",fr:"Chaussures",es:"Calzado",it:"Scarpe"},
  "Bebek":{en:"Baby",de:"Baby",fr:"Bébé",es:"Bebé",it:"Bambini"},
  "Anne & Bebek":{en:"Mother & baby",de:"Mutter & Kind",fr:"Maman & bébé",es:"Madre y bebé",it:"Mamma e bambino"},
  "Otomotiv":{en:"Automotive",de:"Automobil",fr:"Automobile",es:"Automoción",it:"Automotive"},
  "Sağlık":{en:"Health",de:"Gesundheit",fr:"Santé",es:"Salud",it:"Salute"},
  "Takı":{en:"Jewelry",de:"Schmuck",fr:"Bijoux",es:"Joyería",it:"Gioielli"},
  "Mücevher":{en:"Fine jewelry",de:"Schmuck",fr:"Joaillerie",es:"Joyería fina",it:"Gioielleria"},
  "Bahçe":{en:"Garden",de:"Garten",fr:"Jardin",es:"Jardín",it:"Giardino"},
  "Kırtasiye":{en:"Stationery",de:"Schreibwaren",fr:"Papeterie",es:"Papelería",it:"Cartoleria"},
  "Ofis":{en:"Office",de:"Büro",fr:"Bureau",es:"Oficina",it:"Ufficio"},
  "Evcil Hayvan":{en:"Pet",de:"Haustier",fr:"Animalerie",es:"Mascotas",it:"Animali"},
  "Telefon":{en:"Phones",de:"Handys",fr:"Téléphones",es:"Teléfonos",it:"Telefoni"},
  "Bilgisayar":{en:"Computers",de:"Computer",fr:"Ordinateurs",es:"Ordenadores",it:"Computer"},
  "Beyaz Eşya":{en:"Appliances",de:"Haushaltsgeräte",fr:"Électroménager",es:"Electrodomésticos",it:"Elettrodomestici"},
  "Saat":{en:"Watches",de:"Uhren",fr:"Montres",es:"Relojes",it:"Orologi"},
  "Parfüm":{en:"Perfume",de:"Parfüm",fr:"Parfum",es:"Perfume",it:"Profumi"},
  "Tekstil":{en:"Textiles",de:"Textilien",fr:"Textile",es:"Textil",it:"Tessili"},
};
const catAd = (label, lang) => lang==="tr" ? label : ((CAT[label] && CAT[label][lang]) || label);
const araligiCevir = (aralik) => aralik; // sayısal aralık dilden bağımsız (%12–18)

// ---- veri durumu etiketi (tier + yaş → dil) ----
const ST = {
  verified:{ tr:a=>a===0?"bugün doğrulandı":a+" gün önce doğrulandı", en:a=>a===0?"verified today":"verified "+a+" days ago",
    de:a=>a===0?"heute verifiziert":"vor "+a+" Tagen verifiziert", fr:a=>a===0?"vérifié aujourd'hui":"vérifié il y a "+a+" jours",
    es:a=>a===0?"verificado hoy":"verificado hace "+a+" días", it:a=>a===0?"verificato oggi":"verificato "+a+" giorni fa" },
  unverified:{ tr:()=>"kaynak var, tarih yok", en:()=>"source available, no date", de:()=>"Quelle vorhanden, kein Datum",
    fr:()=>"source disponible, sans date", es:()=>"fuente disponible, sin fecha", it:()=>"fonte disponibile, senza data" },
  stale:{ tr:a=>a+" gün önce doğrulandı — değişmiş olabilir", en:a=>"verified "+a+" days ago — may have changed",
    de:a=>"vor "+a+" Tagen verifiziert — kann sich geändert haben", fr:a=>"vérifié il y a "+a+" jours — peut avoir changé",
    es:a=>"verificado hace "+a+" días — puede haber cambiado", it:a=>"verificato "+a+" giorni fa — potrebbe essere cambiato" },
  estimate:{ tr:()=>"kaynak yok — tahmin", en:()=>"no source — estimate", de:()=>"keine Quelle — Schätzung",
    fr:()=>"pas de source — estimation", es:()=>"sin fuente — estimación", it:()=>"nessuna fonte — stima" },
  expired:{ tr:a=>a+" gün geçti — güncelliğini yitirdi", en:a=>a+" days old — outdated", de:a=>a+" Tage alt — veraltet",
    fr:a=>a+" jours — obsolète", es:a=>a+" días — desactualizado", it:a=>a+" giorni — non aggiornato" },
};
const durumEtiket = (p, lang) => (ST[p.tier] ? ST[p.tier][lang](p.age||0) : p.label);

// ---- çeviri katmanı: her dil için metin/kalıp ----
const T = {
  tr:{
    title:(ad)=>`${ad} komisyon oranları ${YEAR} — satışın gerçek maliyeti | ${BRAND}`,
    desc:(ad,ulke,cats,ar,vat,tah)=>`${ad} (${ulke}) komisyon oranları${cats?` kategori kategori (${ar})`:` ${ar}`}, ${TAX.tr} %${vat}, sabit ücretler ve satışta cebine kalan kâr. ${tah?"Tahmini oran.":"Kaynaklı ve tarihli."}`,
    h1:(ad)=>`${ad} komisyon oranları ve satış maliyeti`,
    estWarn:(ad)=>`⚠︎ Bu oranlar tahmindir — ${ad} resmî komisyon belgesine ulaşılamadı. Kendi satıcı panelinden teyit et.`,
    cta:(k)=>`${k} kârını hesapla →`, hRates:"Komisyon oranları (kategori kategori)", hFacts:"Künye", hFaq:"Sık sorulanlar",
    hOther:(u)=>`${u}'deki diğer pazaryerleri`, hWhat:(ad)=>`${ad} nedir?`, hWho:"Kimin için?", hStart:"Nasıl başlanır?", hReqs:"Gereklilikler", hPros:"Artıları", hCons:"Dikkat edilmesi gerekenler",
    fixedComm:"Sabit komisyon:", catHead:"Kategori", commHead:"Komisyon",
    fCountry:"Ülke / pazar", fCurrency:"Para birimi", fVat:`${TAX.tr} / vergi`, fRange:"Komisyon aralığı", fBase:"Komisyon matrahı", fAnnounced:"İlan edilen oran", fStatus:"Veri durumu",
    vBaseNet:`${TAX.tr} hariç fiyat`, vBaseGross:`${TAX.tr} dahil fiyat`, vInclYes:`${TAX.tr} DAHİL`, vInclNo:`${TAX.tr} hariç (+${TAX.tr})`,
    gAnnounced:"İlan edilen komisyon", gHidden:"gizli", gTotal:"Toplam pazaryeri kesintisi", gSub:`${TAX.tr} · sabit ücret · işlem`, gPts:(n)=>`+${n} puan`,
    gSentence:(k,i,t)=>`${k} “%${i} komisyon” der; ${TAX.tr} ve sabit ücretlerle satışta toplam pazaryeri kesintisi %${t}'e çıkar. Kargo, reklam ve ürün maliyetiyle birlikte cebine kalan operasyonel kârı hesapla.`,
    q1:(ad)=>`${ad} komisyon oranı ne kadar?`, a1:(ad,cats,ar,incl)=>`${ad} komisyonu ${cats?`kategoriye göre ${ar} arasında değişir`:`${ar}`}. ${incl?`Oran ${TAX.tr} dahildir.`:`Oranın üstüne ${TAX.tr} eklenir.`}`,
    q2:(k)=>`${k}'da satışta gerçekte ne kadar kesilir?`, a2:(i,t)=>`İlan edilen %${i} komisyona ${TAX.tr} ve sabit ücretler eklenince toplam pazaryeri kesintisi yaklaşık %${t} olur.`,
    q3:(ad)=>`${ad} ${TAX.tr} oranı nedir?`, a3:(u,vat,bt)=>`${u} standart ${TAX.tr} oranı %${vat}. Komisyon matrahı: ${bt}.`,
    crumbHome:"Ana sayfa", crumbMk:"Pazaryerleri", srcWord:"Kaynak", statusWord:"Veri durumu",
    srcTail:`${BRAND} oranla birlikte kaynağı ve doğrulama tarihini gösterir; tahmini ve doğrulanmış veriyi ayırır.`,
    calcWord:"Hesap makinesi",tagline:"E-ticareti doğru yap",
    idxTitle:`Pazaryeri komisyon oranları — 136 pazaryeri, 37 ülke | ${BRAND}`, idxDesc:"37 ülkede 136 pazaryerinin komisyon oranları, vergi, sabit ücretler ve satışın gerçek maliyeti. Kaynaklı ve tarihli.",
    idxH1:"Pazaryeri komisyon oranları", idxIntro:"37 ülkede 136 pazaryerinin komisyonu, vergisi ve satışın gerçek maliyeti.",
  },
  en:{
    title:(ad)=>`${ad} commission & fees ${YEAR} — the real cost of selling | ${BRAND}`,
    desc:(ad,ulke,cats,ar,vat,tah)=>`${ad} (${ulke}) commission rates${cats?` by category (${ar})`:` ${ar}`}, ${TAX.en} ${vat}%, fixed fees and the profit you actually keep per sale. ${tah?"Estimated rate.":"Sourced and dated."}`,
    h1:(ad)=>`${ad} commission rates and cost of selling`,
    estWarn:(ad)=>`⚠︎ These rates are estimates — the official ${ad} fee document couldn't be reached. Verify in your own seller panel.`,
    cta:(k)=>`Calculate ${k} profit →`, hRates:"Commission rates (by category)", hFacts:"Fact sheet", hFaq:"FAQ",
    hOther:(u)=>`Other marketplaces in ${u}`, hWhat:(ad)=>`What is ${ad}?`, hWho:"Who is it for?", hStart:"How to start?", hReqs:"Requirements", hPros:"Pros", hCons:"Watch out for",
    fixedComm:"Fixed commission:", catHead:"Category", commHead:"Commission",
    fCountry:"Country / market", fCurrency:"Currency", fVat:`${TAX.en} / tax`, fRange:"Commission range", fBase:"Commission base", fAnnounced:"Advertised rate", fStatus:"Data status",
    vBaseNet:`price excl. ${TAX.en}`, vBaseGross:`price incl. ${TAX.en}`, vInclYes:`${TAX.en} INCLUDED`, vInclNo:`excl. ${TAX.en} (+${TAX.en})`,
    gAnnounced:"Advertised commission", gHidden:"hidden", gTotal:"Total marketplace deduction", gSub:`${TAX.en} · fixed fees · transaction`, gPts:(n)=>`+${n} pts`,
    gSentence:(k,i,t)=>`${k} says “${i}% commission”; with ${TAX.en} and fixed fees the total marketplace deduction rises to ${t}%. Add shipping, ads and product cost to see your real operating profit.`,
    q1:(ad)=>`How much is ${ad}'s commission?`, a1:(ad,cats,ar,incl)=>`${ad} commission ${cats?`ranges from ${ar} by category`:`is ${ar}`}. ${incl?`The rate includes ${TAX.en}.`:`${TAX.en} is added on top of the rate.`}`,
    q2:(k)=>`How much is really deducted per sale on ${k}?`, a2:(i,t)=>`On the advertised ${i}% commission, adding ${TAX.en} and fixed fees brings the total marketplace deduction to about ${t}%.`,
    q3:(ad)=>`What is the ${TAX.en} rate for ${ad}?`, a3:(u,vat,bt)=>`${u} standard ${TAX.en} is ${vat}%. Commission base: ${bt}.`,
    crumbHome:"Home", crumbMk:"Marketplaces", srcWord:"Source", statusWord:"Data status",
    srcTail:`${BRAND} shows the source and verification date with each rate, separating estimated from verified data.`,
    calcWord:"Calculator",tagline:"Do e-commerce right",
    idxTitle:`Marketplace commission rates — 136 marketplaces, 37 countries | ${BRAND}`, idxDesc:"Commission rates, tax, fixed fees and the real cost of selling across 136 marketplaces in 37 countries. Sourced and dated.",
    idxH1:"Marketplace commission rates", idxIntro:"Commission, tax and the real cost of selling across 136 marketplaces in 37 countries.",
  },
  de:{
    title:(ad)=>`${ad} Provisionen & Gebühren ${YEAR} — die wahren Verkaufskosten | ${BRAND}`,
    desc:(ad,ulke,cats,ar,vat,tah)=>`${ad} (${ulke}) Provisionssätze${cats?` nach Kategorie (${ar})`:` ${ar}`}, ${TAX.de} ${vat}%, Fixgebühren und der Gewinn, der dir pro Verkauf wirklich bleibt. ${tah?"Geschätzter Satz.":"Mit Quelle und Datum."}`,
    h1:(ad)=>`${ad} Provisionssätze und Verkaufskosten`,
    estWarn:(ad)=>`⚠︎ Diese Sätze sind Schätzungen — das offizielle ${ad}-Gebührendokument war nicht erreichbar. Prüfe sie in deinem eigenen Verkäuferkonto.`,
    cta:(k)=>`${k}-Gewinn berechnen →`, hRates:"Provisionssätze (nach Kategorie)", hFacts:"Datenblatt", hFaq:"Häufige Fragen",
    hOther:(u)=>`Weitere Marktplätze in ${u}`, hWhat:(ad)=>`Was ist ${ad}?`, hWho:"Für wen?", hStart:"Wie fängt man an?", hReqs:"Voraussetzungen", hPros:"Vorteile", hCons:"Zu beachten",
    fixedComm:"Feste Provision:", catHead:"Kategorie", commHead:"Provision",
    fCountry:"Land / Markt", fCurrency:"Währung", fVat:`${TAX.de} / Steuer`, fRange:"Provisionsspanne", fBase:"Provisionsbasis", fAnnounced:"Angegebener Satz", fStatus:"Datenstatus",
    vBaseNet:`Preis exkl. ${TAX.de}`, vBaseGross:`Preis inkl. ${TAX.de}`, vInclYes:`inkl. ${TAX.de}`, vInclNo:`exkl. ${TAX.de} (+${TAX.de})`,
    gAnnounced:"Angegebene Provision", gHidden:"versteckt", gTotal:"Gesamtabzug Marktplatz", gSub:`${TAX.de} · Fixgebühren · Transaktion`, gPts:(n)=>`+${n} Pkt.`,
    gSentence:(k,i,t)=>`${k} nennt „${i}% Provision“; mit ${TAX.de} und Fixgebühren steigt der Gesamtabzug auf ${t}%. Rechne Versand, Werbung und Einkaufspreis hinzu, um deinen echten operativen Gewinn zu sehen.`,
    q1:(ad)=>`Wie hoch ist die Provision von ${ad}?`, a1:(ad,cats,ar,incl)=>`Die ${ad}-Provision ${cats?`liegt je nach Kategorie zwischen ${ar}`:`beträgt ${ar}`}. ${incl?`Der Satz enthält ${TAX.de}.`:`${TAX.de} kommt auf den Satz hinzu.`}`,
    q2:(k)=>`Wie viel wird pro Verkauf bei ${k} wirklich abgezogen?`, a2:(i,t)=>`Zur angegebenen Provision von ${i}% steigt der Gesamtabzug mit ${TAX.de} und Fixgebühren auf etwa ${t}%.`,
    q3:(ad)=>`Wie hoch ist der ${TAX.de}-Satz für ${ad}?`, a3:(u,vat,bt)=>`Der Standard-${TAX.de}-Satz in ${u} beträgt ${vat}%. Provisionsbasis: ${bt}.`,
    crumbHome:"Startseite", crumbMk:"Marktplätze", srcWord:"Quelle", statusWord:"Datenstatus",
    srcTail:`${BRAND} zeigt zu jedem Satz Quelle und Prüfdatum und trennt geschätzte von verifizierten Daten.`,
    calcWord:"Rechner",tagline:"E-Commerce richtig machen",
    idxTitle:`Marktplatz-Provisionssätze — 136 Marktplätze, 37 Länder | ${BRAND}`, idxDesc:"Provisionssätze, Steuer, Fixgebühren und die wahren Verkaufskosten auf 136 Marktplätzen in 37 Ländern. Mit Quelle und Datum.",
    idxH1:"Marktplatz-Provisionssätze", idxIntro:"Provision, Steuer und die wahren Verkaufskosten auf 136 Marktplätzen in 37 Ländern.",
  },
  fr:{
    title:(ad)=>`${ad} commissions & frais ${YEAR} — le vrai coût de vente | ${BRAND}`,
    desc:(ad,ulke,cats,ar,vat,tah)=>`Taux de commission ${ad} (${ulke})${cats?` par catégorie (${ar})`:` ${ar}`}, ${TAX.fr} ${vat}%, frais fixes et le bénéfice réellement conservé par vente. ${tah?"Taux estimé.":"Sourcé et daté."}`,
    h1:(ad)=>`Commissions ${ad} et coût de vente`,
    estWarn:(ad)=>`⚠︎ Ces taux sont estimés — le document officiel des frais ${ad} n'a pas pu être consulté. Vérifie-les dans ton espace vendeur.`,
    cta:(k)=>`Calculer le profit ${k} →`, hRates:"Taux de commission (par catégorie)", hFacts:"Fiche technique", hFaq:"Questions fréquentes",
    hOther:(u)=>`Autres places de marché en ${u}`, hWhat:(ad)=>`Qu'est-ce que ${ad} ?`, hWho:"Pour qui ?", hStart:"Comment démarrer ?", hReqs:"Prérequis", hPros:"Avantages", hCons:"À surveiller",
    fixedComm:"Commission fixe :", catHead:"Catégorie", commHead:"Commission",
    fCountry:"Pays / marché", fCurrency:"Devise", fVat:`${TAX.fr} / taxe`, fRange:"Fourchette de commission", fBase:"Base de commission", fAnnounced:"Taux affiché", fStatus:"Statut des données",
    vBaseNet:`prix HT`, vBaseGross:`prix TTC`, vInclYes:`${TAX.fr} INCLUSE`, vInclNo:`HT (+${TAX.fr})`,
    gAnnounced:"Commission affichée", gHidden:"caché", gTotal:"Prélèvement total", gSub:`${TAX.fr} · frais fixes · transaction`, gPts:(n)=>`+${n} pts`,
    gSentence:(k,i,t)=>`${k} annonce « ${i}% de commission » ; avec la ${TAX.fr} et les frais fixes, le prélèvement total atteint ${t}%. Ajoute la livraison, la publicité et le coût produit pour voir ton vrai bénéfice d'exploitation.`,
    q1:(ad)=>`Quel est le taux de commission de ${ad} ?`, a1:(ad,cats,ar,incl)=>`La commission ${ad} ${cats?`varie de ${ar} selon la catégorie`:`est de ${ar}`}. ${incl?`Le taux inclut la ${TAX.fr}.`:`La ${TAX.fr} s'ajoute au taux.`}`,
    q2:(k)=>`Combien est réellement prélevé par vente sur ${k} ?`, a2:(i,t)=>`Sur la commission affichée de ${i}%, avec la ${TAX.fr} et les frais fixes, le prélèvement total atteint environ ${t}%.`,
    q3:(ad)=>`Quel est le taux de ${TAX.fr} pour ${ad} ?`, a3:(u,vat,bt)=>`Le taux de ${TAX.fr} standard en ${u} est de ${vat}%. Base de commission : ${bt}.`,
    crumbHome:"Accueil", crumbMk:"Places de marché", srcWord:"Source", statusWord:"Statut des données",
    srcTail:`${BRAND} affiche la source et la date de vérification avec chaque taux, en séparant les données estimées des données vérifiées.`,
    calcWord:"Calculateur",tagline:"Faire l'e-commerce comme il faut",
    idxTitle:`Taux de commission des places de marché — 136 places, 37 pays | ${BRAND}`, idxDesc:"Taux de commission, taxe, frais fixes et le vrai coût de vente sur 136 places de marché dans 37 pays. Sourcé et daté.",
    idxH1:"Taux de commission des places de marché", idxIntro:"Commission, taxe et vrai coût de vente sur 136 places de marché dans 37 pays.",
  },
  es:{
    title:(ad)=>`${ad} comisiones y tarifas ${YEAR} — el coste real de vender | ${BRAND}`,
    desc:(ad,ulke,cats,ar,vat,tah)=>`Comisiones de ${ad} (${ulke})${cats?` por categoría (${ar})`:` ${ar}`}, ${TAX.es} ${vat}%, tarifas fijas y el beneficio que realmente te queda por venta. ${tah?"Tasa estimada.":"Con fuente y fecha."}`,
    h1:(ad)=>`Comisiones de ${ad} y coste de vender`,
    estWarn:(ad)=>`⚠︎ Estas tasas son estimaciones — no se pudo acceder al documento oficial de tarifas de ${ad}. Verifícalas en tu propio panel de vendedor.`,
    cta:(k)=>`Calcular beneficio en ${k} →`, hRates:"Comisiones (por categoría)", hFacts:"Ficha", hFaq:"Preguntas frecuentes",
    hOther:(u)=>`Otros marketplaces en ${u}`, hWhat:(ad)=>`¿Qué es ${ad}?`, hWho:"¿Para quién?", hStart:"¿Cómo empezar?", hReqs:"Requisitos", hPros:"Ventajas", hCons:"A tener en cuenta",
    fixedComm:"Comisión fija:", catHead:"Categoría", commHead:"Comisión",
    fCountry:"País / mercado", fCurrency:"Moneda", fVat:`${TAX.es} / impuesto`, fRange:"Rango de comisión", fBase:"Base de comisión", fAnnounced:"Tasa anunciada", fStatus:"Estado de los datos",
    vBaseNet:`precio sin ${TAX.es}`, vBaseGross:`precio con ${TAX.es}`, vInclYes:`${TAX.es} INCLUIDO`, vInclNo:`sin ${TAX.es} (+${TAX.es})`,
    gAnnounced:"Comisión anunciada", gHidden:"oculto", gTotal:"Deducción total del marketplace", gSub:`${TAX.es} · tarifas fijas · transacción`, gPts:(n)=>`+${n} pts`,
    gSentence:(k,i,t)=>`${k} dice «${i}% de comisión»; con ${TAX.es} y tarifas fijas la deducción total sube al ${t}%. Añade envío, publicidad y coste de producto para ver tu beneficio operativo real.`,
    q1:(ad)=>`¿Cuánto es la comisión de ${ad}?`, a1:(ad,cats,ar,incl)=>`La comisión de ${ad} ${cats?`varía entre ${ar} según la categoría`:`es ${ar}`}. ${incl?`La tasa incluye ${TAX.es}.`:`El ${TAX.es} se añade sobre la tasa.`}`,
    q2:(k)=>`¿Cuánto se deduce realmente por venta en ${k}?`, a2:(i,t)=>`Sobre la comisión anunciada del ${i}%, con ${TAX.es} y tarifas fijas la deducción total llega a cerca del ${t}%.`,
    q3:(ad)=>`¿Cuál es el tipo de ${TAX.es} de ${ad}?`, a3:(u,vat,bt)=>`El ${TAX.es} estándar en ${u} es del ${vat}%. Base de comisión: ${bt}.`,
    crumbHome:"Inicio", crumbMk:"Marketplaces", srcWord:"Fuente", statusWord:"Estado de los datos",
    srcTail:`${BRAND} muestra la fuente y la fecha de verificación con cada tasa, separando los datos estimados de los verificados.`,
    calcWord:"Calculadora",tagline:"Haz bien el e-commerce",
    idxTitle:`Comisiones de marketplaces — 136 marketplaces, 37 países | ${BRAND}`, idxDesc:"Comisiones, impuestos, tarifas fijas y el coste real de vender en 136 marketplaces de 37 países. Con fuente y fecha.",
    idxH1:"Comisiones de marketplaces", idxIntro:"Comisión, impuesto y coste real de vender en 136 marketplaces de 37 países.",
  },
  it:{
    title:(ad)=>`${ad} commissioni e costi ${YEAR} — il costo reale di vendita | ${BRAND}`,
    desc:(ad,ulke,cats,ar,vat,tah)=>`Commissioni ${ad} (${ulke})${cats?` per categoria (${ar})`:` ${ar}`}, ${TAX.it} ${vat}%, costi fissi e il profitto che ti resta davvero per vendita. ${tah?"Tasso stimato.":"Con fonte e data."}`,
    h1:(ad)=>`Commissioni ${ad} e costo di vendita`,
    estWarn:(ad)=>`⚠︎ Questi tassi sono stime — il documento ufficiale delle commissioni ${ad} non è stato raggiungibile. Verifica nel tuo pannello venditore.`,
    cta:(k)=>`Calcola il profitto ${k} →`, hRates:"Commissioni (per categoria)", hFacts:"Scheda", hFaq:"Domande frequenti",
    hOther:(u)=>`Altri marketplace in ${u}`, hWhat:(ad)=>`Cos'è ${ad}?`, hWho:"Per chi?", hStart:"Come iniziare?", hReqs:"Requisiti", hPros:"Vantaggi", hCons:"Attenzione a",
    fixedComm:"Commissione fissa:", catHead:"Categoria", commHead:"Commissione",
    fCountry:"Paese / mercato", fCurrency:"Valuta", fVat:`${TAX.it} / imposta`, fRange:"Fascia di commissione", fBase:"Base di commissione", fAnnounced:"Tasso indicato", fStatus:"Stato dei dati",
    vBaseNet:`prezzo ${TAX.it} escl.`, vBaseGross:`prezzo ${TAX.it} incl.`, vInclYes:`${TAX.it} INCLUSA`, vInclNo:`${TAX.it} escl. (+${TAX.it})`,
    gAnnounced:"Commissione indicata", gHidden:"nascosto", gTotal:"Trattenuta totale del marketplace", gSub:`${TAX.it} · costi fissi · transazione`, gPts:(n)=>`+${n} pti`,
    gSentence:(k,i,t)=>`${k} dichiara «${i}% di commissione»; con ${TAX.it} e costi fissi la trattenuta totale sale al ${t}%. Aggiungi spedizione, pubblicità e costo prodotto per vedere il profitto operativo reale.`,
    q1:(ad)=>`Quanto è la commissione di ${ad}?`, a1:(ad,cats,ar,incl)=>`La commissione ${ad} ${cats?`varia da ${ar} in base alla categoria`:`è ${ar}`}. ${incl?`Il tasso include l'${TAX.it}.`:`L'${TAX.it} si aggiunge al tasso.`}`,
    q2:(k)=>`Quanto viene davvero trattenuto per vendita su ${k}?`, a2:(i,t)=>`Sulla commissione indicata del ${i}%, con ${TAX.it} e costi fissi la trattenuta totale arriva a circa il ${t}%.`,
    q3:(ad)=>`Qual è l'aliquota ${TAX.it} di ${ad}?`, a3:(u,vat,bt)=>`L'${TAX.it} standard in ${u} è del ${vat}%. Base di commissione: ${bt}.`,
    crumbHome:"Home", crumbMk:"Marketplace", srcWord:"Fonte", statusWord:"Stato dei dati",
    srcTail:`${BRAND} mostra la fonte e la data di verifica con ogni tasso, separando i dati stimati da quelli verificati.`,
    calcWord:"Calcolatore",
    idxTitle:`Commissioni dei marketplace — 136 marketplace, 37 paesi | ${BRAND}`, idxDesc:"Commissioni, imposte, costi fissi e il costo reale di vendita su 136 marketplace in 37 paesi. Con fonte e data.",
    idxH1:"Commissioni dei marketplace", idxIntro:"Commissione, imposta e costo reale di vendita su 136 marketplace in 37 paesi.",
  },
};

// ---- yollar + hreflang ----
const relPage = (lang,k) => lang==="tr" ? `/pazaryeri/${k}.html` : `/${lang}/pazaryeri/${k}.html`;
const absPage = (lang,k) => BASE + relPage(lang,k);
const relHub  = (lang)   => lang==="tr" ? `/` : `/${lang}/`;
const absHub  = (lang)   => BASE + relHub(lang);
const hreflangPage = (k) => LANGS.map(l=>`<link rel="alternate" hreflang="${l}" href="${absPage(l,k)}">`).join("")
  + `<link rel="alternate" hreflang="x-default" href="${absPage('tr',k)}">`;
const hreflangHub = () => LANGS.map(l=>`<link rel="alternate" hreflang="${l}" href="${absHub(l)}">`).join("")
  + `<link rel="alternate" hreflang="x-default" href="${absHub('tr')}">`;

// ---- dil değiştirici (üstte) ----
const langNav = (kOrNull) => LANGS.map(l=>{
  const href = kOrNull ? relPage(l,kOrNull) : relHub(l);
  return `<a href="${href}" hreflang="${l}"${l===''?'':''}>${l.toUpperCase()}</a>`;
}).join(" ");

const CSS = `
:root{--ink:#0A0A0A;--muted:#606060;--line:#E3E3DF;--red:#B42318;--r:6px}
*{box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;color:var(--ink);margin:0;line-height:1.6;font-size:16px;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--ink);padding:16px 0;display:flex;align-items:center;justify-content:space-between}
.logo{font-family:'Fraunces',serif;font-weight:600;font-size:22px;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
.langs{font-size:12px;font-family:'JetBrains Mono',monospace;letter-spacing:.03em}.langs a{color:var(--muted);text-decoration:none;padding:0 3px}.langs a:hover{color:var(--ink)}
.crumb{font-size:13px;color:var(--muted);margin:20px 0 6px}.crumb a{color:var(--muted)}
h1{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(28px,5vw,40px);line-height:1.05;letter-spacing:-.02em;margin:6px 0 10px}
h2{font-family:'Fraunces',serif;font-weight:600;font-size:24px;letter-spacing:-.01em;margin:32px 0 10px}
h3{font-size:16px;margin:16px 0 4px}
.mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}.muted{color:var(--muted)}.sm{font-size:14px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:15px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.r{text-align:right}
.gap{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border:1px solid var(--ink);border-radius:var(--r);overflow:hidden;margin:18px 0 8px}
.gap-a,.gap-r{padding:16px 18px}.gap-r{text-align:right}.gap-k{font-size:12px;color:var(--muted)}.gap-v{font-size:34px;font-weight:700;line-height:1}
.gap-a .gap-v{font-size:26px;color:#8A8A86}.gap-r .gap-v{font-size:44px}.gap-n{font-size:11px;color:var(--muted);margin-top:4px}
.gap-d{background:#FAF9F7;border-left:1px solid var(--line);border-right:1px solid var(--line);padding:10px 14px;text-align:center;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--red);font-size:14px;display:flex;flex-direction:column}.gap-d span{font-size:10px;color:var(--muted);font-weight:400}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin:12px 0}.fact{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}.fact b{font-weight:600}
ul{padding-left:18px}li{margin:4px 0}
.cta{display:block;background:var(--ink);color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:var(--r);font-weight:600;margin:24px 0}
.est{background:#FBF6EC;border:1px solid #e6c78c;border-radius:var(--r);padding:12px 14px;font-size:13.5px;color:#5c4415;margin:14px 0}
.faq{border-bottom:1px solid var(--line);padding:6px 0}.src{font-size:13px;color:var(--muted);margin-top:8px}
footer{border-top:1px solid var(--ink);margin-top:40px;padding:24px 0;font-size:13px;color:var(--muted)}
.calc{border:1px solid var(--ink);border-radius:var(--r);padding:18px;margin:20px 0;background:#FAFAF8}
.calc .crow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.calc label{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}
.calc input,.calc select{width:100%;padding:11px;border:1px solid var(--line);border-radius:var(--r);font-size:15px;font-family:inherit;background:#fff;color:var(--ink)}
.calc .out{border-top:1px solid var(--line);margin-top:4px;padding-top:12px}
.calc .ln{display:flex;justify-content:space-between;padding:5px 0;font-size:14px}
.calc .ln.neg span:last-child{color:var(--red)}
.calc .net{display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid var(--ink);margin-top:8px;padding-top:12px}
.calc .net b{font-size:30px;font-family:'JetBrains Mono',monospace;line-height:1}
.calc .marj{font-size:13px;color:var(--muted);margin-top:4px}
.trust{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin:10px 0 2px}.trust span{display:inline-flex;align-items:center;gap:5px}
.xl{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.xl a{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:6px 12px;text-decoration:none;color:var(--ink)}.xl a:hover{border-color:var(--ink)}
@media(max-width:560px){.gap{grid-template-columns:1fr}.gap-r{text-align:left}.facts{grid-template-columns:1fr}.calc .crow{grid-template-columns:1fr}}`;

const HESAP_MK = new Set(['trendyol','hepsiburada','n11','amazontr','ciceksepeti']);
function sayfa(k, lang){
  const t = T[lang], m = MK[k], co = CO[m.co]||{}, I = INFO[k]||{}, p = provOf(k);
  const ad = yerelAd(m, lang), kisa = mkShort(ad), ulke = ulkeAd(m.co, lang), url = absPage(lang,k);
  const aralik = oranAraligi(m), gap = pazaryeriKesintisi(m, co);
  const tahmin = (p.tier==="estimate"||p.tier==="expired");
  const cats = !!(m.cats&&m.cats.length);
  const durum = durumEtiket(p, lang);
  const title = t.title(ad), desc = t.desc(ad, ulke, cats, aralik, co.vat, tahmin);
  const baseText = m.base==="net" ? t.vBaseNet : t.vBaseGross;
  const tablo = cats
    ? `<table><thead><tr><th>${esc(t.catHead)}</th><th class="r">${esc(t.commHead)}</th></tr></thead><tbody>${m.cats.map(c=>`<tr><td>${esc(catAd(c[0],lang))}</td><td class="r mono">%${c[1]}</td></tr>`).join("")}</tbody></table>`
    : `<p>${esc(t.fixedComm)} <b class="mono">${aralik}</b></p>`;
  const kunye = [
    [t.fCountry, `${co.fl||""} ${ulke}`],[t.fCurrency, (co.cur||"").trim()],[t.fVat, "%"+(co.vat!=null?co.vat:"—")],
    [t.fRange, aralik],[t.fBase, baseText],[t.fAnnounced, m.comVatIncl?t.vInclYes:t.vInclNo],[t.fStatus, durum],
  ].map(x=>`<div class="fact"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
  const gapBlok = gap ? `
  <section class="gap">
    <div class="gap-a"><div class="gap-k">${esc(t.gAnnounced)}</div><div class="gap-v mono">%${gap.ilanRate}</div></div>
    <div class="gap-d">${esc(t.gPts(Math.max(0,Math.round(gap.toplamPct-gap.ilanRate))))}<span>${esc(t.gHidden)}</span></div>
    <div class="gap-r"><div class="gap-k" style="color:var(--red)">${esc(t.gTotal)}</div><div class="gap-v mono" style="color:var(--red)">%${gap.toplamPct}</div><div class="gap-n">${esc(t.gSub)}</div></div>
  </section>
  <p class="muted sm">${esc(t.gSentence(kisa, gap.ilanRate, gap.toplamPct))}</p>` : "";
  const liste = (b,a)=>Array.isArray(a)&&a.length?`<h2>${esc(b)}</h2><ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"";
  // about/who/listeler yalnız Türkçe metin — sadece TR sayfalarda göster.
  // Diğer diller localize başlık/desc/tablo/künye/FAQ ile zaten özgün; Türkçe prose basmıyoruz.
  const bilgi = lang==="tr"
    ? (I.about?`<h2>${esc(t.hWhat(ad))}</h2><p>${esc(I.about)}</p>`:"")+(I.who?`<h2>${esc(t.hWho)}</h2><p>${esc(I.who)}</p>`:"")
      + liste(t.hStart, I.start) + liste(t.hReqs, I.reqs) + liste(t.hPros, I.pros) + liste(t.hCons, I.cons)
    : "";
  const ilgili = Object.keys(MK).filter(x=>x!==k&&MK[x].co===m.co).slice(0,6).map(x=>`<a href="${x}.html">${esc(yerelAd(MK[x],lang))}</a>`).join(" · ");
  const faqlar = [
    [t.q1(ad), t.a1(ad, cats, aralik, m.comVatIncl)],
    gap?[t.q2(kisa), t.a2(gap.ilanRate, gap.toplamPct)]:null,
    [t.q3(ad), t.a3(ulke, co.vat, baseText)],
  ].filter(Boolean);
  const faqHtml = `<h2>${esc(t.hFaq)}</h2>`+faqlar.map(f=>`<div class="faq"><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></div>`).join("");
  const jsonld = {"@context":"https://schema.org","@type":"FAQPage","inLanguage":lang,"mainEntity":faqlar.map(f=>({"@type":"Question","name":f[0],"acceptedAnswer":{"@type":"Answer","text":f[1]}}))};
  const breadcrumb = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":BRAND,"item":absHub(lang)},
    {"@type":"ListItem","position":2,"name":t.crumbMk,"item":absHub(lang)},
    {"@type":"ListItem","position":3,"name":ad,"item":url}]};
  const kaynak = m.source?`<a href="${esc(m.source)}" target="_blank" rel="noopener nofollow">${esc(m.sourceLabel||t.srcWord)} ↗</a>`:(m.sourceLabel||"—");
  return `<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta name="robots" content="index,follow">
${hreflangPage(k)}
<meta property="og:type" content="article"><meta property="og:locale" content="${lang}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${CSS}</style></head><body>
<header><div class="wrap" style="display:flex;align-items:center;justify-content:space-between;width:100%"><a class="logo" href="${absHub(lang)}">${BRAND.toLowerCase()}</a><nav class="langs">${langNav(k)}</nav></div></header>
<main class="wrap">
  <div class="crumb"><a href="${absHub(lang)}">${esc(t.crumbHome)}</a> / <a href="${absHub(lang)}">${esc(t.crumbMk)}</a> / ${esc(ad)}</div>
  <h1>${esc(t.h1(ad))}</h1>
  <p class="muted">${esc(co.fl||"")} ${esc(ulke)} · ${esc(TAX[lang])} %${co.vat} · ${esc((co.cur||"").trim())} · ${esc(durum)}</p>
  ${tahmin?`<div class="est">${esc(t.estWarn(ad))}</div>`:""}
  ${gapBlok}
  <a class="cta" href="${APP}?lang=${(lang==="tr"||lang==="en")?lang:"en"}#/pazaryeri/${k}">${esc(t.cta(kisa))}</a>
  ${(lang==='tr'&&HESAP_MK.has(k))?`<p class="muted sm" style="margin-top:-16px;margin-bottom:22px">⚡ <a href="${BASE}/pazaryeri/${k}-komisyon-hesaplama.html"><b>${esc(ad)} komisyon hesaplama</b></a> — fiyatını gir, sayfada anında net kârını gör.</p>`:''}
  <h2>${esc(t.hRates)}</h2>
  ${m.note?`<p class="muted sm">${esc(m.note)}</p>`:""}
  ${tablo}
  <h2>${esc(t.hFacts)}</h2><div class="facts">${kunye}</div>
  ${bilgi}
  ${faqHtml}
  ${ilgili?`<h2>${esc(t.hOther(ulke))}</h2><p>${ilgili}</p>`:""}
  <p class="src">${esc(t.srcWord)}: ${kaynak} · ${esc(t.statusWord)}: ${esc(durum)}. ${esc(t.srcTail)}</p>
</main>
<footer><div class="wrap">© ${YEAR} ${BRAND} · ${esc(t.tagline)} · <a href="${APP}">${esc(t.calcWord)}</a></div></footer>
</body></html>`;
}

function hub(lang){
  const t = T[lang];
  const byUlke = {};
  Object.keys(MK).forEach(k => { const u = ulkeAd(MK[k].co, lang); (byUlke[u]=byUlke[u]||[]).push(k); });
  const govde = Object.entries(byUlke).sort().map(([u,ks]) =>
    `<h2>${esc(u)}</h2><ul>${ks.map(k=>`<li><a href="pazaryeri/${k}.html">${esc(yerelAd(MK[k],lang))} — ${oranAraligi(MK[k])}</a></li>`).join("")}</ul>`).join("\n");
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.idxTitle)}</title><meta name="description" content="${esc(t.idxDesc)}">
<link rel="canonical" href="${absHub(lang)}">${hreflangHub()}
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>body{font-family:'Inter',sans-serif;max-width:820px;margin:0 auto;padding:20px;color:#0A0A0A;line-height:1.6}h1{font-family:'Fraunces',serif;font-size:36px;letter-spacing:-.02em}h2{font-family:'Fraunces',serif;font-size:22px;margin-top:28px}a{color:#0A0A0A}ul{padding-left:18px}li{margin:4px 0}.langs{font-family:monospace;font-size:12px;margin:8px 0 16px}.langs a{color:#606060;text-decoration:none;padding:0 4px}</style></head>
<body><nav class="langs">${langNav(null)}</nav><h1>${esc(t.idxH1)}</h1><p>${esc(t.idxIntro)}</p>${govde}</body></html>`;
}

// ---- yaz ----
const keys = Object.keys(MK);
LANGS.forEach(lang => {
  const dir = lang==="tr" ? OUT : `${OUT}${lang}/`;
  fs.mkdirSync(dir + "pazaryeri", { recursive: true });
  keys.forEach(k => fs.writeFileSync(`${dir}pazaryeri/${k}.html`, sayfa(k, lang)));
  fs.writeFileSync(`${dir}index.html`, hub(lang));
});

// ---- i18n sitemap (her URL + dil alternatifleri) ----
const today = new Date().toISOString().slice(0,10);
const entries = [];
// hub'lar
LANGS.forEach(lang => entries.push({ loc: absHub(lang), alts: LANGS.map(l=>[l, absHub(l)]) }));
// sayfalar
keys.forEach(k => LANGS.forEach(lang => entries.push({ loc: absPage(lang,k), alts: LANGS.map(l=>[l, absPage(l,k)]) })));

// ==== TIER 1: niyet (hesaplama) + karşılaştırma sayfaları — TR, SEO büyüme ====
(function(){
  fs.mkdirSync(OUT+"karsilastir", { recursive:true });
  const shell=(title,desc,url,jsonlds,body)=>`<!DOCTYPE html><html lang="tr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta name="robots" content="index,follow">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/marka/og-hesaplama.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${BASE}/marka/og-hesaplama.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
${jsonlds.map(j=>`<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("")}
<style>${CSS}</style></head><body>
<header><div class="wrap" style="display:flex;align-items:center;justify-content:space-between;width:100%"><a class="logo" href="${absHub('tr')}">${BRAND.toLowerCase()}</a></div></header>
<main class="wrap">${body}</main>
<footer><div class="wrap">© ${YEAR} ${BRAND} · <a href="${APP}">Hesap makinesi</a></div></footer>
</body></html>`;
  const faqLD=a=>({"@context":"https://schema.org","@type":"FAQPage","inLanguage":"tr","mainEntity":a.map(f=>({"@type":"Question","name":f[0],"acceptedAnswer":{"@type":"Answer","text":f[1]}}))});
  const bcLD=(n,u)=>({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":BRAND,"item":absHub('tr')},{"@type":"ListItem","position":2,"name":n,"item":u}]});
  const made=[];
  const HT_LD=(ad)=>({"@context":"https://schema.org","@type":"HowTo","name":`${ad} komisyon hesaplama`,"inLanguage":"tr","step":[
    {"@type":"HowToStep","position":1,"name":"Satış fiyatını gir","text":"Ürünün KDV dahil satış fiyatını yaz."},
    {"@type":"HowToStep","position":2,"name":"Kategori veya oran seç","text":"Ürün kategorini seç; araç o kategorinin komisyon oranını uygular."},
    {"@type":"HowToStep","position":3,"name":"Maliyet ve kargoyu ekle","text":"Ürün maliyetini ve varsa kargo tutarını gir."},
    {"@type":"HowToStep","position":4,"name":"Net kârı gör","text":"Komisyon, KDV, hizmet bedeli, kargo ve maliyet sonrası cebine kalan net anında hesaplanır."}]});
  const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const SIB=[['trendyol','Trendyol'],['hepsiburada','Hepsiburada'],['n11','N11'],['amazontr','Amazon TR'],['ciceksepeti','Çiçeksepeti']];
  function intent(k,kind){
    const m=MK[k]; if(!m) return;
    const ad=yerelAd(m,'tr'), kisa=mkShort(ad), co=CO[m.co]||{}, aralik=oranAraligi(m), gap=pazaryeriKesintisi(m,co);
    const kindT= kind==='kar'?'Kâr':(kind==='fba'?'FBA Ücret':'Komisyon');
    const slug=k+'-'+(kind==='kar'?'kar':(kind==='fba'?'fba-ucret':'komisyon'))+'-hesaplama';
    const url=BASE+'/pazaryeri/'+slug+'.html';
    const title=`${ad} ${kindT} Hesaplama ${YEAR} | ${BRAND}`;
    const desc=`${ad} ${kindT.toLowerCase()} hesaplama aracı: fiyatını ve kategorini gir; komisyon ${aralik}, KDV %${co.vat}, hizmet bedeli ve kargo sonrası net kârını sayfada anında hesapla.`;
    const cur=(((co.cur||'₺')+'').trim())||'₺';
    const vat=co.vat||0, comIncl=!!m.comVatIncl, rMed=temsilciOran(m);
    const hasCats=!!(m.cats&&m.cats.length);
    const CD={vat,comIncl,cur,pct:(m.pct||[]).map(p=>[String(p[0]),(p[1]!=null?p[1]:(parseFloat(p[0])||0))]),fixed:(m.fixed||[]).map(f=>[String(f[0]),(f[1]!=null?f[1]:0)])};
    // sunucu-tarafı örnek (500 KDV dahil, medyan oran)
    const S=500, kom=+(S*(rMed||0)/100).toFixed(2), komKDV=comIncl?0:+(kom*vat/100).toFixed(2);
    let ekP=0; CD.pct.forEach(p=>ekP+=S*p[1]/100); let ekF=0; CD.fixed.forEach(f=>ekF+=f[1]);
    const kesinti=+(kom+komKDV+ekP+ekF).toFixed(2), netOrnek=+(S-kesinti).toFixed(2);
    const tablo=hasCats?`<table><thead><tr><th>Kategori</th><th class="r">Komisyon</th></tr></thead><tbody>${m.cats.map(c=>`<tr><td>${esc(catAd(c[0],'tr'))}</td><td class="r mono">%${c[1]}</td></tr>`).join("")}</tbody></table>`:`<p>Komisyon: <b class="mono">${aralik}</b></p>`;
    const selOrInput = hasCats
      ? `<div><label>Kategori</label><select id="nvK">${m.cats.map(c=>`<option value="${c[1]}"${c[1]===rMed?' selected':''}>${esc(catAd(c[0],'tr'))} — %${c[1]}</option>`).join("")}</select></div>`
      : `<div><label>Komisyon oranı (%)</label><input id="nvK" type="number" min="0" step="0.1" value="${rMed!=null?rMed:(m.fixedRate||0)}"></div>`;
    const matrah = m.co==='TR' ? `<h2>Pazaryerleri neden farklı net bırakır?</h2>
<p>Aynı komisyon oranı farklı net bırakır; çünkü matrah ve komisyona KDV kuralı pazaryerine göre değişir. Bu yüzden "en düşük oran" her zaman "en yüksek kâr" değildir.</p>
<table><thead><tr><th>Pazaryeri</th><th>Komisyon matrahı</th><th>Komisyona KDV</th><th>Ek kalem</th></tr></thead><tbody>
<tr><td>Trendyol</td><td>KDV hariç tutar</td><td>Hayır</td><td>Yok</td></tr>
<tr><td>Hepsiburada</td><td>KDV dahil fiyat</td><td>Evet</td><td>Yok</td></tr>
<tr><td>n11</td><td>KDV dahil fiyat</td><td>Evet</td><td>~%1,67 hizmet bedeli</td></tr>
<tr><td>Amazon TR</td><td>Toplam satış fiyatı</td><td>Hayır</td><td>Aylık üyelik</td></tr>
</tbody></table>` : '';
    const faq=[
      [`${ad} komisyonu nasıl hesaplanır?`, `Formül: komisyon = satış fiyatı × kategori oranı. ${kisa} komisyonu kategoriye göre ${aralik} arasında değişir.${comIncl?'':` Komisyonun üzerine ayrıca %${vat} KDV eklenir.`} Net kâr için bunun üstüne hizmet bedeli, kargo ve ürün maliyeti de düşülür; yukarıdaki araç hepsini birden hesaplar.`],
      [`500 ${cur} satışta ${kisa} ne kadar kesinti alır?`, `Medyan %${rMed} oranla komisyon ${kom} ${cur}${komKDV?`, komisyon KDV'si ${komKDV} ${cur}`:''}${(ekP+ekF)?`, ek bedel ${(ekP+ekF).toFixed(2)} ${cur}`:''} = toplam ~${kesinti} ${cur} kesinti; pazaryeri sonrası ${netOrnek} ${cur} kalır (ürün maliyeti ve kargo hariç). Kendi kategorin ve fiyatınla kesin sonucu yukarıda gör.`],
      [`Komisyona KDV ekleniyor mu?`, comIncl?`${kisa}'da komisyon tutarına ayrıca KDV eklenmez; araç bunu otomatik uygular.`:`${kisa}'da komisyon tutarının üzerine %${vat} KDV eklenir; araç bu satırı ayrı gösterir.`],
      [`Kargo ve iade dahil net kâr nasıl bulunur?`, `Satış fiyatından komisyon + KDV + hizmet bedeli + kargo + ürün maliyeti çıkarılır. Çoğu araç kargoyu dışarıda bırakır; Netvo'nun hesap makinesinde kargo alanını da doldurup cebine gerçekten kalanı görebilirsin.`],
      [`${ad} komisyon oranları kaç?`, `Kategoriye göre ${aralik} arasında değişir. Tam liste aşağıdaki tabloda; kaynak ${kisa} resmî komisyon listesidir.`],
      [`İlan edilen komisyon ile cebime kalan neden farklı?`, gap?`İlan edilen komisyon ~%${gap.ilanRate} görünse de KDV, hizmet bedeli ve sabit ücretlerle toplam pazaryeri kesintisi ~%${gap.toplamPct}'e çıkabilir. Üstüne kargo ve ürün maliyeti de eklenince cebine kalan belirgin düşer.`:`Komisyonun üstüne KDV, hizmet bedeli, kargo ve ürün maliyeti eklenir; bu yüzden ilan edilen oran gerçek kesintinin sadece bir parçasıdır.`],
      [`Kâr hesaplama ile komisyon hesaplama aynı şey mi?`, `Hayır. Komisyon hesaplama yalnızca pazaryeri kesintisini verir; kâr hesaplama bunun üstüne kargo, ürün maliyeti ve iade payını da ekler. Yukarıdaki araç ikisini birden yapar.`],
      [`Oranlar ne kadar güncel?`, `Oranlar pazaryerinin resmî komisyon belgelerinden alınır ve dönemsel revize edilir; önemli kararlarda kendi satıcı panelinden teyit et.`],
    ];
    const calc=`<div class="calc">
<div class="crow"><div><label>Satış fiyatı (${cur}, KDV dahil)</label><input id="nvS" type="number" min="0" value="500"></div><div><label>Ürün maliyeti (${cur})</label><input id="nvC" type="number" min="0" value="0"></div></div>
<div class="crow">${selOrInput}<div><label>Kargo (${cur}, opsiyonel)</label><input id="nvG" type="number" min="0" value="0"></div></div>
<div class="out" id="nvO"></div></div>
<script>(function(){var D=${JSON.stringify(CD)};function n(x){return parseFloat(x)||0}function f(x){return x.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+D.cur}
function run(){var S=n(document.getElementById('nvS').value),C=n(document.getElementById('nvC').value),G=n(document.getElementById('nvG').value),r=n(document.getElementById('nvK').value);
var kom=S*r/100,komKDV=D.comIncl?0:kom*D.vat/100,ekP=0;D.pct.forEach(function(p){ekP+=S*p[1]/100});var ekF=0;D.fixed.forEach(function(x){ekF+=x[1]});
var kes=kom+komKDV+ekP+ekF,net=S-kes-C-G,marj=S>0?net/S*100:0;
var h='<div class="ln neg"><span>Komisyon (%'+r+')</span><span>-'+f(kom)+'</span></div>';
if(komKDV>0)h+='<div class="ln neg"><span>Komisyon KDV eki</span><span>-'+f(komKDV)+'</span></div>';
if(ekP>0)h+='<div class="ln neg"><span>Hizmet/işlem bedeli</span><span>-'+f(ekP)+'</span></div>';
if(ekF>0)h+='<div class="ln neg"><span>Sabit ücret</span><span>-'+f(ekF)+'</span></div>';
if(C>0)h+='<div class="ln neg"><span>Ürün maliyeti</span><span>-'+f(C)+'</span></div>';
if(G>0)h+='<div class="ln neg"><span>Kargo</span><span>-'+f(G)+'</span></div>';
h+='<div class="net"><span>Cebine kalan net</span><b>'+f(net)+'</b></div><div class="marj">Marj: %'+marj.toFixed(1)+' &middot; Toplam pazaryeri kesintisi: '+f(kes)+'</div>';
document.getElementById('nvO').innerHTML=h;}
['nvS','nvC','nvG','nvK'].forEach(function(id){var e=document.getElementById(id);if(e){e.addEventListener('input',run);e.addEventListener('change',run);}});run();})();</script>`;
    const xlinks=SIB.filter(s=>s[0]!==k).map(s=>`<a href="${BASE}/pazaryeri/${s[0]}-komisyon-hesaplama.html">${esc(s[1])} komisyon</a>`).join("");
    const body=`<div class="crumb"><a href="${absHub('tr')}">Ana sayfa</a> / <a href="${absHub('tr')}">Pazaryerleri</a> / ${esc(ad)} ${esc(kindT)} Hesaplama</div>
<h1>${esc(ad)} ${esc(kindT)} Hesaplama (${YEAR})</h1>
<p class="muted">${esc(co.fl||'')} ${esc(ulkeAd(m.co,'tr'))} · KDV %${vat} · Komisyon ${esc(aralik)}</p>
<p>${esc(kisa)}'da bir ürün sattığında cebine ne kaldığını gör. İlan edilen komisyon gerçek kesintinin sadece bir parçası: KDV, hizmet/işlem bedeli ve kargo eklenince net kâr belirgin düşer. Satış fiyatını, kategorini ve maliyetini gir; ${esc(kisa)} için net kârını <b>bu sayfada anında</b> hesapla.</p>
${calc}
<div class="trust"><span>✓ Üyelik yok</span><span>✓ Reklam yok</span><span>✓ Kaynaklı oranlar</span><span>✓ Kargo dahil net</span></div>
${gap?`<section class="gap"><div class="gap-a"><div class="gap-k">İlan edilen</div><div class="gap-v mono">%${gap.ilanRate}</div></div><div class="gap-r"><div class="gap-k" style="color:var(--red)">Toplam kesinti</div><div class="gap-v mono" style="color:var(--red)">%${gap.toplamPct}</div></div></section>`:''}
<h2>${esc(ad)} komisyonu nasıl hesaplanır?</h2>
<p>Formül basit: <b>komisyon = satış fiyatı × kategori oranı</b>.${comIncl?'':` Komisyonun üzerine ayrıca %${vat} KDV eklenir.`} Net kâr için bunun üstüne hizmet bedeli, kargo ve ürün maliyetini de düşersin. Örnek: 500 ${cur} satış, medyan %${rMed} komisyon → komisyon ${kom} ${cur}${komKDV?` + KDV ${komKDV} ${cur}`:''}${(ekP+ekF)?` + ek bedel ${(ekP+ekF).toFixed(2)} ${cur}`:''} = toplam ${kesinti} ${cur} kesinti; pazaryeri sonrası <b>${netOrnek} ${cur}</b> kalır (ürün maliyeti ve kargo hariç).</p>
<h2>${esc(ad)} komisyon oranları (kategori kategori)</h2>${tablo}
${matrah}
<h2>Kargo ve iade: net kârı asıl bunlar belirler</h2>
<p>Çoğu "komisyon hesaplama" aracı yalnızca pazaryeri kesintisini gösterir; kargo ve iadeyi dışarıda bırakır. Oysa düşük marjlı bir üründe tek bir kargo ya da iade satırı kârı yarıya indirebilir. Yukarıdaki hesap makinesinde <b>kargo</b> alanını da doldurabilir, cebine gerçekten kalanı görebilirsin — ${esc(kisa)} için komisyon + KDV + kargo + maliyet sonrası net.</p>
<h2>Sık sorulan sorular</h2>${faq.map(f=>`<div class="faq"><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></div>`).join("")}
<h2>Diğer pazaryeri hesaplama araçları</h2>
<div class="xl">${xlinks}<a href="${APP}?lang=tr#/karsilastir">Tümünü karşılaştır</a></div>
<p class="muted sm"><a href="${BASE}/pazaryeri/${k}.html">${esc(ad)} ücret detayları</a> · Son güncelleme: ${AYLAR[new Date().getMonth()]} ${YEAR} · Kaynak: ${esc(kisa)} resmî komisyon listesi.</p>`;
    fs.writeFileSync(OUT+'pazaryeri/'+slug+'.html', shell(title,desc,url,[bcLD(`${ad} ${kindT} Hesaplama`,url),faqLD(faq),HT_LD(ad)],body));
    made.push(url);
  }
  function compare(k1,k2){
    const a=MK[k1], b=MK[k2]; if(!a||!b) return;
    const ad1=yerelAd(a,'tr'), ad2=yerelAd(b,'tr'), co1=CO[a.co]||{}, co2=CO[b.co]||{}, r1=oranAraligi(a), r2=oranAraligi(b);
    const slug=k1+'-'+k2, url=BASE+'/karsilastir/'+slug+'.html';
    const title=`${ad1} mu ${ad2} mu? Hangisi Daha Kârlı (${YEAR}) | ${BRAND}`;
    const desc=`${ad1} ve ${ad2} komisyon, KDV ve ek ücret karşılaştırması. Aynı üründe hangisi sana daha çok kâr bırakır — saniyede hesapla.`;
    const faq=[
      [`${ad1} mı ${ad2} mi daha ucuz komisyon?`, `${ad1} komisyonu ${r1}, ${ad2} komisyonu ${r2} aralığında. Ama net kâr sadece komisyonla belirlenmez; KDV, hizmet bedeli ve kargo da etkiler. Kendi kategorin ve fiyatınla ikisini yan yana hesapla.`],
      [`Aynı ürünü ikisinde de satsam ne değişir?`, `Fiyat aynı olsa bile komisyon oranı, ek ücretler ve kategori farkı net kârı değiştirir. Netvo aynı ürünü iki pazaryerinde yan yana kıyaslar.`],
    ];
    const body=`<div class="crumb"><a href="${absHub('tr')}">Ana sayfa</a> / <a href="${APP}?lang=tr#/karsilastir">Karşılaştır</a> / ${esc(ad1)} vs ${esc(ad2)}</div>
<h1>${esc(ad1)} mu ${esc(ad2)} mu — Hangisi Daha Kârlı?</h1>
<p>İki pazaryerinde de aynı ürünü satabilirsin ama sana kalan tutar farklı olur. Aşağıda komisyon ve vergi çerçevesini yan yana koyduk; kesin kararı kendi fiyat ve maliyetinle hesap makinesinde ver.</p>
<table><thead><tr><th></th><th class="r">${esc(ad1)}</th><th class="r">${esc(ad2)}</th></tr></thead><tbody>
<tr><td>Komisyon aralığı</td><td class="r mono">${r1}</td><td class="r mono">${r2}</td></tr>
<tr><td>KDV</td><td class="r mono">%${co1.vat}</td><td class="r mono">%${co2.vat}</td></tr>
<tr><td>Para birimi</td><td class="r">${esc((co1.cur||'').trim())}</td><td class="r">${esc((co2.cur||'').trim())}</td></tr>
</tbody></table>
<a class="cta" href="${APP}?lang=tr#/karsilastir">İkisini yan yana hesapla →</a>
<h2>Sık sorulan sorular</h2>${faq.map(f=>`<div class="faq"><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></div>`).join("")}
<p class="muted sm"><a href="${BASE}/pazaryeri/${k1}.html">${esc(ad1)} ücretleri</a> · <a href="${BASE}/pazaryeri/${k2}.html">${esc(ad2)} ücretleri</a></p>`;
    fs.writeFileSync(OUT+'karsilastir/'+slug+'.html', shell(title,desc,url,[bcLD(`${ad1} vs ${ad2}`,url),faqLD(faq)],body));
    made.push(url);
  }
  [['trendyol','komisyon'],['trendyol','kar'],['hepsiburada','komisyon'],['hepsiburada','kar'],['n11','komisyon'],['n11','kar'],['amazontr','komisyon'],['ciceksepeti','komisyon'],['ciceksepeti','kar'],['amazontr','fba']].forEach(x=>intent(x[0],x[1]));
  [['trendyol','hepsiburada'],['amazontr','trendyol']].forEach(x=>compare(x[0],x[1]));
  made.forEach(loc=>entries.push({ loc, alts:[['tr',loc]] }));
  console.log('TIER1 niyet/karşılaştırma sayfası :', made.length);
})();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
  + entries.map(e=>`  <url><loc>${e.loc}</loc>${e.alts.map(a=>`<xhtml:link rel="alternate" hreflang="${a[0]}" href="${a[1]}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${e.alts[0][1]}"/><lastmod>${today}</lastmod></url>`).join("\n")
  + `\n</urlset>\n`;
fs.writeFileSync(OUT+"sitemap.xml", sitemap);
fs.writeFileSync(OUT+"robots.txt", `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);

console.log(`\n═══ ÇOK DİLLİ PROGRAMMATIC SEO ÜRETİLDİ ═══`);
console.log(`taban url        : ${BASE}`);
console.log(`diller           : ${LANGS.join(", ")}`);
console.log(`pazaryeri/dil    : ${keys.length}  →  toplam sayfa: ${keys.length*LANGS.length} + ${LANGS.length} hub`);
console.log(`sitemap url      : ${entries.length} (her biri ${LANGS.length} dil alternatifiyle)`);
console.log(`çıktı            : seo/site/  (TR kökte, diğerleri /<lang>/ altında)`);
