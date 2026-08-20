// ============================================================================
//  NETVO — DEPLOY BUILD
//  Her şeyi tek "public/" klasörüne dizer. Cloudflare Pages bunu yayınlar.
//  Build komutu (Cloudflare):  node build.mjs      Çıktı dizini:  public
//  Env: SITE_URL (varsayılan https://netvo.co)
// ============================================================================
import { execSync } from "child_process";
import fs from "fs";

const SITE = process.env.SITE_URL || "https://netvo.co";
const OUT = process.env.PUBLIC_DIR || "public";

console.log("→ SEO sayfaları üretiliyor:", SITE);
execSync(`node seo/uret.mjs ${SITE}`, { stdio: "inherit" });

console.log("→ public/ hazırlanıyor");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 1) SEO sitesi (TR kök hub + /en /de ... + sitemap + robots) → public/
fs.cpSync("seo/site", OUT, { recursive: true });

// 2) KÖK = GÜZEL UYGULAMA. Sade SEO hub'ı /pazaryeri/ altına taşı.
//    Böylece netvo.co açılınca herkes asıl siteyi görür; Google sade hub'ı /pazaryeri/'de bulur.
if (fs.existsSync(`${OUT}/index.html`)) {
  fs.mkdirSync(`${OUT}/pazaryeri`, { recursive: true });
  fs.renameSync(`${OUT}/index.html`, `${OUT}/pazaryeri/index.html`);
}
fs.copyFileSync("Commera_Site.html", `${OUT}/index.html`);          // kök = uygulama
fs.mkdirSync(`${OUT}/uygula`, { recursive: true });
fs.copyFileSync("Commera_Site.html", `${OUT}/uygula/index.html`);   // eski linkler için alias

// 3) Widget → public/widget/ (yalnız gerekli statikler)
fs.mkdirSync(`${OUT}/widget`, { recursive: true });
for (const f of ["embed.js", "netvo-widget.html", "data.json"]) {
  if (fs.existsSync(`widget/${f}`)) fs.copyFileSync(`widget/${f}`, `${OUT}/widget/${f}`);
}

// 4) İçerik motoru çıktısı → public/data/haberler.json
fs.mkdirSync(`${OUT}/data`, { recursive: true });
if (fs.existsSync("icerik/haberler.json")) fs.copyFileSync("icerik/haberler.json", `${OUT}/data/haberler.json`);

// 5) Marka varlıkları → public/marka/
if (fs.existsSync("marka")) {
  fs.mkdirSync(`${OUT}/marka`, { recursive: true });
  for (const f of ["netvo-logo.svg", "netvo-mark.svg", "netvo-favicon.svg"]) {
    if (fs.existsSync(`marka/${f}`)) fs.copyFileSync(`marka/${f}`, `${OUT}/marka/${f}`);
  }
}

const say = p => { try { return fs.readdirSync(p).length; } catch { return 0; } };
console.log(`✓ public/ hazır`);
console.log(`  kök öğe        : ${say(OUT)}`);
console.log(`  pazaryeri (TR) : ${say(OUT + "/pazaryeri")}`);
console.log(`  uygula/        : ${fs.existsSync(OUT + "/uygula/index.html") ? "var" : "YOK"}`);
console.log(`  widget/        : ${say(OUT + "/widget")}`);
console.log(`Cloudflare Pages → Build command: node build.mjs · Output dir: public`);
