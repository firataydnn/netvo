// ============================================================================
//  COMMERA VERİ FABRİKASI — ortak kütüphane
//
//  Neden var: Bugün üç pazaryerini elle işledim. Trendyol'da PDF'i koda
//  ayrıştırdım → 18/18 doğru. Hepsiburada'da metni gözle okudum → 7 hata.
//  Hatanın tamamı "belgeye bakıp sayı yazma" adımında oldu.
//  Bu dosya o adımı insandan alır.
//
//  Kural: Bir sayı bu fabrikadan geçmediyse siteye giremez.
// ============================================================================

// ---- 1. KDV KURALI SÖZLÜĞÜ -------------------------------------------------
// Bugün üç pazaryerinde üç farklı kural bulduk. Tahmin edilemez, BELGEDEN okunur.
// Bir sayının %20 yanlış olması ile doğru olması arasındaki fark budur.
export const KDV_KALIPLARI = [
  // Oran KDV'yi İÇERİYOR → ücret = fiyat × oran   (üstüne KDV EKLENMEZ)
  { kural: "incl", rx: /kdv\s*dahil/i,                     dil: "tr" },
  { kural: "incl", rx: /kdv\s*dahildir/i,                  dil: "tr" },
  { kural: "incl", rx: /vergiler\s*dahil/i,                dil: "tr" },
  { kural: "incl", rx: /\bincl(uding|\.)?\s*vat\b/i,       dil: "en" },
  { kural: "incl", rx: /\bvat\s*included\b/i,              dil: "en" },
  { kural: "incl", rx: /inclusive\s*of\s*(any\s*)?vat/i,   dil: "en" },
  { kural: "incl", rx: /\bbrutto\b/i,                      dil: "de" },
  { kural: "incl", rx: /inkl\.?\s*mwst/i,                  dil: "de" },
  { kural: "incl", rx: /\bt\.?t\.?c\.?\b/i,               dil: "fr" },
  { kural: "incl", rx: /iva\s*incluido/i,                  dil: "es" },
  { kural: "incl", rx: /\bbrutto\b|\bz\s*vat\b/i,          dil: "pl" },

  // Oran KDV HARİÇ → ücret = fiyat × oran × (1+KDV)
  { kural: "excl", rx: /\+\s*kdv/i,                        dil: "tr" },
  { kural: "excl", rx: /kdv\s*hariç/i,                     dil: "tr" },
  { kural: "excl", rx: /exclusive\s*of\s*(any\s*)?(value-added tax|vat)/i, dil: "en" },
  { kural: "excl", rx: /\bexcl(uding|\.)?\s*vat\b/i,       dil: "en" },
  { kural: "excl", rx: /\bplus\s*vat\b/i,                  dil: "en" },
  { kural: "excl", rx: /\bnet(to)?\s*(of\s*)?vat\b/i,      dil: "en" },
  { kural: "excl", rx: /zzgl\.?\s*mwst|\bnetto\b/i,        dil: "de" },
  { kural: "excl", rx: /\bh\.?t\.?\b|hors\s*taxes/i,      dil: "fr" },
  { kural: "excl", rx: /iva\s*no\s*incluido|más\s*iva/i,   dil: "es" },
  { kural: "excl", rx: /\bbez\s*vat\b/i,                    dil: "pl" },
];

// Belgeden KDV kuralını ÇIKAR — ve kanıtı sakla. Kanıtsız kural kabul edilmez.
export function kdvKuraliBul(metin) {
  const bulunan = [];
  for (const k of KDV_KALIPLARI) {
    const m = metin.match(k.rx);
    if (!m) continue;
    const i = m.index;
    const alinti = metin.slice(Math.max(0, i - 70), Math.min(metin.length, i + 70))
      .replace(/\s+/g, " ").trim();
    bulunan.push({ kural: k.kural, dil: k.dil, eslesen: m[0], alinti });
  }
  if (!bulunan.length)
    return { kural: null, guven: "yok", not: "Belgede KDV ifadesi bulunamadı — İNSAN OKUMALI", kanitlar: [] };

  const incl = bulunan.filter(b => b.kural === "incl");
  const excl = bulunan.filter(b => b.kural === "excl");
  // Çelişki = insana git. Sessizce birini seçmek, bugün kaçınmaya çalıştığımız şeyin ta kendisi.
  if (incl.length && excl.length)
    return { kural: null, guven: "celiski",
             not: `Belge hem "KDV dahil" (${incl.length}) hem "KDV hariç" (${excl.length}) diyor — İNSAN KARAR VERMELİ`,
             kanitlar: bulunan.slice(0, 6) };
  const kural = incl.length ? "incl" : "excl";
  return { kural, guven: bulunan.length >= 2 ? "yuksek" : "dusuk",
           not: bulunan.length === 1 ? "Tek eşleşme — doğrula" : "",
           kanitlar: bulunan.slice(0, 4) };
}

// ---- 2. NORMALLEŞTİRİLMİŞ KATEGORİLER ------------------------------------
// TEK KAYNAK: Commera_Site.html'den okunur, BURADA KOPYALANMAZ.
// Neden: ilk sürümde buraya elle kopyaladım ve 10 kategorinin 7'sinde ayrıştı.
// Fabrika "Ev & Yaşam"ı yanlış kovaya atıp %21 yerine %19 üretti.
// Kopya = ayrışma. Ayrışma = yanlış sayı.
import fs from "fs";
function NORMoku() {
  const site = fs.readFileSync(new URL("../Commera_Site.html", import.meta.url).pathname, "utf8");
  const blok = site.match(/const NORM=\[([\s\S]*?)\n\];/);
  if (!blok) throw new Error("Sitede NORM bulunamadı — fabrika çalışamaz");
  const out = [];
  const rx = /\{k:"(\w+)",n:"([^"]*)",rx:\/([^\/]+)\/i\}/g;
  let m;
  while ((m = rx.exec(blok[1]))) out.push({ k: m[1], n: m[2], rx: new RegExp(m[3], "i") });
  if (out.length < 5) throw new Error("NORM ayrıştırılamadı — fabrika çalışamaz");
  return out;
}
export const NORM = NORMoku();

// ---- 3. İSTATİSTİK ---------------------------------------------------------
// MEDYAN — ortalama değil. Bir uç oran (%0 dijital kod, %30 aksesuar) tabloyu bozmasın.
// Bugün Hepsiburada'da bunu uygulamayıp "göze çarpanı" yazdım → 7 hata.
export function medyan(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(2);
}

// ---- 4. ORAN AYIKLAMA ------------------------------------------------------
// Metinden yüzde çıkar. "20,34%" / "20.34%" / "%20,34" / "13.6% on total"
export function oranlariAyikla(metin) {
  const out = [];
  const rx = /(?:%\s*([\d]+(?:[.,]\d+)?)|([\d]+(?:[.,]\d+)?)\s*%)/g;
  let m;
  while ((m = rx.exec(metin))) {
    const v = parseFloat((m[1] || m[2]).replace(",", "."));
    if (isFinite(v) && v >= 0 && v <= 60) out.push({ oran: v, konum: m.index });
  }
  return out;
}

// ---- 5. NORM EŞLEŞTİRME ----------------------------------------------------
// Bir üst kategori adını normalleştirilmiş kovaya at. Eşleşmezse ATMA — rapor et.
export function normaEsle(katAdi) {
  const hit = NORM.find(x => x.rx.test(katAdi));
  return hit ? hit.k : null;
}

// KAYNAK ÜST KATEGORİSİ bazında medyan — cats listesi bundan üretilir.
// NORM kovası DEĞİL: sitenin ev regex'i "market" içerir ve Süpermarket'i de
// Yapı Market'i de aynı kovaya atar; medyan bulanır. Site zaten pickCat ile
// gerçek kategori adını seçiyor — fabrika ona gerçek kategori adı + medyanı vermeli.
export function kaynakKategorileri(satirlar) {
  const g = {};
  for (const s of satirlar) (g[s.kat] = g[s.kat] || []).push(s);
  const out = {};
  for (const [kat, arr] of Object.entries(g)) {
    const v = arr.map(x => x.oran);
    out[kat] = { medyan: medyan(v), min: Math.min(...v), max: Math.max(...v), n: v.length,
                 normKova: normaEsle(kat), ornekSatirlar: arr.slice(0, 3) };
  }
  return out;
}

// NORM KAPSAMA denetimi: her normalleştirilmiş kategorinin kaynakta karşılığı var mı?
export function normKapsama(kaynakKats) {
  const out = {};
  for (const x of NORM) {
    const esleşen = Object.entries(kaynakKats).filter(([k]) => x.rx.test(k));
    out[x.k] = { ad: x.n, esleşenKaynakKat: esleşen.map(([k, v]) => ({ kat: k, medyan: v.medyan, n: v.n })) };
  }
  return out;
}

// Ham (kategori, oran) satırlarını NORM kovalarına topla, her kova için medyan al.
export function kovalaVeMedyanla(satirlar) {
  const kova = {}, disarida = {};
  for (const s of satirlar) {
    const k = normaEsle(s.kat);
    if (k) (kova[k] = kova[k] || []).push({ ...s });
    else (disarida[s.kat] = disarida[s.kat] || []).push(s.oran);
  }
  const sonuc = {};
  for (const [k, arr] of Object.entries(kova)) {
    const vals = arr.map(x => x.oran);
    sonuc[k] = {
      medyan: medyan(vals), min: Math.min(...vals), max: Math.max(...vals), n: vals.length,
      // İZ: bu medyan hangi satırlardan geldi? Denetçi bunu kontrol eder.
      kaynakSatirlar: arr.slice(0, 40),
    };
  }
  return { kovalar: sonuc, esleşmeyen: Object.keys(disarida) };
}

// ---- 6. MODEL EŞDEĞERLİĞİ --------------------------------------------------
// netFor'da iki yol aynı sonucu verir:
//   base:"net"  + pf()          → ücret_brüt = (S/1+v) × r × (1+v) = S × r
//   base:"gross"+ comVatIncl    → ücret_brüt = S × r
// Yani "KDV dahil oran" için ikisi de doğru. Fabrika TEK yolu dayatır:
//   incl → base:"gross" + comVatIncl:true
//   excl → base:"gross" + (comVatIncl yok)
// Böylece kural belgeden okunur ve koda birebir yansır; iki farklı yol karışmaz.
export function modelAlanlari(kdvKurali) {
  if (kdvKurali === "incl") return { base: "gross", comVatIncl: true };
  if (kdvKurali === "excl") return { base: "gross", comVatIncl: false };
  throw new Error("KDV kuralı bilinmeden model alanı üretilemez");
}

// Beklenen brüt komisyon — denetçi bunu siteye karşı test eder.
export function beklenenBrutKomisyon(S, oran, kdvKurali, kdvOrani) {
  const r = oran / 100;
  return kdvKurali === "incl" ? S * r : S * r * (1 + kdvOrani);
}
