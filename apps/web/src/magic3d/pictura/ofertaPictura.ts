/*
 * Legatura modului Pictura cu atelierul: ce filamente cere modelul (din paleta atelierului) si ce
 * culori nu sunt pe stoc, cu cel mai apropiat filament disponibil.
 */
import { t } from "@/magic3d/core/i18n/index";
import { PALETA_ATELIER, filamentAtelier, type Filament } from "@/magic3d/pictura/paleta";
import { distanta } from "@/magic3d/pictura/reducere";

export type CuloareFaraStoc = { slot: number; culoare: string; propunere: Filament };

/** Sloturile folosite a caror culoare nu e un filament disponibil, cu propunerea cea mai apropiata (OKLab). */
export function culoriFaraStoc(sloturi: readonly string[], ponderi: readonly number[]): CuloareFaraStoc[] {
  const disponibile = PALETA_ATELIER.filamente.filter((f) => f.disponibil);
  if (!disponibile.length) return [];
  return sloturi.flatMap((hex, slot) => {
    if (!ponderi[slot]) return [];
    const f = filamentAtelier(hex);
    if (f?.disponibil) return [];
    const propunere = disponibile.reduce((best, x) => (distanta(hex.toLowerCase(), x.hex.toLowerCase()) < distanta(hex.toLowerCase(), best.hex.toLowerCase()) ? x : best), disponibile[0]);
    return [{ slot, culoare: hex, propunere }];
  });
}

/**
 * Randul de detalii din mesajul de oferta: cate culori, filamentele in ordinea sloturilor (nume si
 * material din paleta atelierului), schimbarile estimate si culorile care nu sunt pe stoc.
 */
export function detaliiOferta(sloturi: readonly string[], ponderi: readonly number[], schimbari: number): string {
  const folosite = sloturi.map((hex, slot) => ({ hex, slot })).filter((x) => ponderi[x.slot] > 0);
  const filamente = folosite.map(({ hex, slot }) => {
    const f = filamentAtelier(hex);
    return f ? `${slot + 1} ${f.nume} (${f.material})` : `${slot + 1} ${hex.toUpperCase()} (${t("pictura.culoareProprieOferta")})`;
  });
  const parti = [
    t("pictura.ofertaCulori", { n: folosite.length }),
    `${t("pictura.ofertaFilamente")}: ${filamente.join(", ")}`,
    t("pictura.ofertaSchimbari", { n: schimbari }),
  ];
  const lipsa = culoriFaraStoc(sloturi, ponderi);
  if (lipsa.length) parti.push(`${t("pictura.ofertaFaraStoc")}: ${lipsa.map((x) => `${x.slot + 1} → ${x.propunere.nume}`).join(", ")}`);
  return parti.join("; ");
}
