// NETVO — HESAP MOTORU REGRESYON TESTİ
// Commera_Site.html'den netFor'u CANLI çeker, doğrulanmış senaryolarla test eder.
// FAIL varsa exit 1 → build durur. build.mjs bunu ilk adımda çalıştırır.
import fs from "fs";
const H = fs.readFileSync(new URL("../Commera_Site.html", import.meta.url).pathname, "utf8");
const start = H.indexOf("function netFor(");
const end = H.indexOf("function readState(", start);
if (start < 0 || end < 0) { console.error("HESAP TESTİ: netFor bulunamadı"); process.exit(1); }
const src = H.slice(start, end).trim().replace(/;?\s*$/, "");
// netFor'u yalıt: sadece kendi argümanlarını + m.* alanlarını kullanır (DOM'suz, pür)
const netFor = new Function(src + "\n; return netFor;")();

const r2 = x => Math.round(x*100)/100;
let fails = 0;
function t(name, m, co, a, expNet){
  const r = netFor(m,co,a.S,a.M,a.rate,a.kargoG||0,a.fbaG||0,a.diger||0,a.vat,false,a.offset||false,a.offsiteOn||false,a.inVat===undefined?a.vat:a.inVat,a.ads||0,a.returns||0);
  const net = r2(r.net);
  const ok = Math.abs(net - expNet) < 0.05;
  if (!ok) fails++;
  console.log((ok?"PASS":"FAIL")+" | "+name+" | net="+net+" (bekl "+r2(expNet)+")");
}
t("Kayitli %15 brut",       {base:"gross"},               {vat:0.20}, {S:349,M:142,rate:0.15,vat:0.20,offset:true}, 120.15);
t("Kayitsiz %15",           {base:"gross"},               {vat:0.20}, {S:349,M:142,rate:0.15,vat:0.20,offset:false}, 86.01);
t("comVatIncl %15",         {base:"gross",comVatIncl:true},{vat:0.20},{S:349,M:142,rate:0.15,vat:0.20,offset:true}, 128.88);
t("base=net %15",           {base:"net"},                 {vat:0.20}, {S:349,M:142,rate:0.15,vat:0.20,offset:true}, 128.88);
t("KDV=0 ulke %15",         {base:"gross"},               {vat:0},    {S:349,M:142,rate:0.15,vat:0,inVat:0}, 154.65);
t("comCap=10",             {base:"gross",comCap:10},     {vat:0.20}, {S:349,M:142,rate:0.50,vat:0.20,offset:true}, 162.5);
t("kargo30 diger10 kayitli",{base:"gross"},              {vat:0.20}, {S:349,M:142,rate:0.15,vat:0.20,offset:true,kargoG:30,diger:10}, 86.82);
t("fixed ucret 5 kayitli",  {base:"gross",fixed:[["Listeleme",5]]},{vat:0.20},{S:349,M:142,rate:0.15,vat:0.20,offset:true}, 120.15-5/1.2);
t("pct ek %1.99 kayitli",   {base:"gross",pct:[["Guvenli",0.0199]]},{vat:0.20},{S:349,M:142,rate:0.15,vat:0.20,offset:true}, 120.15-349*0.0199);

if (fails) { console.error("HESAP TESTİ BAŞARISIZ: "+fails+" senaryo. Build durduruldu."); process.exit(1); }
console.log("✓ Hesap motoru regresyon: 9/9 PASS");
