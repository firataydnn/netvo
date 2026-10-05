// ============================================================================
//  NETVO — Haber motoru SAĞLIK KONTROLÜ (sessiz bozulma alarmı)
//  Amaç: Günlük haber pipeline'ı bir süredir YENİ gerçek haber üretmediyse
//  (ör. ANTHROPIC_API_KEY kredisi bitti, feed'ler bozuldu), Fırat'a UYARI
//  maili at. Böylece "her şey yeşil ama içerik bayat" durumu fark edilir.
//
//  Çalıştır (haber.yml içinde, haber_uret'ten SONRA):
//    node icerik/saglik_kontrol.mjs
//  Env: RESEND_API_KEY, MAIL_FROM, MAIL_TO (hepsi GitHub secret)
// ============================================================================
import fs from "fs";

const KOK = new URL("./", import.meta.url).pathname;
const OUT = KOK + "haberler.json";
const ESIK_GUN = 3;                                  // kaç gün yeni haber yoksa alarm
const API_KEY   = process.env.RESEND_API_KEY || "";
const MAIL_FROM = process.env.MAIL_FROM || "Netvo <onboarding@resend.dev>";
const MAIL_TO   = (process.env.MAIL_TO || "firataydnn@gmail.com").split(",").map(s=>s.trim()).filter(Boolean);

const _MON={Oca:0,"Şub":1,Mar:2,Nis:3,May:4,Haz:5,Tem:6,"Ağu":7,Eyl:8,Eki:9,Kas:10,Ara:11};
function _mon(x){if(x==null)return null;var v=_MON[x];if(v==null)v=_MON[String(x).slice(0,3)];return v==null?null:v;}
function tsOf(dt){var s=String(dt||"").trim();var m=/(\d{1,2})\s+(\S+)\s+(\d{4})/.exec(s);if(m){var mo=_mon(m[2]);if(mo!=null)return new Date(+m[3],mo,+m[1]).getTime();}return 0;}
function title(x){return (x&&x.i18n&&x.i18n.tr&&x.i18n.tr.t)||(x&&x.i18n&&x.i18n.en&&x.i18n.en.t)||(x&&x.t)||"";}

async function send(subject, html){
  if(!API_KEY){ console.log("RESEND_API_KEY yok → uyarı maili atlanamadı."); return; }
  const r = await fetch("https://api.resend.com/emails",{method:"POST",
    headers:{"content-type":"application/json",authorization:`Bearer ${API_KEY}`},
    body:JSON.stringify({from:MAIL_FROM,to:MAIL_TO,subject,html})});
  if(!r.ok){ console.error("uyarı maili gönderilemedi:", r.status, (await r.text()).slice(0,160)); return; }
  console.log("⚠️ Uyarı maili gönderildi →", MAIL_TO.join(", "));
}

async function main(){
  let list=[]; try{ list=JSON.parse(fs.readFileSync(OUT,"utf8")); }catch(e){}
  // SADECE gerçek haberler: haftalık özet ve köşe yazıları hariç
  const real = list.filter(x=>!x.kose && !/Bu Hafta/i.test(title(x)));
  const newest = real.map(x=>tsOf(x.dt)).filter(Boolean).sort((a,b)=>b-a)[0] || 0;
  const gun = newest ? Math.floor((Date.now()-newest)/86400000) : 9999;

  if(gun < ESIK_GUN){ console.log(`Sağlık OK — en yeni gerçek haber ${gun} gün önce.`); return; }

  // BAYAT → alarm
  const son = real.slice().sort((a,b)=>tsOf(b.dt)-tsOf(a.dt))[0];
  const sonBaslik = son ? title(son) : "—";
  const sonTarih  = son ? (son.dt||"—") : "—";
  console.log(`⚠️ BAYAT: ${gun} gün yeni gerçek haber yok (eşik ${ESIK_GUN}).`);

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"></head>
  <body style="margin:0;background:#f4f6f8;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
   <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#fff;border:1px solid #e6eaef;border-radius:14px;overflow:hidden">
     <tr><td style="background:#B91C1C;padding:18px 24px;color:#fff;font:700 16px/1.3 Arial">⚠️ Netvo haber motoru bayat</td></tr>
     <tr><td style="padding:22px 24px;color:#1b1b1f;font:400 14px/1.6 Arial">
       <b>${gun} gündür yeni gerçek haber üretilmedi.</b> (Eşik: ${ESIK_GUN} gün)<br><br>
       En yeni gerçek haber: <b>${sonTarih}</b> — ${sonBaslik.replace(/</g,"&lt;")}<br><br>
       <b>Olası neden:</b> <code>ANTHROPIC_API_KEY</code> kredisi bitmiş veya anahtar geçersiz; günlük tarayıcı aday haberleri değerlendiremediği için "çöp basma" kuralıyla hiçbir şey yayınlamıyor.<br><br>
       <b>Ne yapmalı:</b><br>
       1) <a href="https://console.anthropic.com/settings/billing" style="color:#B91C1C">console.anthropic.com → Billing</a> — kredini kontrol et, gerekiyorsa kredi ekle.<br>
       2) Gerekirse yeni bir API key oluştur ve GitHub → netvo → Settings → Secrets → <code>ANTHROPIC_API_KEY</code>'i güncelle.<br>
       3) GitHub → Actions → "Günlük Haber" → Run workflow ile elle tetikle.<br><br>
       <span style="color:#6b7685;font-size:12px">Bu uyarı, motor düzelene kadar her sabah tekrarlanır. Site, görseller ve bülten tasarımı sorunsuz; eksik olan tek şey taze haber akışı.</span>
     </td></tr>
    </table>
   </td></tr></table></body></html>`;
  await send(`⚠️ Netvo: ${gun} gündür yeni haber yok — ANTHROPIC kredisini kontrol et`, html);
}
main();
