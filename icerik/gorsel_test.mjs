// NETVO — GÖRSEL SAĞLAYICI TESTİ (Pixabay + Higgsfield) — CI'da gerçek anahtarlarla
// Yeni haber beklemeden iki sağlayıcıyı da dener, örnek görselleri marka/haber-gorsel/_test_*.jpg yazar.
import fs from "fs";
const OUT = new URL("./", import.meta.url).pathname + "../marka/haber-gorsel/";
fs.mkdirSync(OUT, { recursive: true });

const QUERY  = "parcel delivery courier ecommerce";
const PROMPT = "Editorial press photograph, wide cinematic shot: a plain white delivery van on a sunny suburban street, a courier in a neutral uniform carrying cardboard parcels up a driveway, warm natural daylight, shallow depth of field, realistic. Absolutely no text, no logos, no brand names, no watermarks.";

async function testPixabay(){
  const k = process.env.PIXABAY_API_KEY || ""; if(!k) return "SKIP (anahtar yok)";
  try{
    const r = await fetch(`https://pixabay.com/api/?key=${k}&q=${encodeURIComponent(QUERY)}&image_type=photo&orientation=horizontal&safesearch=true&order=popular&per_page=3`);
    if(!r.ok) return "FAIL http "+r.status+" "+(await r.text()).slice(0,140);
    const j = await r.json(); const p = (j.hits||[])[0]; if(!p) return "FAIL sonuç yok";
    const ir = await fetch(p.largeImageURL||p.webformatURL); if(!ir.ok) return "FAIL indirme "+ir.status;
    const buf = Buffer.from(await ir.arrayBuffer()); fs.writeFileSync(OUT+"_test_pixabay.jpg", buf);
    return `PASS (${Math.round(buf.length/1024)}KB · ${p.user||"?"})`;
  }catch(e){ return "FAIL "+(e&&e.message||e); }
}

async function testHiggsfield(){
  const cred = process.env.HIGGSFIELD_API_KEY || ""; if(!cred) return "SKIP (anahtar yok)";
  try{
    const mod = await import('@higgsfield/client/v2');
    const higgsfield = mod.higgsfield, config = mod.config;
    config({ credentials: cred });   // beklenen biçim: KEY_ID:KEY_SECRET
    const js = await higgsfield.subscribe('flux-pro/kontext/max/text-to-image', {
      input: { aspect_ratio:'16:9', prompt:PROMPT, safety_tolerance:2 }, withPolling:true
    });
    if(!js.isCompleted) return "FAIL durum: "+(js.isFailed?'failed':js.isNsfw?'nsfw':'timeout');
    const url = js.jobs?.[0]?.results?.raw?.url; if(!url) return "FAIL sonuç url yok";
    const ir = await fetch(url); if(!ir.ok) return "FAIL indirme "+ir.status;
    const buf = Buffer.from(await ir.arrayBuffer()); fs.writeFileSync(OUT+"_test_higgsfield.jpg", buf);
    return `PASS (${Math.round(buf.length/1024)}KB)`;
  }catch(e){ return "FAIL "+(e&&e.message||e); }
}

console.log("== NETVO görsel sağlayıcı testi ==");
console.log("PIXABAY    :", await testPixabay());
console.log("HIGGSFIELD :", await testHiggsfield());
