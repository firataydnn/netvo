// ============================================================================
//  METİN → ham satırlar.  (PDF olmayan kaynaklar: HTML/metin ücret sayfaları)
//
//  Kullanım: node factory/metin_oku.mjs <key> <ham.txt>
//
//  "Kategori" ve "%oran" satırlarının ardışık geldiği tabloları okur.
//  Amazon TR gibi sayfalarda tablo <table> değil, alt alta metin olarak gelir.
//
//  Kural: gözle okuyup yazmak yok. Desen verilir, kod okur.
// ============================================================================
import fs from "fs";

const key = process.argv[2], dosya = process.argv[3];
if (!key || !dosya) { console.error("kullanım: node factory/metin_oku.mjs <key> <ham.txt>"); process.exit(1); }

const KOK = new URL("../", import.meta.url).pathname;
const metin = fs.readFileSync(dosya, "utf8");
const satirlar = metin.split("\n").map(s => s.trim()).filter(Boolean);

const ORAN = /^%\s*([\d]+(?:[.,]\d+)?)\s*$/;                      // "%15,5"
const ORAN_ICINDE = /%\s*([\d]+(?:[.,]\d+)?)/g;                   // cümle içinde
const KAT_OLAMAZ = /^(back|ücretler|kategori|satış komisyonu|sıkça sorulan|✕|\*|\[|!)/i;

const ham = [];
for (let i = 0; i < satirlar.length; i++) {
  const s = satirlar[i];
  const m = s.match(ORAN);
  if (!m) continue;
  // Oranın ÜSTÜNDEKİ ilk anlamlı satır = kategori adı
  let kat = null;
  for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
    const c = satirlar[j];
    if (!c || ORAN.test(c) || KAT_OLAMAZ.test(c) || c.length > 70 || /^\d/.test(c)) continue;
    kat = c; break;
  }
  if (!kat) continue;
  const oran = parseFloat(m[1].replace(",", "."));
  if (!isFinite(oran) || oran < 0 || oran > 60) continue;
  ham.push({ kat: kat.replace(/\s+/g, " ").trim(), oran });
}

// KADEMELİ ORANLAR: "500 TL veya daha düşük için %9, 500 TL üzeri için %14"
// Bir kategoride birden fazla oran varsa hepsini al — medyan ikisinin ortası olur,
// ve not alanında kademe açıklanır. Sessizce birini seçmek yanıltır.
for (let i = 0; i < satirlar.length; i++) {
  const s = satirlar[i];
  if (!/(daha düşük|üzerinde|yüksekse|veya daha)/i.test(s)) continue;
  const oranlar = [...s.matchAll(ORAN_ICINDE)].map(x => parseFloat(x[1].replace(",", ".")));
  if (!oranlar.length) continue;
  let kat = null;
  for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
    const c = satirlar[j];
    if (!c || ORAN.test(c) || KAT_OLAMAZ.test(c) || c.length > 70) continue;
    if (/(daha düşük|üzerinde|yüksekse)/i.test(c)) continue;
    kat = c; break;
  }
  if (!kat) continue;
  oranlar.filter(o => o >= 0 && o <= 60).forEach(o =>
    ham.push({ kat: kat.replace(/\s+/g, " ").trim(), oran: o, kademeli: true }));
}

// Tekilleştir
const gorulen = new Set(), tekil = [];
for (const s of ham) {
  const a = s.kat + "|" + s.oran;
  if (gorulen.has(a)) continue;
  gorulen.add(a); tekil.push(s);
}

const out = {
  kaynakDosya: dosya, cekildi: new Date().toISOString().slice(0, 10), kaynakTipi: "metin",
  hamSatirSayisi: ham.length, tekilSatirSayisi: tekil.length,
  hamSatirlar: tekil, belgeMetni: metin.slice(0, 200000),
};
fs.writeFileSync(KOK + `factory/parsed/${key}.json`, JSON.stringify(out));
console.log(`✓ ${dosya}`);
console.log(`  ham satır : ${ham.length} → tekil: ${tekil.length}`);
console.log(`  kategori  : ${new Set(tekil.map(x => x.kat)).size}`);
tekil.slice(0, 40).forEach(x => console.log(`     ${x.kat.padEnd(46)} %${x.oran}${x.kademeli ? "  (kademeli)" : ""}`));
