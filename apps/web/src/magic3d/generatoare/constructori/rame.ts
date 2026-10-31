import { buildRama, configureManifold, UNGHI_MIN, type TipRama } from "@/magic3d/apps/rame/rame";
import { t } from "@/magic3d/core/i18n/index";
import { infigereMax } from "@/magic3d/generatoare/defs/rame";
import { num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/*
 * Rame Tematice: baza, rama si placuta cu nume (plus aura, cand are latime), ASAMBLATE ca in vechea
 * previzualizare. Piesele nu se suprapun: piciorul ramei intra in locas cu joc, numele sta in gravura
 * cu joc, deci fiecare se exporta curat si poate fi asezat separat pentru print.
 *
 * DE CE O ROTATIE AICI. apps/rame/rame.ts construieste ansamblul IN PICIOARE pe axa Y (talpa la y = 0,
 * "sus" = y negativ, adancimea pe Z), fiindca vechiul viewport avea Y in sus. Conversia spre scena
 * presupune Z in sus. rotate([-90, 0, 0]) duce (x, y, z) in (x, z, -y): o rotatie pura, fara
 * oglindire, dupa care scena primeste exact (x, -y, z) — imaginea vechii previzualizari, cu talpa
 * pe placa. Fara ea ansamblul ar sta culcat pe spate, cu baza strapungand placa.
 */

/** Placa de print nu e cunoscuta in worker: aceeasi valoare de rezerva ca in main.ts vechi. */
const PLACA = { w: 256, d: 256 };

export const rame: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const text = str(p, "text").trim() || " ";
  const tip = str(p, "tip") as TipRama;
  const r = buildRama({
    text,
    font: fonturi.font,
    rama: { tip, raza: num(p, "raza"), grosimeFir: num(p, "grosimeFir"), colturi: num(p, "colturi"), inele: num(p, "inele"), lasare: num(p, "lasare") },
    grosimeRama: num(p, "grosimeRama"),
    inaltimeText: num(p, "inaltimeText"),
    grosimeText: num(p, "grosimeText"),
    latimeAura: num(p, "latimeAura"),
    netezireAura: num(p, "netezireAura"),
    adancimeGravura: num(p, "adancimeGravura"),
    jocGravura: num(p, "jocGravura"),
    lungimeBaza: num(p, "lungimeBaza"),
    latimeBaza: num(p, "latimeBaza"),
    inaltimeBaza: num(p, "inaltimeBaza"),
    // ca onControl-ul vechi: infigerea nu poate depasi baza
    adancimeInfigere: Math.min(num(p, "adancimeInfigere"), infigereMax(p)),
    jocInfigere: num(p, "jocInfigere"),
    latimePicior: num(p, "latimePicior"),
    inaltimePicior: num(p, "inaltimePicior"),
    placa: PLACA,
  });
  const d = r.diagnostice;

  // Avertizarile din bara de stare veche (doar cele marcate warn).
  const avertizari: string[] = [];
  if (d.bucatiRama > 1) avertizari.push(t("rame.statusRamaBucati", { n: d.bucatiRama }));
  if (d.bucatiText > 1) avertizari.push(t("rame.statusTextBucati", { n: d.bucatiText }));
  if (d.ariaFirSubtireMM2 > 1) avertizari.push(t("rame.statusFirSubtire", { arie: d.ariaFirSubtireMM2, fir: num(p, "grosimeFir") }));
  if (d.reperProcent < 25) avertizari.push(t("rame.statusReperSlab", { pr: d.reperProcent }));
  if (d.stabilitate.unghiMinGrade < UNGHI_MIN) {
    avertizari.push(t("rame.statusInstabil", { unghi: d.stabilitate.unghiMinGrade.toFixed(0), min: UNGHI_MIN }));
  }
  if (d.glifeLipsa.length) avertizari.push(t("rame.statusGlifaLipsa", { litere: d.glifeLipsa.join(" ") }));
  if (!d.incapePePlaca) avertizari.push(t("rame.statusPlaca"));

  const inPicioare = (m: unknown) => (m ? (m as { rotate(v: number[]): unknown }).rotate([-90, 0, 0]) : null);
  return {
    piese: piese(
      { nume: t("rame.numeBaza"), culoare: str(p, "culoareBaza"), manifold: inPicioare(r.baza) },
      { nume: t(`rame.tip_${tip}`), culoare: str(p, "culoareRama"), manifold: inPicioare(r.rama) },
      { nume: t("rame.numeText", { text }), culoare: str(p, "culoareText"), manifold: inPicioare(r.text) },
      r.aura ? { nume: t("rame.numeAura"), culoare: str(p, "culoareAura"), manifold: inPicioare(r.aura) } : null,
    ),
    avertizari,
  };
};
