// ============================================================================
//  DENETÇİ — "Bu sayı nereden geliyor?"
//
//  Sitedeki HER oranı alır, kaynak belgeye kadar izini sürer.
//  İzi çıkmayan sayı = götten atılmış sayı. Rapor eder.
//
//  Bugün 7 hata yaptım. Bu araç olsaydı hepsini yakalardı:
//    Hepsiburada Bilgisayar %7 → parsed'da medyan %10 → İZ TUTMUYOR ✗
//
//  Çalıştır: node factory/denetle.mjs
// ============================================================================
import fs from "fs";
import { medyan, beklenenBrutKomisyon } from "./lib.mjs";

const KOK = new URL("../", import.meta.url).pathname;
const site = fs.readFileSync(KOK + "Commera_Site.html", "utf8");
const sicil = JSON.parse(fs.readFileSync(KOK + "factory/sources.json", "utf8"));

// ---- Siteden MK'yı çalıştırarak al (regex ile ayrıştırma, kod çalıştır) ----
function siteyiYukle() {
  const code = site.match(/<script>([\s\S]*?)<\/script>/)[1];
  const mkEl = () => ({ textContent: "", innerHTML: "", value: "", style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, querySelectorAll: () => [], querySelector: () => null,
    addEventListener() {}, setAttribute() {}, getAttribute: () => null, focus() {},
    dataset: {}, checked: false, options: [], children: [] });
  const doc = { getElementById: () => mkEl(), querySelectorAll: () => [], querySelector: () => null,
    createElement: () => mkEl(), addEventListener() {}, body: mkEl(), documentElement: mkEl(), title: "" };
  const win = { addEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: false }), location: { hash: "" } };
  const fn = new Function("document", "window", "location", "localStorage", "navigator",
    "fetch", "alert", "prompt", "confirm", "setTimeout",
    code + "; return {MK,CO,NORM,pickCat,netFor,provOf,mkShort};");
  return fn(doc, win, { hash: "", href: "" }, { getItem: () => null, setItem() {} },
    { language: "tr-TR" }, () => Promise.resolve({ json: () => Promise.resolve({}) }),
    () => {}, () => null, () => true, () => 0);
}
const A = siteyiYukle();

const R = { izTutan: 0, izYok: 0, kaynaksiz: 0, kdvBilinmiyor: 0, hatalar: [], uyarilar: [] };

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║  COMMERA VERİ DENETİMİ — her sayının izi sürülüyor             ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

for (const k of Object.keys(A.MK)) {
  const m = A.MK[k], s = sicil[k];
  const ad = A.mkShort(m.n);

  // --- 1. Kaynak var mı? ---
  if (!m.source) { R.kaynaksiz++; continue; }

  // --- 2. KDV kuralı belgeden okunmuş mu? ---
  if (!s || !s.kdvKurali) {
    R.kdvBilinmiyor++;
    R.uyarilar.push(`${ad}: kaynak linki var ama KDV kuralı belgeden OKUNMAMIŞ — oranlar %20 yanılabilir`);
  }

  // --- 3. Ayrıştırılmış kaynak dosyası var mı? İz sürülebilir mi? ---
  const pf = KOK + `factory/parsed/${k}.json`;
  if (!fs.existsSync(pf)) {
    R.izYok++;
    R.hatalar.push(`${ad}: kaynak linki var ama AYRIŞTIRILMIŞ VERİ YOK → sitedeki oranlar izlenemiyor (elle yazılmış)`);
    continue;
  }

  // --- 4. Sitedeki her oran, ayrıştırılmış veride var mı? ---
  const p = JSON.parse(fs.readFileSync(pf, "utf8"));
  const cats = m.cats || (m.fixedRate !== undefined ? [["(tek oran)", m.fixedRate]] : []);
  let tut = 0, tutmaz = [];
  for (const [ad2, oran] of cats) {
    const kova = p.kovalar && Object.values(p.kovalar).find(x => Math.abs(x.medyan - oran) < 0.005);
    const hamSatir = p.hamSatirlar && p.hamSatirlar.some(r => Math.abs(r.oran - oran) < 0.005);
    if (kova || hamSatir) tut++;
    else tutmaz.push(`${ad2} %${oran}`);
  }
  if (tutmaz.length) {
    R.izYok++;
    R.hatalar.push(`${ad}: ${tutmaz.length}/${cats.length} oranın kaynakta karşılığı YOK → ${tutmaz.slice(0, 4).join(" · ")}`);
  } else {
    R.izTutan++;
  }

  // --- 5. KDV kuralı ile model alanları uyuşuyor mu? ---
  if (s && s.kdvKurali) {
    const co = A.CO[m.co], v = (co.vat || 0) / 100;
    if (v > 0 && cats.length) {
      const oran = cats[0][1];
      const bek = beklenenBrutKomisyon(1000, oran, s.kdvKurali, v);
      const klon = JSON.parse(JSON.stringify(m)); klon.fixed = []; klon.pct = []; delete klon.perOrder;
      const r = A.netFor(klon, co, 1000, 0, oran / 100, 0, 0, 0, v, false, true, false, v, 0, 0);
      const ger = (1000 / (1 + v) - r.net) * (1 + v);
      if (Math.abs(ger - bek) > 0.02) {
        R.hatalar.push(`${ad}: KDV kuralı "${s.kdvKurali}" ama model ₺${ger.toFixed(2)} kesiyor, belgeye göre ₺${bek.toFixed(2)} olmalı → ${(ger > bek ? "FAZLA" : "EKSİK")} ₺${Math.abs(ger - bek).toFixed(2)}`);
      }
    }
  }
}

// ---- RAPOR ----
console.log("İZ SÜRÜLEBİLİRLİK");
console.log(`  ✓ Kaynağa kadar izi sürülen : ${R.izTutan}/136`);
console.log(`  ✗ İzi sürülemeyen           : ${R.izYok}/136   (kaynak linki var, ayrıştırılmış veri yok)`);
console.log(`  ○ Hiç kaynağı olmayan       : ${R.kaynaksiz}/136`);
console.log(`  ⚠ KDV kuralı okunmamış      : ${R.kdvBilinmiyor}/136\n`);

if (R.hatalar.length) {
  console.log("HATALAR — bu sayılar kaynağa bağlanamıyor:");
  R.hatalar.slice(0, 12).forEach(h => console.log("  ✗ " + h));
  if (R.hatalar.length > 12) console.log(`  … ve ${R.hatalar.length - 12} tane daha`);
  console.log();
}
if (R.uyarilar.length) {
  console.log(`UYARILAR: ${R.uyarilar.length} pazaryerinde KDV kuralı belgeden okunmamış`);
  R.uyarilar.slice(0, 3).forEach(u => console.log("  ⚠ " + u));
  console.log();
}

const skor = Math.round(R.izTutan / 136 * 100);
console.log(`VERİ BÜTÜNLÜĞÜ: %${skor}  (${R.izTutan}/136 pazaryeri belgeye bağlı)`);
console.log(R.izTutan === 136 ? "\n✓ Her sayının izi kaynağa çıkıyor." :
  `\n→ ${136 - R.izTutan} pazaryeri hâlâ fabrikadan geçmedi.`);
process.exit(0);
