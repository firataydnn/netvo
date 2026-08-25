// ============================================================================
//  NETVO — HAFTALIK ÖZET MAKALE ÜRETİCİ (pillar / kapsayıcı içerik)
//  Her Cumartesi o haftanın haberlerinden TEK kapsayıcı "E-ticarette Bu Hafta"
//  makalesi sentezler ve 6 dile (tr,en,de,fr,es,it) yazar → haberler.json'a
//  weekly:true etiketiyle ekler. build.mjs → haber_uret.mjs bu makaleye de
//  otomatik SEO sayfası + marka kapak üretir.
//
//  Neden pillar? Sentez/özgün içerik, Google çekirdek güncellemelerinde HAYATTA
//  KALAN içerik tipidir (ince değil). Topical authority + bülten + iç link merkezi.
//
//  Çalıştır: node icerik/haftalik_ozet.mjs           (ANTHROPIC_API_KEY önerilir)
//           node icerik/haftalik_ozet.mjs --dry      (yazmaz, önizler)
//  Gerekli secret: ANTHROPIC_API_KEY (yoksa şablon-özet ile yine üretir).
// ============================================================================
import fs from "fs";

const KOK = new URL("./", import.meta.url).pathname;
const OUT = KOK + "haberler.json";
const DRY = process.argv.includes("--dry");
const LANGS = ["tr","en","de","fr","es","it"];
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.WEEKLY_MODEL || "claude-haiku-4-5-20251001";
const KEEP = 200;
const WINDOW_DAYS = 8;      // "bu hafta" penceresi
const MIN_STORIES = 4;      // bu kadar haber yoksa haftalık üretme
const MAX_STORIES = 16;     // LLM'e verilecek en fazla haber

const AYK = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const AY2N = { "Oca":0,"Şub":1,"Mar":2,"Nis":3,"May":4,"Haz":5,"Tem":6,"Ağu":7,"Eyl":8,"Eki":9,"Kas":10,"Ara":11 };
function parseTRDate(dt){ const m=/(\d{1,2})\s+(\S+)\s+(\d{4})/.exec(dt||""); if(!m) return null;
  const mo=AY2N[m[2].slice(0,3)]; if(mo==null) return null; return new Date(+m[3],mo,+m[1]); }
function todayTR(){ const d=new Date(); return `${d.getDate()} ${AYK[d.getMonth()]} ${d.getFullYear()}`; }
function rangeLabel(days){ const b=new Date(Date.now()-days*864e5), e=new Date();
  const f=x=>`${x.getDate()} ${AYK[x.getMonth()]}`; return `${f(b)}–${f(e)} ${e.getFullYear()}`; }

function load(){ try{ return JSON.parse(fs.readFileSync(OUT,"utf8")); }catch(e){ return []; } }
function trOf(a){ return (a.i18n&&(a.i18n.tr||a.i18n.en))||a; }

function pickWeek(list){
  const now=Date.now();
  const dated=list.filter(a=>!a.weekly && a.i18n).map(a=>({a,d:parseTRDate(a.dt)}))
    .filter(x=>x.d && (now-x.d.getTime())<=WINDOW_DAYS*864e5)
    .sort((p,q)=>q.d-p.d).map(x=>x.a);
  if(dated.length>=MIN_STORIES) return dated.slice(0,MAX_STORIES);
  // tarih ayrıştırma zayıfsa: dosya sırasında en yeni auto haberler (engine newest-first yazar)
  return list.filter(a=>!a.weekly && a.i18n).slice(0,MAX_STORIES);
}

// --- LLM: haftanın haberlerinden tek kapsayıcı makale (6 dil) ---
async function synthLLM(stories, range){
  const malzeme = stories.map((a,i)=>{ const t=trOf(a); return `${i+1}. [${a.c}/${a.tag||"Global"}] ${t.t} — ${t.d}`; }).join("\n");
  const sys = `Sen Netvo'nun kıdemli e-ticaret editörüsün. Sana bu haftanın e-ticaret haber başlıkları verilir. Bunlardan TEK, kapsayıcı, analitik bir "haftalık özet" makalesi (pillar) yazarsın. Haberleri tek tek sıralamazsın; ORTAK TEMALARI bulup birbirine dokuyarak anlatırsın. Ton: net, bilgilendirici, otoriter gazetecilik — zorlama pazarlama kalıbı yok. Telif: kaynak metinleri kopyalama, kendi cümlelerinle yaz.`;
  const usr = `Bu haftanın haberleri (${range}):
${malzeme}

GÖREV: Bunlardan tek kapsayıcı haftalık özet makalesi yaz ve 6 dile (tr,en,de,fr,es,it) çevir. Her dil için:
- t: başlık (<=90 karakter). TR örn: "E-ticarette Bu Hafta — ${range}". Diğer dillerde uygun karşılık.
- d: tek cümle spot (haftanın ana çıkarımı).
- body: 250-380 kelime, 3-5 paragraf. Girişte haftanın büyük resmi; ortada 2-4 tematik kümede haberleri BİRBİRİNE DOKUYARAK anlat; sonda "satıcı/işletme için ne anlama geliyor" kısa çıkarım + haftaya kısa bakış. Paragrafları \\n ile ayır. Kaynak linki koyma.

SADECE şu JSON'u döndür (başka metin yok):
{"i18n":{"tr":{"t":"","d":"","body":""},"en":{"t":"","d":"","body":""},"de":{"t":"","d":"","body":""},"fr":{"t":"","d":"","body":""},"es":{"t":"","d":"","body":""},"it":{"t":"","d":"","body":""}}}`;
  const r = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST",
    headers:{ "content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01" },
    body:JSON.stringify({ model:MODEL, max_tokens:4000, system:sys, messages:[{role:"user",content:usr}] }) });
  if(!r.ok) throw new Error("anthropic "+r.status+" "+(await r.text()).slice(0,200));
  const j = await r.json(); const txt = (j.content&&j.content[0]&&j.content[0].text)||"";
  const m = txt.match(/\{[\s\S]*\}/); if(!m) throw new Error("JSON bulunamadı");
  return JSON.parse(m[0]).i18n;
}

// --- Şablon fallback (API yoksa): haftanın öne çıkanları özeti (ince değil, gerçek liste) ---
function synthTemplate(stories, range){
  const L = {
    tr:{t:`E-ticarette Bu Hafta — ${range}`, d:`Bu haftanın e-ticaret gündeminden öne çıkan gelişmeler.`, intro:`Bu hafta e-ticaret dünyasında öne çıkan başlıklar:`, tail:`Her başlığın ayrıntısı ve satıcıya etkisi ilgili haber sayfasında. Netvo, gelişmeleri kaynağıyla takip eder.`},
    en:{t:`E-commerce This Week — ${range}`, d:`The week's most notable developments in e-commerce.`, intro:`Standout headlines in e-commerce this week:`, tail:`Details and seller impact are on each story's page. Netvo tracks developments with sources.`},
    de:{t:`E-Commerce diese Woche — ${range}`, d:`Die wichtigsten Entwicklungen der Woche im E-Commerce.`, intro:`Herausragende Schlagzeilen dieser Woche im E-Commerce:`, tail:`Details und Auswirkungen auf Verkäufer stehen auf der jeweiligen Meldungsseite. Netvo verfolgt Entwicklungen mit Quellen.`},
    fr:{t:`L'e-commerce cette semaine — ${range}`, d:`Les développements les plus notables de la semaine dans l'e-commerce.`, intro:`Les titres marquants de la semaine dans l'e-commerce :`, tail:`Détails et impact vendeur sur la page de chaque article. Netvo suit l'actualité avec ses sources.`},
    es:{t:`El e-commerce esta semana — ${range}`, d:`Los desarrollos más destacados de la semana en el e-commerce.`, intro:`Titulares destacados de la semana en el e-commerce:`, tail:`Detalles e impacto para el vendedor en la página de cada noticia. Netvo sigue la actualidad con sus fuentes.`},
    it:{t:`L'e-commerce questa settimana — ${range}`, d:`Gli sviluppi più rilevanti della settimana nell'e-commerce.`, intro:`Titoli in evidenza della settimana nell'e-commerce:`, tail:`Dettagli e impatto per il venditore nella pagina di ogni notizia. Netvo segue l'attualità con le fonti.`},
  };
  const i18n={};
  for(const l of LANGS){ const g=L[l]; const lines=stories.map(a=>{ const t=(a.i18n&&(a.i18n[l]||a.i18n.tr))||a; return `• ${t.t} — ${t.d}`; }).join("\n");
    i18n[l]={ t:g.t, d:g.d, body:`${g.intro}\n${lines}\n${g.tail}` }; }
  return i18n;
}

function validI18n(o){ if(!o) return false; for(const l of LANGS){ const x=o[l]; if(!x||!x.t||!x.d||!x.body) return false; } return true; }

async function main(){
  const list = load();
  // Aynı hafta ikinci kez çalışmayı engelle: son 5 günde weekly varsa çık
  const now=Date.now();
  const recentWeekly = list.find(a=>a.weekly && a.dt && parseTRDate(a.dt) && (now-parseTRDate(a.dt).getTime())<5*864e5);
  if(recentWeekly && !DRY){ console.log("Bu hafta zaten haftalık özet var → atlandı:", trOf(recentWeekly).t); return; }

  const stories = pickWeek(list);
  if(stories.length < MIN_STORIES){ console.log(`Yeterli haber yok (${stories.length}<${MIN_STORIES}) → haftalık üretilmedi.`); return; }
  const range = rangeLabel(WINDOW_DAYS);

  let i18n=null;
  if(API_KEY){ try{ i18n = await synthLLM(stories, range); }catch(e){ console.log("LLM hatası, şablona düşülüyor:", e.message); } }
  if(!validI18n(i18n)) i18n = synthTemplate(stories, range);
  // uzunluk sınırları
  for(const l of LANGS){ i18n[l].t=String(i18n[l].t).slice(0,120); i18n[l].d=String(i18n[l].d).slice(0,240); i18n[l].body=String(i18n[l].body).slice(0,3000); }

  const article = { c:"global", dt:todayTR(), tag:"Haftalık", src:"", auto:true, weekly:true, pop:true, i18n };

  if(DRY){ console.log("--- DRY RUN · Haftalık Özet ---"); console.log("Kaynak haber:", stories.length, "· Aralık:", range);
    console.log("TR başlık:", i18n.tr.t); console.log("TR spot :", i18n.tr.d); console.log("TR gövde (ilk 240):", i18n.tr.body.slice(0,240)); console.log("EN başlık:", i18n.en.t);
    fs.writeFileSync(KOK+"onizleme_haftalik.json", JSON.stringify(article,null,1)); console.log("Önizleme yazıldı: icerik/onizleme_haftalik.json"); return; }

  const outList = [article, ...list].slice(0, KEEP);
  fs.writeFileSync(OUT, JSON.stringify(outList,null,1));
  console.log("HAFTALIK ÖZET YAYINA EKLENDİ:", i18n.tr.t, "· kaynak", stories.length, "haber");
}
main();
