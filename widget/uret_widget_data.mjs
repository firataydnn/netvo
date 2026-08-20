// ============================================================================
//  NETVO WIDGET VERİSİ — kompakt, tek-kaynaklı
//  Siteden (Commera_Site.html) en çok kullanılan pazaryerlerinin temsili
//  oranını çıkarır → widget/data.json. Widget bunu okur. Sitede oran değişince
//  yeniden çalıştır → widget güncellenir. Kopya veri yok.
//  Çalıştır: node widget/uret_widget_data.mjs
// ============================================================================
import fs from "fs";
const KOK = new URL("../", import.meta.url).pathname;
const HTML = fs.readFileSync(KOK + "Commera_Site.html", "utf8");

function siteyiOku(){
  const code=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
  const El=()=>{const e={style:{},dataset:{},classList:{add(){},remove(){},toggle:()=>false,contains:()=>false},children:[]};
    ["appendChild","setAttribute","removeAttribute","addEventListener","insertAdjacentHTML","focus","remove"].forEach(f=>e[f]=()=>{});
    e.getAttribute=()=>"";e.querySelector=()=>El();e.querySelectorAll=()=>[];
    Object.defineProperty(e,"innerHTML",{set(){},get:()=>""});Object.defineProperty(e,"textContent",{set(){},get:()=>""});
    Object.defineProperty(e,"value",{set(){},get:()=>"trendyol"});e.files=[];return e;};
  const doc={getElementById:()=>El(),querySelector:()=>El(),querySelectorAll:()=>[],createElement:()=>El(),createElementNS:()=>El(),body:El(),head:El(),documentElement:El(),addEventListener(){},title:""};
  const win={addEventListener(){},location:{hash:"",search:""},matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){}};
  const fn=new Function("document","window","localStorage","location","navigator","matchMedia","setTimeout","addEventListener","URL","Blob","FileReader","requestAnimationFrame","alert","toast","console",
    code+"\nreturn {MK,CO};");
  return fn(doc,win,{getItem:()=>null,setItem(){},removeItem(){}},win.location,{language:"tr"},win.matchMedia,f=>{try{f()}catch(e){}},()=>{},{createObjectURL:()=>"x",revokeObjectURL(){}},function(){},function(){},f=>f&&f(),()=>{},()=>{},console);
}
const { MK, CO } = siteyiOku();

const TOP = ["trendyol","hepsiburada","amazontr","n11","amazonus","amazonde","amazonuk","ebayus","etsy","mercadolibre","allegro","shopee","coupang","noon","flipkart","bol","cdiscount","zalando","walmart","aliexpress"];
const median=a=>{const s=[...a].sort((x,y)=>x-y);const m=(s.length-1)/2;return s.length%2?s[m|0]:+((s[(m|0)]+s[(m|0)+1])/2).toFixed(1);};
function rateOf(m){ if(m.cats&&m.cats.length) return median(m.cats.map(c=>c[1])); return m.fixedRate!=null?m.fixedRate:null; }

const data = TOP.filter(k=>MK[k]).map(k=>{
  const m=MK[k], co=CO[m.co]||{};
  return { k, n:m.n, rate:rateOf(m), vat:co.vat||0, cur:(co.cur||"").trim(), base:m.base||"gross", comVatIncl:!!m.comVatIncl };
}).filter(x=>x.rate!=null);

fs.mkdirSync(KOK+"widget",{recursive:true});
fs.writeFileSync(KOK+"widget/data.json", JSON.stringify(data,null,1));
console.log(`widget/data.json yazıldı — ${data.length} pazaryeri (temsili oran).`);
