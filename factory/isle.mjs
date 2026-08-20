// ============================================================================
//  İŞLE — ham satırlar → NORM kovaları + medyan + KDV kuralı
//
//  Çalıştır: node factory/isle.mjs <key>
//  Girdi   : factory/parsed/<key>.json   (hamSatirlar + belgeMetni)
//  Çıktı   : aynı dosya, kovalar + kdvKurali + MK yaması eklenmiş
//
//  Buradan çıkan sayı insan eli değmemiş sayıdır.
// ============================================================================
import fs from "fs";
import { kovalaVeMedyanla, kaynakKategorileri, normKapsama, kdvKuraliBul, NORM, modelAlanlari } from "./lib.mjs";

const key = process.argv[2];
if (!key) { console.error("kullanım: node factory/isle.mjs <key>"); process.exit(1); }

const KOK = new URL("../", import.meta.url).pathname;
const pf = KOK + `factory/parsed/${key}.json`;
const p = JSON.parse(fs.readFileSync(pf, "utf8"));

// ---- 1. KDV kuralını BELGEDEN oku ----
const kdv = kdvKuraliBul(p.belgeMetni || "");
p.kdvKurali = kdv.kural;
p.kdvGuven = kdv.guven;
p.kdvKanitlar = kdv.kanitlar;
p.kdvNot = kdv.not;

// ---- 2. Kaynağın KENDİ kategorileri (cats listesi bundan çıkar) ----
p.kaynakKats = kaynakKategorileri(p.hamSatirlar);
p.normKapsama = normKapsama(p.kaynakKats);
// NORM kovaları da tutulur (denetçi izi için)
const { kovalar, esleşmeyen } = kovalaVeMedyanla(p.hamSatirlar);
p.kovalar = kovalar;
p.esleşmeyen = esleşmeyen;

fs.writeFileSync(pf, JSON.stringify(p, null, 1));

// ---- 3. RAPOR ----
console.log(`\n═══ ${key} ═══`);
console.log(`kaynak: ${p.kaynakDosya || p.url}   çekildi: ${p.cekildi}`);
console.log(`satır : ${p.hamSatirSayisi} ham → ${p.tekilSatirSayisi} tekil\n`);

console.log("KDV KURALI — belgeden okundu:");
if (!kdv.kural) {
  console.log(`  ✗ ${kdv.not}`);
  if (kdv.kanitlar.length) kdv.kanitlar.forEach(k => console.log(`     [${k.kural}] "${k.eslesen}" — …${k.alinti}…`));
} else {
  console.log(`  ${kdv.guven === "yuksek" ? "✓" : "⚠"} ${kdv.kural === "incl" ? "ORAN KDV DAHİL — üstüne KDV eklenmez" : "ORAN KDV HARİÇ — üstüne KDV eklenir"}  (güven: ${kdv.guven})`);
  kdv.kanitlar.slice(0, 2).forEach(k => console.log(`     kanıt: "${k.eslesen}" — …${k.alinti}…`));
  if (kdv.not) console.log(`     ⚠ ${kdv.not}`);
}

console.log("\nKAYNAĞIN KENDİ KATEGORİLERİ (medyan):");
const kk = Object.entries(p.kaynakKats).sort((a,b)=>b[1].medyan-a[1].medyan);
kk.forEach(([kat, v]) => console.log(`  ${(v.normKova?"✓":"○")} ${kat.slice(0,26).padEnd(28)} %${String(v.medyan).padStart(6)}   (n=${String(v.n).padStart(4)}, ${v.min}–${v.max})${v.normKova?"  → "+v.normKova:"  → NORM dışı"}`));

console.log("\nNORM KAPSAMA — her kategorimizin kaynakta karşılığı var mı?");
for (const x of NORM) {
  const c = p.normKapsama[x.k].esleşenKaynakKat;
  if (!c.length) { console.log(`  ○ ${x.n.padEnd(26)} — KARŞILIĞI YOK`); continue; }
  console.log(`  ✓ ${x.n.padEnd(26)} ← ${c.map(y=>y.kat+" %"+y.medyan).slice(0,3).join(" · ")}`);
}
if (esleşmeyen.length)
  console.log(`\n  eşleşmeyen üst kategori (${esleşmeyen.length}): ${esleşmeyen.slice(0, 8).join(" · ")}${esleşmeyen.length > 8 ? " …" : ""}`);

// ---- 4. MK yaması öner ----
if (kdv.kural) {
  const alan = modelAlanlari(kdv.kural);
  const cats = kk.map(([kat, v]) => [kat, v.medyan]);
  console.log(`\nMK ALANLARI (fabrikadan):`);
  console.log(`  base:"${alan.base}"${alan.comVatIncl ? ", comVatIncl:true" : ""}`);
  console.log(`  cats: ${JSON.stringify(cats)}`);
}
console.log();
