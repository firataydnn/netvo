#!/usr/bin/env python3
"""
PDF → ham satırlar. Fabrikanın giriş kapısı.

Kullanım:
  python3 factory/pdf_oku.py <pdf> <cikti.json> --kat 1 --oran 5
    --kat  : üst kategori sütun no
    --oran : oran sütun no

Gözle okuma yok. Sütun numarası verilir, kod okur.
Bugünkü 7 hatanın tamamı "gözle okuyup yazma" adımında oldu.
"""
import sys, json, re, argparse, datetime

ap = argparse.ArgumentParser()
ap.add_argument("pdf"); ap.add_argument("cikti")
ap.add_argument("--kat", type=int, required=True)
ap.add_argument("--oran", type=int, required=True)
ap.add_argument("--alt", type=int, default=None)
ap.add_argument("--grp", type=int, default=None)
a = ap.parse_args()

import pdfplumber

ham, metin_tum = [], []
with pdfplumber.open(a.pdf) as pdf:
    for pg in pdf.pages:
        t = pg.extract_text() or ""
        metin_tum.append(t)
        tb = pg.extract_table()
        if not tb:
            continue
        # BAŞLIKLARI da metne kat. Trendyol'da "KDV Dahil" ibaresi SADECE
        # tablo başlığındaydı; extract_text onu görmüyordu ve fabrika
        # KDV kuralını "Benetton" markasının içindeki "netto"dan okuyordu.
        if tb and tb[0]:
            metin_tum.append(" | ".join(str(c or "").replace("\n", " ") for c in tb[0]))
        for r in tb:
            if not r or len(r) <= max(a.kat, a.oran):
                continue
            kat = (r[a.kat] or "").strip()
            oran_s = (r[a.oran] or "").strip()
            m = re.match(r"([\d]+(?:[.,]\d+)?)\s*%?", oran_s)
            if not kat or not m:
                continue
            try:
                oran = float(m.group(1).replace(",", "."))
            except ValueError:
                continue
            if not (0 <= oran <= 60):
                continue
            satir = {
                "kat": re.sub(r"\d+$", "", kat).strip(),
                "oran": oran,
            }
            if a.alt is not None and len(r) > a.alt:
                satir["alt"] = re.sub(r"\s+", " ", (r[a.alt] or "")).strip()
            if a.grp is not None and len(r) > a.grp:
                satir["grp"] = re.sub(r"\s+", " ", (r[a.grp] or "")).strip()
            ham.append(satir)

# TEKİLLEŞTİR: aynı ürün grubu marka satırlarında tekrar eder.
# Tekilleştirmezsek çok markalı kategoriler medyanı ezer.
tekil, gorulen = [], set()
for s in ham:
    anahtar = (s["kat"], s.get("alt", ""), s.get("grp", ""))
    if anahtar in gorulen:
        continue
    gorulen.add(anahtar)
    tekil.append(s)

out = {
    "kaynakDosya": a.pdf,
    "cekildi": datetime.date.today().isoformat(),
    "kaynakTipi": "pdf",
    "hamSatirSayisi": len(ham),
    "tekilSatirSayisi": len(tekil),
    "hamSatirlar": tekil,
    "belgeMetni": "\n".join(metin_tum)[:200000],
}
json.dump(out, open(a.cikti, "w"), ensure_ascii=False)
print(f"✓ {a.pdf}")
print(f"  ham satır      : {len(ham)}")
print(f"  tekil ürün grubu: {len(tekil)}")
kats = {}
for s in tekil:
    kats.setdefault(s["kat"], 0)
    kats[s["kat"]] += 1
print(f"  üst kategori   : {len(kats)}")
