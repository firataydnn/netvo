// ============================================================================
//  NETVO — PAZARYERİ İÇERİĞİ ÇEVİRİCİ (build-time, LLM)
//
//  Ne yapar: Commera_Site.html içindeki MK (note, sourceLabel) + INFO
//  (about, who, payout, start[], reqs[], pros[], cons[]) Türkçe editöryal
//  içeriğini EN/DE/FR/ES/IT dillerine çevirir → i18n/mk-<lang>.json yazar.
//  SPA bu dosyaları lazy-load eder (dil TR değilse). Yoksa TR'ye düşer.
//
//  Doğruluk: sayı/yüzde/para birimi/tarih/marka adı/URL AYNEN korunur.
//  Maliyet kontrolü: her pazaryerinin TR kaynağı hash'lenir; yalnız DEĞİŞEN
//  veya YENİ olanlar yeniden çevrilir (i18n/.hashes.json). Değişmeyenler
//  mevcut çeviriden korunur. Partiler halinde (batch) çağrı yapılır.
//
//  Çalıştır:  ANTHROPIC_API_KEY=... node icerik/mk_ceviri.mjs
//  Alt küme:  NETVO_MK_LANGS="de,fr" node icerik/mk_ceviri.mjs
//  Anahtar yoksa: hiçbir şey yazmaz (çöp basma kuralı), 0 ile çıkar.
// ============================================================================
import fs from "fs";
import crypto from "crypto";

const KOK = new URL("../", import.meta.url).pathname;
const HTML = fs.readFileSync(KOK + "Commera_Site.html", "utf8");
const OUTDIR = KOK + "i18n";
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.NETVO_MK_MODEL || "claude-haiku-4-5-20251001";
const LANGS = (process.env.NETVO_MK_LANGS || "en,de,fr,es,it").split(",").map(s=>s.trim()).filter(Boolean);
const LANG_NAME = { en:"English", de:"German (Deutsch)", fr:"French (Français)", es:"Spanish (Español)", it:"Italian (Italiano)" };
const BATCH_CHARS = 3200;          // parti başına yaklaşık TR karakter üst sınırı
const FIELDS_STR = ["note","src","about","who","payout"];
const FIELDS_ARR = ["start","reqs","pros","cons"];

// --- SPA'yı Node'da eval edip MK + INFO nesnelerini al (uret.mjs ile aynı stub) ---
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
  const fn = new Function("document","window","localStorage","location","navigator","matchMedia","setTimeout","addEventListener","URL","Blob","FileReader","requestAnimationFrame","alert","toast","fetch","console",
    code + "\nreturn {MK, INFO:(typeof INFO!=='undefined'?INFO:{})};");
  return fn(doc, win, ls, win.location, {language:"tr"}, win.matchMedia, f=>{try{f()}catch(e){}}, ()=>{},
    globalThis.URL, {createObjectURL:()=>"x",revokeObjectURL(){}}, function(){}, f=>f&&f(), ()=>{}, ()=>{}, ()=>Promise.resolve({ok:false}), console);
}

// --- Her pazaryeri için TR kaynak alanlarını topla (sadece dolu olanlar) ---
function kaynakTopla(MK, INFO) {
  const src = {};
  for (const k of Object.keys(MK)) {
    const m = MK[k], I = INFO[k] || {};
    const rec = {};
    if (m.note && String(m.note).trim()) rec.note = String(m.note);
    if (m.sourceLabel && String(m.sourceLabel).trim()) rec.src = String(m.sourceLabel);
    for (const f of ["about","who","payout"]) if (I[f] && String(I[f]).trim()) rec[f] = String(I[f]);
    for (const f of ["start","reqs","pros","cons"]) if (Array.isArray(I[f]) && I[f].length) rec[f] = I[f].slice();
    if (Object.keys(rec).length) src[k] = rec;
  }
  return src;
}
const hashOf = o => crypto.createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0,16);
const charsOf = rec => { let n=0; for (const f of FIELDS_STR) if (rec[f]) n+=rec[f].length; for (const f of FIELDS_ARR) if (rec[f]) rec[f].forEach(x=>n+=String(x).length); return n; };

const SYS = (lang) => `You are a professional translator for an e-commerce marketplace-fee reference site (seller's perspective). Translate the given Turkish marketplace content into ${LANG_NAME[lang]}.

ABSOLUTE RULES:
- Preserve EXACTLY, unchanged: every number, percentage (e.g. %15, 15%), currency symbol and amount (₺, $, €, 8,49₺, S$200, ₹500), date, and ratio. Do not convert currencies or recalculate.
- Keep proper nouns as-is: brand/marketplace names (Trendyol, Amazon, Etsy, Wildberries...), product/program names (FBA, Pan-EU, Brand Registry, Rocket, PVZ, EAC, OSS/IOSS, W-8BEN-E, SDA, MDA, EPR, GSTIN, KTP), URLs, document names.
- "KDV" means VAT — translate the word to the ${LANG_NAME[lang]} VAT term, but keep any rate number identical.
- The content is written for a seller based in Turkey entering that marketplace; keep that framing faithfully (do not localize the advice to another country).
- Keep the same tone: plain, factual, concise. Do not add, drop, soften, or embellish facts. No marketing fluff.
- Return STRICT JSON only, no prose, no markdown fences.`;

function usr(batch) {
  // batch: {mkid: {note?, src?, about?, who?, payout?, start?[], reqs?[], pros?[], cons?[]}}
  return `Translate the "value" of every field in this JSON. Keep the SAME JSON structure and the SAME keys (marketplace ids and field names). Arrays stay arrays with the same length/order. Output only the JSON object.\n\n${JSON.stringify(batch)}`;
}

async function cevir(lang, batch) {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST",
    headers:{ "content-type":"application/json", "x-api-key":API_KEY, "anthropic-version":"2023-06-01" },
    body: JSON.stringify({ model:MODEL, max_tokens:8000, system:SYS(lang), messages:[{role:"user",content:usr(batch)}] }) });
  if (!r.ok) throw new Error("API "+r.status+" "+(await r.text()).slice(0,200));
  const j = await r.json();
  let txt = (j.content && j.content[0] && j.content[0].text || "").trim();
  txt = txt.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim();
  const obj = JSON.parse(txt);
  return obj;
}

// Çeviri doğrulama: yapı aynı mı, sayılar korunmuş mu (kaba kontrol)
function gecerli(srcRec, outRec) {
  if (!outRec || typeof outRec !== "object") return false;
  for (const f of FIELDS_STR) {
    if (srcRec[f] != null) { if (typeof outRec[f] !== "string" || !outRec[f].trim()) return false; }
  }
  for (const f of FIELDS_ARR) {
    if (srcRec[f] != null) { if (!Array.isArray(outRec[f]) || outRec[f].length !== srcRec[f].length) return false; }
  }
  return true;
}

async function main() {
  const { MK, INFO } = siteyiOku();
  const src = kaynakTopla(MK, INFO);
  const ids = Object.keys(src);
  console.log("Pazaryeri (içerikli):", ids.length);

  if (!API_KEY) { console.log("ANTHROPIC_API_KEY yok → çeviri atlandı (çöp basma). Mevcut i18n/ korunur."); return; }

  fs.mkdirSync(OUTDIR, { recursive: true });
  const hashPath = OUTDIR + "/.hashes.json";
  let hashes = {}; try { hashes = JSON.parse(fs.readFileSync(hashPath,"utf8")); } catch(e){}

  for (const lang of LANGS) {
    const outPath = `${OUTDIR}/mk-${lang}.json`;
    let out = {}; try { out = JSON.parse(fs.readFileSync(outPath,"utf8")); } catch(e){}

    // değişen/yeni id'leri bul (bu dil için)
    const todo = ids.filter(k => {
      const h = hashOf(src[k]);
      const key = lang + ":" + k;
      return hashes[key] !== h || !out[k];
    });
    // artık var olmayan id'leri temizle
    for (const k of Object.keys(out)) if (!src[k]) delete out[k];

    console.log(`[${lang}] çevrilecek: ${todo.length} / ${ids.length}`);
    // partilere böl
    let batch = {}, bchars = 0, done = 0;
    const flush = async () => {
      if (!Object.keys(batch).length) return;
      try {
        const res = await cevir(lang, batch);
        for (const k of Object.keys(batch)) {
          if (gecerli(batch[k], res[k])) { out[k] = res[k]; hashes[lang+":"+k] = hashOf(src[k]); done++; }
          else console.warn(`  ! ${lang}/${k} geçersiz çeviri — atlandı (TR korunur)`);
        }
      } catch (e) { console.warn(`  ! parti hatası (${lang}):`, e.message); }
      batch = {}; bchars = 0;
    };
    for (const k of todo) {
      batch[k] = src[k]; bchars += charsOf(src[k]);
      if (bchars >= BATCH_CHARS) await flush();
    }
    await flush();

    // deterministik sırayla yaz
    const ordered = {}; Object.keys(out).sort().forEach(k => ordered[k] = out[k]);
    fs.writeFileSync(outPath, JSON.stringify(ordered, null, 0));
    console.log(`[${lang}] yazıldı: ${Object.keys(ordered).length} pazaryeri (bu turda ${done} yenilendi) → ${outPath.replace(KOK,"")}`);
  }
  fs.writeFileSync(hashPath, JSON.stringify(hashes, null, 0));
  console.log("✓ Bitti. i18n/.hashes.json güncellendi.");
}
main().catch(e => { console.error("HATA:", e); process.exit(1); });
