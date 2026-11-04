/**
 * Uygulama simgesi, Android uyarlanabilir simge katmanları, açılış ekranı ve favicon'u tek bir
 * vektör tasarımdan üretir. Tasarımı değiştirmek için yalnızca aşağıdaki geometriyi/renkleri düzenleyip
 * yeniden çalıştırın:
 *
 *   node scripts/render-brand.mjs            (apps/mobile içinden)
 *
 * SVG → PNG dönüşümü için @resvg/resvg-js gerekir. Projeye bağımlılık eklememek için ayrı bir klasöre
 * kurulur (varsayılan D:/Dev/tools/icon-render; RESVG_DIR ile değiştirilebilir):
 *
 *   npm install --prefix D:/Dev/tools/icon-render @resvg/resvg-js@2.6.2
 *
 * Kaynak SVG'ler de assets/brand/ altına yazılır (tasarımcıya verilebilir, başka araçlarda açılabilir).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(process.env.RESVG_DIR ?? 'D:/Dev/tools/icon-render', 'package.json'));
const { Resvg } = require('@resvg/resvg-js');

// --- Marka (src/theme/tokens.ts ile uyumlu) ---
const BRAND = {
  from: '#FF8A3D', // degrade başı (sol üst)
  to: '#EC3F2A', // degrade sonu (sağ alt)
  mark: '#FFFFFF',
  sun: '#FFD84A',
  sunEdge: '#FFB000',
};

/**
 * "?" işareti: 1024 birimlik kutuda, merkezi (512, 512). Kanca kalın, uçları yuvarlak bir çizgi;
 * nokta, "gün"ü anlatan bir güneş.
 * scale/dx/dy ile farklı güvenli alanlara yerleştirilir.
 */
function mark({ scale = 1, color = BRAND.mark, sun = true, rays = true, shadow = true } = {}) {
  // İçerik (kanca üstü 203 → ışın altı 948) kutunun ortasına gelsin diye 63 birim yukarı.
  const t = `translate(512 512) scale(${scale}) translate(-512 -575)`;
  const hook = 'M 372 404 A 142 142 0 1 1 588 525 C 536 556 512 580 512 628';
  const [sx, sy, sr] = [512, 836, 66];
  const sunFill = sun ? `url(#sun)` : color;
  const rayLines = [];
  if (sun && rays) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      const [r1, r2] = [88, 110];
      rayLines.push(
        `<line x1="${sx + r1 * Math.cos(a)}" y1="${sy + r1 * Math.sin(a)}" x2="${sx + r2 * Math.cos(a)}" y2="${sy + r2 * Math.sin(a)}" />`,
      );
    }
  }
  return `
  <g transform="${t}"${shadow ? ' filter="url(#shadow)"' : ''}>
    <path d="${hook}" fill="none" stroke="${color}" stroke-width="118" stroke-linecap="round" stroke-linejoin="round"/>
    ${rayLines.length ? `<g stroke="${BRAND.sun}" stroke-width="20" stroke-linecap="round">${rayLines.join('')}</g>` : ''}
    <circle cx="${sx}" cy="${sy}" r="${sr}" fill="${sunFill}"/>
  </g>`;
}

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND.from}"/>
      <stop offset="1" stop-color="${BRAND.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sun" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#FFF3B0"/>
      <stop offset="0.55" stop-color="${BRAND.sun}"/>
      <stop offset="1" stop-color="${BRAND.sunEdge}"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#8A1E0A" flood-opacity="0.28"/>
    </filter>
  </defs>`;

const svg = (body, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${defs}${body}</svg>`;

const background = `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;

// Simge: tam kare, saydamlık yok (iOS köşeleri kendisi yuvarlar). İşaret yüksekliği kutunun ~%68'i.
const ICON = svg(`${background}${mark({ scale: 0.92 })}`);

// Android uyarlanabilir simge: ön plan saydam; içerik 108dp'nin ortadaki 66dp'lik güvenli dairesinde kalmalı (%61).
// İşaret yüksekliği 745 birim × 0.72 ≈ %52; güneş ışınları dahil güvenli dairenin içinde.
const ADAPTIVE_FG = svg(mark({ scale: 0.72, shadow: false }));
const ADAPTIVE_BG = svg(background);
// Tek renkli (Android 13 temalı simgeler): yalnızca şekil, renk sistemden gelir.
const ADAPTIVE_MONO = svg(mark({ scale: 0.72, color: '#FFFFFF', sun: false, shadow: false }));

// Açılış ekranı: saydam zeminde yuvarlak rozet (Android 12+ simgeyi daireye kırpar; daire güvenli).
const SPLASH = svg(`
  <circle cx="512" cy="512" r="500" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="500" fill="url(#glow)"/>
  ${mark({ scale: 0.62 })}`);

// Favicon (web): simgenin yuvarlatılmış hâli, ışınsız (küçükte kalabalık olmasın).
const FAVICON = svg(`
  <rect width="1024" height="1024" rx="230" fill="url(#bg)"/>
  ${mark({ scale: 0.9, rays: false, shadow: false })}`);

function render(source, out, width) {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng();
  writeFileSync(join(root, out), png);
  console.log(`${out} (${width}px)`);
}

const brandDir = join(root, 'assets/brand');
mkdirSync(brandDir, { recursive: true });
const sources = { icon: ICON, 'adaptive-foreground': ADAPTIVE_FG, 'adaptive-background': ADAPTIVE_BG, 'adaptive-monochrome': ADAPTIVE_MONO, splash: SPLASH, favicon: FAVICON };
for (const [name, s] of Object.entries(sources)) writeFileSync(join(brandDir, `${name}.svg`), s);

render(ICON, 'assets/images/icon.png', 1024);
render(ADAPTIVE_FG, 'assets/images/android-icon-foreground.png', 1024);
render(ADAPTIVE_BG, 'assets/images/android-icon-background.png', 1024);
render(ADAPTIVE_MONO, 'assets/images/android-icon-monochrome.png', 1024);
render(SPLASH, 'assets/images/splash-icon.png', 1024);
render(FAVICON, 'assets/images/favicon.png', 48);
