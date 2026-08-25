// ============================================================================
//  NETVO — MEVCUT HABERLERİ UZAT (idempotent, tek seferlik + tekrar güvenli)
//  Yayında olan KISA gövdeli auto-haberleri 2-3 dolu paragrafa (6 dil) çıkarır.
//  Olguya SADIK kalır (yeni spesifik rakam/isim/tarih icat etmez), sadece
//  bağlam + sektör analizi + "satıcı için ne demek" katmanı ekler.
//  Kaynak satırını korur. Uzatılanı expanded:true ile işaretler.
//
//  Çalıştır: node icerik/genislet.mjs          (ANTHROPIC_API_KEY gerekli)
//           node icerik/genislet.mjs --dry     (yazmaz, sadece raporlar)
// ============================================================================
import fs from "fs";

const KOK = new URL("./", import.meta.url).pathname;
const OUT = KOK + "haberler.json";
const DRY = process.argv.includes("--dry");
const LANGS = ["tr","en","de","fr","es","it"];
const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = process.env.EXPAND_MODEL || "claude-haiku-4-5-20251001";
const MIN_WORDS = 130;   // TR gövdesi (kaynak satırı hariç) bundan kısaysa uzat
const KSOZ = { tr:"Kaynak", en:"Source", de:"Quelle", fr:"Source", es:"Fuente", it:"Fonte" };
const SRC_RE = new RegExp("^(" + Object.values(KSOZ).join("|") + ")\\s*:", "i");

function load(){ try{ return JSON.parse(fs.readFileSync(OUT,"utf8")); }catch(e){ return []; } }
function wc(s){ return String(s||"").trim().split(/\s+/).filter(Boolean).length; }

// Gövdeden sondaki "Kaynak: url" satırını ayır → {core, srcLine}
function splitSrc(body){
  const lines = String(body||"").split("\n");
  for(let i=lines.length-1;i>=0;i--){
    const t=lines[i].trim();
    if(!t) continue;
    if(SRC_RE.test(t)){ return { core:lines.slice(0,i).join("\n").trim(), srcLine:t }; }
    break; // son dolu satır kaynak değil → kaynak satırı yok
  }
  return { core:String(body||"").trim(), srcLine:"" };
}

async function expand(art){
  const payload={}, srcLines={};
  for(const l of LANGS){ const x=(art.i18n&&art.i18n[l])||{}; const s=splitSrc(x.body);
    payload[l]={ t:x.t||"", d:x.d||"", body:s.core }; srcLines[l]=s.srcLine; }
  const sys = `Sen Netvo'nun kıdemli e-ticaret editörüsün. Sana YAYINDA olan kısa bir haberin 6 dildeki hali verilir. Görevin: her dilin GÖVDESİNİ (body) 2-3 dolu paragrafa (170-240 kelime) GENİŞLETMEK. Başlık (t) ve spot (d) AYNEN kalır, onları döndürme.
KURALLAR: (1) Mevcut metindeki olgulara SADIK kal; kaynakta olmayan yeni spesifik rakam/isim/tarih/alıntı İCAT ETME. (2) Genişletmeyi şu katmanlarla yap: ne olduğunu netleştir; sektör bağlamı/arka plan; "e-ticaret satıcısı/işletmesi için ne anlama geliyor" + kısa ileriye bakış — bunlar olgu icadı değil, editöryal çerçeve. (3) Paragrafları \\n\\n ile ayır. (4) Telif: kaynağı kopyalama, tamamen kendi cümlelerinle yaz. (5) Her dil kendi dilinde akıcı olsun, çeviri kokmasın. (6) Zorlama pazarlama kalıbı yok; düz, otoriter gazetecilik.`;
  const usr = `Mevcut haber (6 dil, JSON):\n${JSON.stringify(payload)}\n\nSADECE şu JSON'u döndür (başka metin yok):\n{"i18n":{"tr":{"body":""},"en":{"body":""},"de":{"body":""},"fr":{"body":""},"es":{"body":""},"it":{"body":""}}}`;
  const r = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST",
    headers:{ "content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01" },
    body:JSON.stringify({ model:MODEL, max_tokens:4000, system:sys, messages:[{role:"user",content:usr}] }) });
  if(!r.ok) throw new Error("api "+r.status+" "+(await r.text()).slice(0,160));
  const j = await r.json(); const txt=(j.content&&j.content[0]&&j.content[0].text)||"";
  const obj = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}")+1));
  if(!obj.i18n) throw new Error("i18n yok");
  // önce hepsini doğrula (atomik) — biri zayıfsa hiçbirini yazma
  const nbs={};
  for(const l of LANGS){ const nb=obj.i18n[l]&&obj.i18n[l].body; if(!nb||wc(nb)<60) throw new Error(l+" gövde zayıf"); nbs[l]=nb; }
  for(const l of LANGS){ const src=srcLines[l]?("\n\n"+srcLines[l]):"";
    art.i18n[l].body = String(nbs[l]).trim().slice(0,3200) + src; }
  return art;
}

async function main(){
  if(!API_KEY){ console.log("ANTHROPIC_API_KEY yok → genişletme yapılmadı."); return; }
  const list = load();
  const targets = list.filter(a=>a.auto && !a.weekly && !a.expanded && a.i18n &&
    wc(splitSrc((a.i18n.tr||{}).body).core) < MIN_WORDS);
  console.log(`Uzatılacak haber: ${targets.length} / ${list.length}`);
  if(!targets.length){ console.log("Kısa haber yok → çıkıldı."); return; }
  let ok=0;
  for(const a of targets){
    try{ await expand(a); a.expanded=true; ok++; console.log("UZATILDI:", ((a.i18n.tr||{}).t||"").slice(0,60)); }
    catch(e){ console.error("atlandı:", (((a.i18n||{}).tr||{}).t||"").slice(0,50), "—", e.message); }
    await new Promise(r=>setTimeout(r,400));
  }
  if(DRY){ console.log("DRY: yazılmadı. Başarı:", ok); return; }
  fs.writeFileSync(OUT, JSON.stringify(list,null,1));
  console.log("KAYDEDİLDİ →", OUT, "· uzatılan:", ok, "haber");
}
main();
