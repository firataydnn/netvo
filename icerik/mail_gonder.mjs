// ============================================================================
//  NETVO — Günlük e-posta bülteni gönderici
//  Akış: haberler.json → günün (en yeni) haberlerini seç → HTML e-posta kur →
//        Resend ile gönder. Alıcı: MAIL_TO (yoksa hesap sahibi) + varsa Supabase
//        email_leads aboneleri.
//
//  Gerekli secret'lar (GitHub Actions):
//    RESEND_API_KEY   → https://resend.com (ücretsiz kademe yeterli)
//    MAIL_TO          → virgülle ayrık alıcılar (ör. firataydnn@gmail.com)
//    MAIL_FROM        → doğrulanmış gönderen (ör. "Netvo <haber@netvo.co>")
//                       yoksa Resend'in test göndereni kullanılır (yalnız hesap
//                       sahibine ulaşır; tüm listeye göndermek için alan adı doğrula).
//    SUPABASE_URL + SUPABASE_SERVICE_KEY  → (opsiyonel) abone listesini çekmek için
//
//  Çalıştır: node icerik/mail_gonder.mjs            (anahtar yoksa gönderim yok)
//           node icerik/mail_gonder.mjs --dry       (kuru tur: HTML'i yaz, gönderme)
// ============================================================================
import fs from "fs";

const KOK = new URL("./", import.meta.url).pathname;
const OUT = KOK + "haberler.json";
const DRY = process.argv.includes("--dry");
const N   = 5;                 // e-postaya konacak en yeni haber sayısı
const SITE = "https://netvo.co";
const API_KEY   = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "Netvo <onboarding@resend.dev>";
const MAIL_TO   = (process.env.MAIL_TO || "firataydnn@gmail.com").split(",").map(s=>s.trim()).filter(Boolean);
const SB_URL    = process.env.SUPABASE_URL || "";
const SB_KEY    = process.env.SUPABASE_SERVICE_KEY || "";

const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const CATTR  = {pazar:"Pazaryeri",reg:"Regülasyon",global:"Global",reklam:"Reklam",lojistik:"Lojistik",kose:"Köşe"};
const CATCOL = {pazar:"#EA5B2A",reg:"#7C3AED",global:"#2563EB",reklam:"#DB2777",lojistik:"#0D9488",kose:"#1A1511"};
const LOG = KOK + "mail_log.json";                 // daha önce gönderilen haberler (URL) — tekrarı önler
function loadLog(){ try{ const a=JSON.parse(fs.readFileSync(LOG,"utf8")); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function saveLog(a){ try{ fs.writeFileSync(LOG, JSON.stringify(a.slice(-800))); }catch(e){} }
// item.url (…/haber/<slug>.html) → üretilen kapak görseli (…/haber/covers/<slug>.png)
function coverOf(it){ if(it.img) return SITE+it.img; const m=/\/haber\/([^/]+)\.html$/.exec(it.url||""); return m?`${SITE}/haber/covers/${m[1]}.png`:""; }
function pill(c,tag){ const col=CATCOL[c]||"#1F4E79"; const label=(c==="kose"?"KÖŞE":(CATTR[c]||c))+(tag&&c!=="kose"?" · "+tag:""); return `<span style="display:inline-block;background:${col};color:#fff;font:700 10px/1 Arial,sans-serif;letter-spacing:.6px;text-transform:uppercase;padding:5px 9px;border-radius:999px">${esc(label)}</span>`; }

// Statik haber üreticisiyle BİREBİR aynı slug (seo/haber_uret.mjs) — mail linkleri
// bizim /haber/<slug>.html sayfamıza gitsin, dış kaynağa DEĞİL.
function slugify(s){ return String(s).toLowerCase()
  .replace(/[ışğüöçİ]/g, c => ({ 'ı':'i','ş':'s','ğ':'g','ü':'u','ö':'o','ç':'c','İ':'i' }[c] || c))
  .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60); }
function srcHost(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ""; } }
function pickTR(x){
  const t = x.i18n ? (x.i18n.tr||x.i18n.en) : x;
  if(!t || !t.t) return null;
  // gövdeden kaynak satırını çıkar (e-postada ayrı gösteriyoruz)
  const body = String(t.body||t.d||"").split("\nKaynak:")[0].split("\nSource:")[0].trim();
  // netvo haber sayfamızın URL'i (üreticiyle aynı slug tabanı: TR başlık)
  const base = (x.i18n && x.i18n.tr && x.i18n.tr.t) || (x.i18n && x.i18n.en && x.i18n.en.t) || t.t;
  const slug = slugify(base);
  const url  = (x.i18n && slug) ? `${SITE}/haber/${slug}.html` : `${SITE}/gundem`;
  const c = x.kose ? "kose" : (x.c||"global");
  return { c, dt:x.dt||"", tag:x.tag||"", src:x.src||"", host:srcHost(x.src||""), url, img:x.img||"", t:t.t, d:t.d||"", body };
}

function featureCard(a){
  const cov=coverOf(a);
  return `
  <tr><td style="padding:0 0 10px">
    ${cov?`<a href="${esc(a.url)}"><img src="${esc(cov)}" width="548" style="width:100%;max-width:548px;height:auto;display:block;border-radius:12px" alt=""></a>`:""}
    <div style="margin:14px 0 0">${pill(a.c,a.tag)}</div>
    <a href="${esc(a.url)}" style="font:700 23px/1.25 Georgia,serif;color:#0b0b12;text-decoration:none;display:block;margin:10px 0 6px;letter-spacing:-.01em">${esc(a.t)}</a>
    <div style="font:400 15px/1.6 Arial,sans-serif;color:#42505f">${esc(a.d)}</div>
    <div style="font:400 12px/1 Arial,sans-serif;color:#9aa6b6;margin-top:10px">${esc(a.dt)} · <a href="${esc(a.url)}" style="color:#EA5B2A;font-weight:700;text-decoration:none">Haberi oku →</a>${a.host?` · <span style="color:#b6bfca">kaynak: ${esc(a.host)}</span>`:""}</div>
  </td></tr>
  <tr><td style="padding:0 0 18px"><div style="border-top:1px solid #eef1f4"></div></td></tr>`;
}
function listRow(a){
  const cov=coverOf(a);
  return `
  <tr><td style="padding:0 0 18px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="112" valign="top" style="width:112px">
        ${cov?`<a href="${esc(a.url)}"><img src="${esc(cov)}" width="100" height="64" style="width:100px;height:64px;object-fit:cover;border-radius:9px;display:block" alt=""></a>`:""}
      </td>
      <td valign="top" style="padding-left:14px">
        <div style="margin-bottom:5px">${pill(a.c,a.tag)}</div>
        <a href="${esc(a.url)}" style="font:600 16px/1.32 Georgia,serif;color:#0b0b12;text-decoration:none;display:block;margin-bottom:4px">${esc(a.t)}</a>
        <div style="font:400 12px/1 Arial,sans-serif;color:#9aa6b6">${esc(a.dt)} · <a href="${esc(a.url)}" style="color:#EA5B2A;font-weight:700;text-decoration:none">oku →</a></div>
      </td>
    </tr></table>
  </td></tr>`;
}
function buildHTML(items, dateStr){
  const body = (items.length?featureCard(items[0]):"") + items.slice(1).map(listRow).join("");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head><body style="margin:0;background:#f4f6f8;padding:24px 0;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#fff;border:1px solid #e6eaef;border-radius:16px;overflow:hidden">
      <tr><td style="background:#0b0b12;padding:22px 26px">
        <div style="font:800 19px/1 Arial,sans-serif;color:#fff;letter-spacing:.2px">● netvo</div>
        <div style="font:400 13px/1.4 Arial,sans-serif;color:#b9c4d2;margin-top:7px">E-ticarette bugün ne değişti? · ${esc(dateStr)}</div>
      </td></tr>
      <tr><td style="padding:24px 26px 6px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table>
      </td></tr>
      <tr><td style="padding:4px 26px 26px">
        <a href="${SITE}/gundem" style="display:inline-block;background:#EA5B2A;color:#fff;font:700 14px/1 Arial,sans-serif;text-decoration:none;padding:13px 20px;border-radius:10px">Tüm haberleri gör →</a>
      </td></tr>
      <tr><td style="background:#f7f9fb;border-top:1px solid #eef1f4;padding:16px 26px;font:400 11px/1.6 Arial,sans-serif;color:#9aa6b6">
        <b style="color:#6b7685">Netvo</b> · Satıldı. Sana ne kaldı? — 136 pazaryeri, 37 ülke.<br>
        Haber metinleri Netvo tarafından özgün yazılır; her haberde kaynak bağlantısı verilir.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function subscribers(){
  // Opsiyonel: Supabase email_leads'ten abone listesi
  if(!SB_URL || !SB_KEY) return [];
  try{
    const r = await fetch(`${SB_URL}/rest/v1/email_leads?select=email`,{
      headers:{ apikey:SB_KEY, authorization:`Bearer ${SB_KEY}` }});
    if(!r.ok) return [];
    const j = await r.json();
    return (Array.isArray(j)?j:[]).map(x=>x.email).filter(Boolean);
  }catch(e){ console.error("abone listesi atlandı:", e.message); return []; }
}

async function send(to, subject, html){
  const r = await fetch("https://api.resend.com/emails",{ method:"POST",
    headers:{ "content-type":"application/json", authorization:`Bearer ${API_KEY}` },
    body:JSON.stringify({ from:MAIL_FROM, to, subject, html }) });
  if(!r.ok) throw new Error("resend "+r.status+" "+(await r.text()).slice(0,200));
  return r.json();
}

const _MON={Oca:0,"Şub":1,Mar:2,Nis:3,May:4,Haz:5,Tem:6,"Ağu":7,Eyl:8,Eki:9,Kas:10,Ara:11};
function _mon(x){if(x==null)return null;var v=_MON[x];if(v==null)v=_MON[x.slice(0,3)];return v==null?null:v;}
function tsOf(dt){var s=String(dt||"").trim();var m=/(\d{1,2})\s+(\S+)\s+(\d{4})/.exec(s);if(m){var mo=_mon(m[2]);if(mo!=null)return new Date(+m[3],mo,+m[1]).getTime();}var m2=/(\S+)\s+(\d{4})/.exec(s);if(m2){var mo2=_mon(m2[1]);if(mo2!=null)return new Date(+m2[2],mo2,1).getTime();}return 0;}

async function main(){
  let list=[]; try{ list=JSON.parse(fs.readFileSync(OUT,"utf8")); }catch(e){}
  // Tüm haberleri TARİHE göre yeniden-eskiye sırala
  const all = list.slice().sort((a,b)=>tsOf(b.dt)-tsOf(a.dt)).map(pickTR).filter(Boolean);
  if(!all.length){ console.log("Gönderilecek haber yok."); return; }

  // DAHA ÖNCE GÖNDERİLMEYENLER — her bülten taze olsun, aynı haber iki kez gitmesin
  const log = loadLog();
  const seen = new Set(log);
  let items = all.filter(a=>!seen.has(a.url)).slice(0, N);

  // Hiç yeni haber yoksa: gerçek gönderimde ATLA (tekrar yok). Kuru turda en yenileri göster.
  if(!items.length){
    if(DRY){ items = all.slice(0, N); }
    else { console.log("Yeni haber yok → bülten gönderilmedi (tekrar önlendi)."); return; }
  }
  if(!process.env.MAIL_FROM && API_KEY){ console.log("UYARI: MAIL_FROM tanımsız → Resend test göndericisi (onboarding@resend.dev) kullanılıyor; yalnız Resend hesabının kendi e-postasına ulaşır. Alan adını doğrulayıp MAIL_FROM ekle."); }

  const dateStr = new Date().toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"});
  const lead = items[0].t.length>58 ? items[0].t.slice(0,57).trim()+"…" : items[0].t;
  const subject = items.length>1 ? `${lead} — ve ${items.length-1} haber daha` : lead;
  const html = buildHTML(items, dateStr);

  if(DRY || !API_KEY){
    const p = KOK + "onizleme_mail.html";
    fs.writeFileSync(p, html);
    console.log((API_KEY?"[DRY] ":"RESEND_API_KEY yok → ")+"e-posta gönderilmedi. Önizleme yazıldı: "+p);
    console.log("Konu:", subject);
    items.forEach(a=>console.log("  • "+a.t));
    return;
  }

  const recips = Array.from(new Set(MAIL_TO.concat(await subscribers())));
  let ok=false;
  // Resend tek çağrıda 'to' dizisi kabul eder; büyük listelerde 50'lik gruplara böl
  for(let i=0;i<recips.length;i+=50){
    const chunk = recips.slice(i,i+50);
    try{ await send(chunk, subject, html); console.log("Gönderildi →", chunk.length, "alıcı"); ok=true; }
    catch(e){ console.error("gönderim hatası:", e.message); }
  }
  if(ok){ saveLog(log.concat(items.map(a=>a.url))); }   // sadece başarılı gönderimde logla
  console.log(`Bülten gönderildi: ${items.length} haber · ${recips.length} alıcı.`);
}
main();
