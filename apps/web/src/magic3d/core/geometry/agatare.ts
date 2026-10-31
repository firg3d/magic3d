/**
 * NUCLEU — AGĂȚAREA PE PERETE: contururile sistemelor și căutarea poziției.
 *
 * A fost scris pentru Litere Fagure (o placă în care se sapă locașul) și se folosește acum și la
 * Cutii Litere (o cutie în al cărei fund se sapă). Al doilea consumator = trece în nucleu, ca
 * textSolid, fonts și detectorul de trăsături înaintea lui.
 *
 * Toate sistemele sunt tratate LA FEL: un contur 2D, așezat cât mai sus pe verticala prin
 * CENTRUL DE MASĂ, cu un plasture de material în jur. Ce face aplicația cu poziția găsită —
 * unde sapă, cât de adânc, cum îngroașă local — rămâne al ei: la o placă plasturele stă în
 * planul piesei, la o cutie stă pe INTERIOR, sub vegetație.
 *
 * De ce centrul de masă și nu mijlocul dreptunghiului: piesa atârnă drept doar dacă punctul de
 * sprijin e pe verticala centrului de masă. La „A" sau „O" cele două coincid și nu se vede
 * diferența; la „J", „L", „F" nu coincid, iar litera agățată pe mijlocul dreptunghiului stă
 * strâmb pe perete.
 *
 * Convenția de axe, ca peste tot unde se lucrează cu siluete din fonturi: y crește în JOS.
 * Deci „mai sus" înseamnă y mai mic — sensul e ușor de greșit și schimbă rezultatul fizic.
 */
import { poligon, laturiCerc, type Pt, type Ring } from './forme2d.js';

/** cum se agață piesa pe perete */
export type TipAgatare = 'fara' | 'gaura' | 'cheie' | 'grila';

/**
 * Peretele minim de material în jurul sistemului de agățare (mm) — regulă de produs.
 *
 * CALIBRAT ÎN JOS, după ce testul a numărat: la 2 mm, locașul de cheie cerea un plasture plin
 * de 16×18 mm, iar 28 din 36 de caractere nu-l puteau primi nicăieri — trăsătura unei litere de
 * 120 mm are 15-20 mm. La 1.5 mm inelul rămâne solid (are toată grosimea piesei în spate) și
 * locașul încape pe majoritatea literelor.
 */
export const PERETE_GAURA = 1.5;

/**
 * Jocul dintre capul șurubului și locașul lui, și dintre capac și locaș (mm).
 * Un capac turnat exact pe cotă nu intră: la FDM peretele iese cu o zecime în plus.
 */
export const JOC_CAPAC = 0.3;

/**
 * Cât rămâne șurubul (sau cuiul) afară din perete, măsurat de la fața peretelui la fața de jos
 * a capului (mm). Pe atâta trece TIJA, nu capul.
 *
 * E cota din care iese CANALUL ÎN T, și fără ea sistemul de agățare nu funcționează deloc:
 * un locaș săpat dintr-un singur contur are lățimea tijei la orice adâncime, deci capul intră
 * în cercul mare și nu mai poate gliza nicăieri. Piesa se pune pe șurub și cade înapoi.
 *
 * Locașul corect are două niveluri:
 *   z ∈ [0, STANDOFF_TIJA]  lângă perete: doar fanta tijei. Materialul de aici e BUZA care
 *                           reține capul.
 *   z ∈ [STANDOFF_TIJA, …]  mai adânc: camera în care CĂLĂTOREȘTE capul, lată cât el.
 */
export const STANDOFF_TIJA = 2;

/** un cerc, ca și contur de agățare (gaura străpunsă sau locașul capului) */
export const conturCerc = (raza: number): Ring[] => [poligon(0, 0, raza, laturiCerc(raza))];

/**
 * GAURA DE CHEIE — cercul mare pe unde intră CAPUL șurubului, jos, și fanta îngustă în care
 * alunecă TIJA, în sus.
 *
 * Sensul contează și e ușor de greșit: piesa se lasă în jos peste șurubul fix, deci față de
 * piesă șurubul urcă. Fanta trebuie să fie DEASUPRA cercului mare — invers, piesa ar cădea
 * de pe șurub în loc să se agațe.
 *
 * Trei contururi care se suprapun, nu o operație booleană: regula „Positive" le unește singură.
 */
export function conturCheie(rCap: number, rTija: number, cursa: number): Ring[] {
  return [
    poligon(0, 0, rCap, laturiCerc(rCap)),
    // y-ul modelului crește în JOS, deci fanta urcă spre y negativ
    [[-rTija, -cursa], [rTija, -cursa], [rTija, 0], [-rTija, 0]],
    poligon(0, -cursa, rTija, laturiCerc(rTija)),
  ];
}

/**
 * AGĂȚĂTOARE CU DINȚI — un canal orizontal a cărui muchie de sus are șei, ca la agățătoarea
 * de tablou. Cuiul intră în canal și se așază într-o șa; alegerea șeii dă reglajul pe orizontală,
 * deci piesa se poate îndrepta pe perete fără să se mute cuiul.
 *
 * Care e șaua și care e dintele NU e o alegere estetică: piesa se lasă până când muchia de sus
 * se sprijină pe cui, și se oprește acolo unde muchia urcă cel mai adânc în material. Deci șeile
 * sunt crestăturile care URCĂ, iar dinții coboară între ele.
 */
export function conturGrila(latime: number, inaltime: number, adancDinte: number, pasDinte: number): Ring[] {
  const n = Math.max(3, Math.round(latime / pasDinte));
  const pas = latime / n, x0 = -latime / 2;
  const ring: Ring = [];
  // muchia de SUS, de la stânga la dreapta: șa, dinte, șa, dinte… (y mai mic = mai sus)
  for (let i = 0; i <= n; i++) {
    ring.push([x0 + i * pas, -inaltime]);
    if (i < n) ring.push([x0 + (i + 0.5) * pas, -inaltime + adancDinte]);
  }
  // muchia de jos, înapoi spre stânga
  ring.push([latime / 2, 0], [-latime / 2, 0]);
  return [ring];
}

/**
 * Cel mai de sus loc în care încape conturul dat, cât mai aproape de verticala prin `axaX`.
 *
 * Se coboară din vârful siluetei, întâi din 3 în 3 mm și apoi înapoi din 0.5 în 0.5, în loc să
 * se erodeze silueta: eroziunea merge doar pentru un disc, iar gaura de cheie și agățătoarea cu
 * dinți nu sunt discuri. Verificarea e exactă — conturul dilatat cu peretele trebuie să încapă
 * ÎNTREG în siluetă.
 *
 * DOUĂ CONSTRÂNGERI, amândouă găsite de verificarea în aplicație, nu presupuse:
 *
 * 1. Punctul de sprijin trebuie să fie DEASUPRA centrului de masă. Fără condiția asta, la „L"
 *    și „J" sistemul cobora în talpa literei — geometric valid, fizic pe dos: agățată sub
 *    centrul de masă, piesa s-ar întoarce cu susul în jos pe perete.
 * 2. Verticala centrului de masă nu e întotdeauna liberă: la „B" trece prin golul buclei, iar
 *    la „L" iese cu câțiva zecimi de milimetru din bara verticală. De aceea se încearcă și
 *    poziții laterale, în ordinea depărtării de axă, iar abaterea rămasă se RAPORTEAZĂ ca
 *    înclinare — omul vede cu câte grade va sta piesa strâmb, în loc să afle pe perete.
 */
export function pozitieAgatare(CrossSection: any, sil: any, forma: Ring[], axaX: number, cmY: number,
  preferaDoua = false): Pt[] {
  const cs = new CrossSection(forma, 'Positive');
  const nevoie = cs.offset(PERETE_GAURA, 'Round');
  cs.delete();
  const b = sil.bounds(), nb = nevoie.bounds();
  const incape = (x: number, y: number) => {
    const test = nevoie.translate([x, y]);
    const afara = test.subtract(sil);
    const ok = afara.area() <= 1e-6;
    afara.delete(); test.delete();
    return ok;
  };
  const sus = b.min[1] - nb.min[1];
  // y-ul modelului crește în JOS, deci „deasupra centrului de masă" înseamnă y mai mic.
  // Cei 5 mm de margine țin pârghia rezonabilă.
  const jos = Math.min(b.max[1] - nb.max[1], cmY - 5);
  /**
   * Înclinarea maximă acceptată. E o condiție a CĂUTĂRII, nu doar o valoare raportată: fără ea
   * se găseau poziții la 90° — adică lateral față de centrul de masă și abia deasupra lui,
   * unde piesa n-ar atârna, s-ar culca.
   */
  const tgMax = Math.tan((10 * Math.PI) / 180);
  const cauta = (x: number): number | null => {
    for (let y = sus; y <= jos + 1e-9; y += 3) {
      if (Math.abs(x - axaX) > (cmY - y) * tgMax) continue;
      if (!incape(x, y)) continue;
      // rafinare în sus: pasul grosier a sărit peste pozițiile mai bune de deasupra
      for (let yy = y - 2.5; yy < y; yy += 0.5) if (yy >= sus && incape(x, yy)) return yy;
      return y;
    }
    return null;
  };
  const maxLateral = (b.max[0] - b.min[0]) * 0.45;
  const unPunct = (): Pt[] => {
    for (let dx = 0; dx <= maxLateral + 1e-9; dx += 2) {
      for (const x of dx === 0 ? [axaX] : [axaX - dx, axaX + dx]) {
        const y = cauta(x);
        if (y !== null) return [[x, y]];
      }
    }
    return [];
  };

  // ---- DOUĂ PUNCTE, simetrice față de centrul de masă ----
  // „H", „M", „N", „U", „V", „Y" n-au material pe verticala centrului de masă nicăieri sus:
  // acolo e chiar golul dintre picioare. Dintr-un singur punct nu se pot agăța drept, oricât
  // s-ar căuta — dar din DOUĂ, așezate simetric, piesa atârnă drept prin construcție, fiindcă
  // dreapta care le unește e orizontală. Asta face și agățătoarea lată de tablou.
  //
  // `preferaDoua` cere să se încerce ÎNTÂI perechea. La o literă singură un punct e destul —
  // e mai înaltă decât lată, deci se comportă ca un pendul scurt. La o piesă LATĂ (un nume de
  // 200-500 mm) un singur șurub o lasă să se răsucească la fiecare atingere; două o țin drept
  // prin construcție. Cine cheamă știe forma piesei; nucleul doar oferă alegerea.
  const douaPuncte = (): Pt[] => {
    const minDepartare = Math.max(6, (b.max[0] - b.min[0]) * 0.1);
    for (let y = sus; y <= jos + 1e-9; y += 3) {
      // Ordinea diferă după cine cere. Fallback-ul (o literă la care un punct n-a mers) ia
      // perechea cea mai APROPIATĂ, adică cea mai adâncă în material — comportamentul de la
      // Litere Fagure, Cutii și LED, nemișcat. Cererea explicită ia perechea cea mai DEPĂRTATĂ:
      // la o piesă lată, distanța dintre șuruburi e chiar ce o ține dreaptă.
      const de = preferaDoua ? Math.floor(maxLateral / 2) * 2 : minDepartare;
      const pana = preferaDoua ? minDepartare : maxLateral;
      const pas = preferaDoua ? -2 : 2;
      for (let dx = de; pas > 0 ? dx <= pana + 1e-9 : dx >= pana - 1e-9; dx += pas) {
        if (incape(axaX - dx, y) && incape(axaX + dx, y)) return [[axaX - dx, y], [axaX + dx, y]];
      }
    }
    return [];
  };

  let rezultat: Pt[];
  if (preferaDoua) { rezultat = douaPuncte(); if (!rezultat.length) rezultat = unPunct(); }
  else { rezultat = unPunct(); if (!rezultat.length) rezultat = douaPuncte(); }
  nevoie.delete();
  return rezultat;
}

/**
 * Cu câte grade va sta piesa strâmb pe perete.
 *
 * Piesa atârnată se rotește până centrul de masă ajunge sub punctul de sprijin, deci unghiul e
 * atan(abatere / distanța pe verticală). Cu DOUĂ puncte simetrice, dreapta care le unește e
 * orizontală și piesa atârnă drept prin construcție — de aceea acolo rezultatul e zero.
 */
export function inclinareAgatare(pozitii: Pt[], cm: Pt): number {
  if (pozitii.length !== 1) return 0;
  return +((Math.atan2(pozitii[0][0] - cm[0], Math.max(cm[1] - pozitii[0][1], 1e-6)) * 180) / Math.PI).toFixed(1);
}
