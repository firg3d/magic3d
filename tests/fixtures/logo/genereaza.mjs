// Imaginile de test ale generatorului "Din poză sau logo", desenate din SVG cu sharp:
//   node tests/fixtures/logo/genereaza.mjs
// Le folosesc testele (tests/unit/magic3dLogo.test.ts) si incercarea in browser.
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aici = dirname(fileURLToPath(import.meta.url));

const imagini = {
  // Logo simplu: un cerc plin si un patrat, negru pe alb.
  "logo-simplu.png": `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#fff"/><circle cx="120" cy="150" r="80" fill="#111"/><rect x="230" y="70" width="140" height="160" rx="20" fill="#111"/></svg>`,
  // Logo cu goluri de tip "o" si "a": un inel si un "a" desenat (bucla cu gol si piciorul).
  "logo-goluri.png": `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260"><rect width="420" height="260" fill="#fff"/><circle cx="110" cy="130" r="90" fill="#000"/><circle cx="110" cy="130" r="45" fill="#fff"/><circle cx="290" cy="160" r="60" fill="#000"/><circle cx="290" cy="160" r="28" fill="#fff"/><rect x="335" y="60" width="30" height="160" fill="#000"/></svg>`,
  // Logo in trei culori pe fundal alb.
  "logo-culori.png": `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300"><rect width="420" height="300" fill="#ffffff"/><rect x="30" y="40" width="160" height="220" rx="16" fill="#1f8a5b"/><circle cx="300" cy="110" r="80" fill="#e0453a"/><rect x="220" y="210" width="170" height="50" fill="#2b4fd6"/></svg>`,
  // "Poza": degrade, forme moi si zgomot, ca o fotografie.
  "poza.png": `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><defs><radialGradient id="g" cx="40%" cy="45%" r="60%"><stop offset="0" stop-color="#3a3a3a"/><stop offset="0.6" stop-color="#9a9a9a"/><stop offset="1" stop-color="#e8e8e8"/></radialGradient><filter id="z"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="over"/></filter></defs><rect width="480" height="360" fill="url(#g)" filter="url(#z)"/><ellipse cx="200" cy="170" rx="90" ry="110" fill="#222" opacity="0.85"/></svg>`,
};

for (const [nume, svg] of Object.entries(imagini)) {
  await sharp(Buffer.from(svg)).png().toFile(join(aici, nume));
  console.log(nume);
}
