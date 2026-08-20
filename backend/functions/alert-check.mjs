// ============================================================================
//  NETVO — Ücret Uyarı Motoru (Pro retention kancası)
//  Her gün: güncel oranları siteden oku → Supabase'deki takipleri (watches) ile
//  kıyasla → değişen oran için rate_changes kaydı aç + o pazaryerini takip eden
//  Pro kullanıcılara Resend ile e-posta gönder.
//
//  Çalıştır (GitHub Actions cron): node backend/functions/alert-check.mjs
//  Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SITE_URL
//  Bağımlılık yok (Supabase REST + Resend REST, fetch ile).
// ============================================================================
import fs from "fs";
const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY, SITE = process.env.SITE_URL || "https://netvo.co";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" };

// --- güncel oranları siteden çıkar (tek kaynak) ---
function siteRates(){
  const HTML = fs.readFileSync(new URL("../../Commera_Site.html", import.meta.url).pathname, "utf8");
  const code=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
  const El=()=>{const e={style:{},dataset:{},classList:{add(){},remove(){},toggle:()=>false,contains:()=>false},children:[]};
    ["appendChild","setAttribute","removeAttribute","addEventListener","insertAdjacentHTML","focus","remove"].forEach(f=>e[f]=()=>{});
    e.getAttribute=()=>"";e.querySelector=()=>El();e.querySelectorAll=()=>[];
    Object.defineProperty(e,"innerHTML",{set(){},get:()=>""});Object.defineProperty(e,"textContent",{set(){},get:()=>""});
    Object.defineProperty(e,"value",{set(){},get:()=>"trendyol"});e.files=[];return e;};
  const doc={getElementById:()=>El(),querySelector:()=>El(),querySelectorAll:()=>[],createElement:()=>El(),createElementNS:()=>El(),body:El(),head:El(),documentElement:El(),addEventListener(){},title:""};
  const win={addEventListener(){},location:{hash:"",search:""},matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){}};
  const fn=new Function("document","window","localStorage","location","navigator","matchMedia","setTimeout","addEventListener","URL","Blob","FileReader","requestAnimationFrame","alert","toast","console",
    code+"\nreturn {MK, pickCat:(typeof pickCat!=='undefined'?pickCat:null)};");
  return fn(doc,win,{getItem:()=>null,setItem(){},removeItem(){}},win.location,{language:"tr"},win.matchMedia,f=>{try{f()}catch(e){}},()=>{},{createObjectURL:()=>"x",revokeObjectURL(){}},function(){},function(){},f=>f&&f(),()=>{},()=>{},console);
}
const { MK, pickCat } = siteRates();
function currentRate(mk, cat){
  const m = MK[mk]; if(!m) return null;
  if(pickCat){ const pc = pickCat(m, cat||"genel"); if(pc && pc.rate!=null) return pc.rate; }
  if(m.cats&&m.cats.length){ const r=m.cats.map(c=>c[1]); return r.reduce((a,b)=>a+b,0)/r.length; }
  return m.fixedRate!=null?m.fixedRate:null;
}

const rest = (path, opts={}) => fetch(`${SB}/rest/v1/${path}`, { headers:H, ...opts }).then(r=>r.json());

async function sendEmail(to, subject, html){
  if(!RESEND){ console.log("(RESEND yok) e-posta atlanmadı:", to, subject); return; }
  await fetch("https://api.resend.com/emails", { method:"POST",
    headers:{ Authorization:`Bearer ${RESEND}`, "content-type":"application/json" },
    body: JSON.stringify({ from:"Netvo <uyari@netvo.co>", to, subject, html }) });
}

async function main(){
  // Pro kullanıcıların takipleri (profiles.tier='pro') — join
  const watches = await rest("watches?select=id,user_id,mk,cat,last_rate,profiles!inner(email,tier,locale)&profiles.tier=eq.pro");
  if(!Array.isArray(watches)){ console.error("watches alınamadı:", watches); return; }
  let changed=0;
  for(const w of watches){
    const cur = currentRate(w.mk, w.cat);
    if(cur==null) continue;
    if(w.last_rate==null){ // ilk gözlem — sadece kaydet
      await rest(`watches?id=eq.${w.id}`, { method:"PATCH", body:JSON.stringify({ last_rate:cur }) }); continue;
    }
    if(Math.abs(cur - w.last_rate) >= 0.1){       // anlamlı değişiklik
      changed++;
      await rest("rate_changes", { method:"POST", body:JSON.stringify({ mk:w.mk, cat:w.cat, old_rate:w.last_rate, new_rate:cur, source:(MK[w.mk]||{}).source||null }) });
      await rest(`watches?id=eq.${w.id}`, { method:"PATCH", body:JSON.stringify({ last_rate:cur }) });
      const nm=(MK[w.mk]||{}).n||w.mk, yon = cur>w.last_rate ? "arttı" : "düştü";
      const email = w.profiles && w.profiles.email;
      if(email) await sendEmail(email, `${nm} komisyonu ${yon}: %${w.last_rate} → %${cur}`,
        `<p><b>${nm}</b> (${w.cat}) komisyonu <b>%${w.last_rate} → %${cur}</b> ${yon}.</p>
         <p>1000 siparişte marjına etkisini <a href="${SITE}/uygula/#/pazaryeri/${w.mk}">hesapla →</a></p>
         <p style="color:#888;font-size:12px">Bu uyarıyı Netvo takip listenden aldın. Çıkmak için hesabından takibi kaldır.</p>`);
    }
  }
  console.log(`Uyarı taraması bitti. Değişen oran: ${changed} / ${watches.length} takip.`);
}
main();
