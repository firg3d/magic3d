/**
 * CATALOGUL DE MODELE al generatorului de huse.
 *
 * Cele 26 de fișiere JSON intră în bundle prin `import.meta.glob` — sunt mici (câțiva KB
 * împreună) și se schimbă doar când operatorul transcrie cote noi, deci n-au ce căuta într-o
 * cerere de rețea care poate eșua exact când omul deschide aplicația.
 *
 * ÎN LISTĂ AJUNG DOAR MODELELE COMPLETE (DECIZIE, B.2). Un model cu o cotă `null` nu se poate
 * construi, iar un model care apare în listă și cade la construcție e mai rău decât unul care
 * lipsește: omul nu află de ce. Verdictul „complet" vine din `core/telefoane/complet.ts`, aceeași
 * listă pe care o folosește și verificarea de date din CI.
 *
 * Modelul FICTIV de dezvoltare NU e aici: stă în `date/telefoane/_test/`, iar globul citește doar
 * `apple/`.
 */
import { esteComplet } from '../../core/telefoane/complet.js';
import type { Telefon } from './husa.js';

const fisiere = import.meta.glob('../../../date/telefoane/apple/*.json', {
  eager: true, import: 'default',
}) as Record<string, Telefon>;

const toate: Telefon[] = Object.values(fisiere);

/**
 * Ordinea din listă: după an, apoi după nume.
 *
 * Alfabetic ar pune „iPhone 12" între „iPhone 17" și „iPhone Air", fiindcă „1" < „7" ca text.
 * Omul își caută telefonul după cât de nou e, nu după ordinea din dicționar.
 */
export function modeleDisponibile(): Telefon[] {
  return toate.filter((t) => esteComplet(t as never))
    .sort((a, b) => ((b as never as { an: number }).an - (a as never as { an: number }).an)
      || a.model.localeCompare(b.model, 'ro'));
}

export function modelDupaId(id: string): Telefon | null {
  return modeleDisponibile().find((t) => t.id === id) ?? null;
}
