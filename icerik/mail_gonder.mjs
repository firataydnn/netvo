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
const CATTR = {pazar:"Pazaryeri",reg:"Regülasyon",global:"Global",reklam:"Reklam",lojistik:"Lojistik"};

function pickTR(x){
  const t = x.i18n ? (x.i18n.tr||x.i18n.en) : x;
  if(!t || !t.t) return null;
  // gövdeden kaynak satırını çıkar (e-postada ayrı link veriyoruz)
  const body = String(t.body||t.d||"").split("\nKaynak:")[0].split("\nSource:")[0].trim();
  return { c:x.c||"global", dt:x.dt||"", tag:x.tag||"", src:x.src||"", t:t.t, d:t.d||"", body };
}

function buildHTML(items, dateStr){
  const rows = items.map(a=>`
    <tr><td style="padding:0 0 22px">
      <div style="font:600 11px/1 Arial,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#1F4E79">${esc(CATTR[a.c]||a.c)}${a.tag?" · "+esc(a.tag):""}</div>
      <a href="${esc(a.src||SITE)}" style="font:600 18px/1.3 Georgia,serif;color:#0b0b12;text-decoration:none;display:block;margin:6px 0 4px">${esc(a.t)}</a>
      <div style="font:400 14px/1.55 Arial,sans-serif;color:#42505f">${esc(a.d)}</div>
      <div style="font:400 12px/1 Arial,sans-serif;color:#9aa6b6;margin-top:8px">${esc(a.dt)} · <a href="${esc(a.src||SITE)}" style="color:#1F4E79">Kaynağı aç →</a></div>
    </td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;padding:24px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#fff;border:1px solid #e6eaef;border-radius:14px;overflow:hidden">
      <tr><td style="background:#0b0b12;padding:20px 26px">
        <div style="font:700 18px/1 Arial,sans-serif;color:#fff;letter-spacing:.3px">● netvo</div>
        <div style="font:400 13px/1.4 Arial,sans-serif;color:#b9c4d2;margin-top:6px">Günün e-ticaret haberleri · ${esc(dateStr)}</div>
      </td></tr>
      <tr><td style="padding:24px 26px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td></tr>
      <tr><td style="padding:8px 26px 24px">
        <a href="${SITE}/#/haberler" style="display:inline-block;background:#0b0b12;color:#fff;font:600 14px/1 Arial,sans-serif;text-decoration:none;padding:12px 18px;border-radius:9px">Tüm haberler →</a>
      </td></tr>
      <tr><td style="background:#f7f9fb;border-top:1px solid #eef1f4;padding:16px 26px;font:400 11px/1.5 Arial,sans-serif;color:#9aa6b6">
        Netvo · Satıldı. Sana ne kaldı? — 136 pazaryeri, 37 ülke.<br>
        Haber metinleri Netvo tarafından özgün olarak yazılır; her haberde kaynak bağlantısı verilir.
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
  // En yeni tarihli 5 haber (dosya sırasına değil, TARİHE göre)
  const items = list.slice().sort((a,b)=>tsOf(b.dt)-tsOf(a.dt)).map(pickTR).filter(Boolean).slice(0, N);
  if(!items.length){ console.log("Gönderilecek haber yok."); return; }
  if(!process.env.MAIL_FROM && API_KEY){ console.log("UYARI: MAIL_FROM tanımsız → Resend test göndericisi (onboarding@resend.dev) kullanılıyor; yalnız Resend hesabının kendi e-postasına ulaşır. Alan adını doğrulayıp MAIL_FROM ekle."); }

  const dateStr = new Date().toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"});
  const subject = `Netvo · Günün e-ticaret haberleri (${items.length}) — ${dateStr}`;
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
  // Resend tek çağrıda 'to' dizisi kabul eder; büyük listelerde 50'lik gruplara böl
  for(let i=0;i<recips.length;i+=50){
    const chunk = recips.slice(i,i+50);
    try{ await send(chunk, subject, html); console.log("Gönderildi →", chunk.length, "alıcı"); }
    catch(e){ console.error("gönderim hatası:", e.message); }
  }
  console.log(`Bülten gönderildi: ${items.length} haber · ${recips.length} alıcı.`);
}
main();
