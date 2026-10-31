/**
 * NUCLEU — PANOUL, BARA DE STARE ȘI FIȘA unei piese dintr-un cuvânt.
 *
 * Perechea lui `core/geometry/cuvant.ts`: acolo stă geometria comună, aici ce se ARATĂ despre
 * ea. Nume 3D și Cuvinte Decor au aceleași punți, același contur, aceeași stabilitate și
 * aceeași agățare — deci și aceleași controale, aceleași cifre în bara de stare și aceleași
 * rânduri în fișa de producție. Diferă doar prima grupă din panou: la nume, textul și fontul;
 * la cuvinte, textul, fontul și simbolurile.
 *
 * Ce NU intră aici: șiruri scrise în cod. Tot textul trece prin dicționar, sub `piesa.*` —
 * aceleași chei pentru amândouă aplicațiile, fiindcă e chiar același lucru spus despre același
 * lucru. Ce rămâne al aplicației e ce e propriu ei: numele obiectului, verdictul de font,
 * caracterele fără sursă.
 */
import { t as tr } from '../i18n/index.js';
import type { PanelControl, PanelGroup, StatusItem, ExportBody } from '../app.js';
import {
  TIPURI_CONTUR, CONTUR_MIN, CONTUR_MAX, PAS_CONTUR, PUNTE_MIN, PUNTE_MAX, RAZA_PUNTE,
  INALTIME_MIN, MATERIAL_PESTE_LOCAS, UNGHI_MIN, grosimeMinimaLocas, pentruPrint,
  type DiagnosticCuvant, type RezultatCuvant, type TipContur, type ModProdus, type TipAgatare,
} from '../geometry/cuvant.js';

/** starea de care depind panourile comune — aplicația o ține, nucleul o citește */
export interface StarePiesa {
  inaltimeLitera: number;
  grosime: number;
  punti: boolean;
  latimePunte: number;
  contur: TipContur;
  latimeContur: number;
  netezireContur: number;
  grosimeContur: number;
  modProdus: ModProdus;
  tipAgatare: TipAgatare;
  surubCap: number;
  surubTija: number;
  inaltimeCapSurub: number;
  latimeGrila: number;
  capac: boolean;
  grosimeCapac: number;
  culoare: string;
  culoareContur: string;
  culoareCapac: string;
}

const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });
const numeTip = (tip: TipAgatare) => tr('piesa.agatare' + tip[0].toUpperCase() + tip.slice(1));

/** grupele de panou comune: punțile, conturul colorat, unde stă piesa */
export function grupuriPiesa(st: StarePiesa, d: DiagnosticCuvant | null): PanelGroup[] {
  return [
    { title: tr('piesa.grupPunti'), controls: [
      { kind: 'checkbox', key: 'punti', label: tr('piesa.punti'), value: st.punti },
      ...(st.punti ? [
        { kind: 'number' as const, key: 'latimePunte', label: tr('piesa.latimePunte'), min: PUNTE_MIN, max: PUNTE_MAX, step: 0.1, value: st.latimePunte },
        // câte punți s-au pus și cât de lungă e cea mai lungă NU sunt parametri, sunt rezultate:
        // ele spun dacă legătura se vede sau nu
        { kind: 'note' as const, key: 'notaPunti', label: tr('piesa.notaPuntiEticheta'),
          value: d ? tr(d.punti.punti.length ? 'piesa.notaPuntiCalcul' : 'piesa.notaPuntiNiciuna',
            { n: d.punti.punti.length, lung: d.punti.lungimeMaxMM.toFixed(1),
              max: (RAZA_PUNTE * st.inaltimeLitera).toFixed(0) }) : '' },
      ] : []),
    ] },
    { title: tr('piesa.grupContur'), controls: [
      { kind: 'select', key: 'contur', label: tr('piesa.contur'), value: st.contur,
        options: TIPURI_CONTUR.map((c) => ({ value: c, label: tr('piesa.contur_' + c) })) },
      ...(st.contur !== 'fara' ? [
        { kind: 'number' as const, key: 'latimeContur', label: tr('piesa.latimeContur'), min: CONTUR_MIN, max: CONTUR_MAX, step: PAS_CONTUR, value: st.latimeContur },
        { kind: 'number' as const, key: 'netezireContur', label: tr('piesa.netezireContur'), min: 0, max: CONTUR_MAX, step: PAS_CONTUR, value: st.netezireContur },
        ...(st.contur === 'placa' ? [
          { kind: 'number' as const, key: 'grosimeContur', label: tr('piesa.grosimeContur'), min: 2, max: 20, step: 0.5, value: st.grosimeContur },
        ] : []),
        { kind: 'color' as const, key: 'culoareContur', label: tr('piesa.culoareContur'), value: st.culoareContur },
      ] : []),
    ] },
    { title: tr('piesa.grupUnde'), controls: [
      { kind: 'select', key: 'modProdus', label: tr('piesa.modProdus'), value: st.modProdus, options: [
        { value: 'masa', label: tr('piesa.modMasa') },
        { value: 'perete', label: tr('piesa.modPerete') },
      ] },
      // grupul de agățare apare doar în modul perete: pe masă ar fi un panou mort
      ...(st.modProdus === 'perete' ? controaleAgatare(st, d) : []),
    ] },
  ];
}

function controaleAgatare(st: StarePiesa, d: DiagnosticCuvant | null): PanelControl[] {
  return [
    { kind: 'select', key: 'tipAgatare', label: tr('piesa.tipAgatare'), value: st.tipAgatare, options: [
      { value: 'cheie', label: tr('piesa.agatareCheie') },
      { value: 'grila', label: tr('piesa.agatareGrila') },
      { value: 'gaura', label: tr('piesa.agatareGaura') },
      { value: 'fara', label: tr('piesa.agatareFara') },
    ] },
    ...(st.tipAgatare === 'cheie' || st.tipAgatare === 'gaura' ? [
      { kind: 'number' as const, key: 'surubTija', label: tr('piesa.surubTija'), min: 2, max: 8, step: 0.5, value: st.surubTija },
      { kind: 'number' as const, key: 'surubCap', label: tr('piesa.surubCap'), min: 5, max: 16, step: 0.5, value: st.surubCap },
      { kind: 'number' as const, key: 'inaltimeCapSurub', label: tr('piesa.inaltimeCapSurub'), min: 1.5, max: 8, step: 0.5, value: st.inaltimeCapSurub },
    ] : []),
    ...(st.tipAgatare === 'grila' ? [
      { kind: 'number' as const, key: 'latimeGrila', label: tr('piesa.latimeGrila'), min: 12, max: 120, step: 2, value: st.latimeGrila },
      { kind: 'number' as const, key: 'inaltimeCapSurub', label: tr('piesa.inaltimeCapSurub'), min: 1.5, max: 8, step: 0.5, value: st.inaltimeCapSurub },
    ] : []),
    ...(st.tipAgatare === 'gaura' ? [
      { kind: 'checkbox' as const, key: 'capac', label: tr('piesa.capac'), value: st.capac },
      ...(st.capac ? [
        { kind: 'number' as const, key: 'grosimeCapac', label: tr('piesa.grosimeCapac'), min: 0.8, max: 6, step: 0.2, value: st.grosimeCapac },
        { kind: 'color' as const, key: 'culoareCapac', label: tr('piesa.culoareCapac'), value: st.culoareCapac },
      ] : []),
    ] : []),
    ...(st.tipAgatare !== 'fara' ? [
      // ADÂNCIMEA nu e parametru: în locaș intră tija pe standoff plus capul pe înălțimea lui.
      // Se ARATĂ ca rezultat, ca omul să vadă cât se sapă din materialul disponibil.
      { kind: 'note' as const, key: 'notaAdanc', label: tr('piesa.adancimeLocas'),
        value: d ? tr('piesa.adancimeLocasCalcul', { adanc: d.agatare.adancime.toFixed(1),
          material: d.agatare.materialMM.toFixed(1), peste: MATERIAL_PESTE_LOCAS }) : '' },
    ] : []),
  ];
}

/**
 * MODUL MUTĂ IMPLICITELE ODATĂ. O piesă de perete fără sistem de agățare e una pe care n-ai cum
 * s-o pui pe perete; una de masă cu locaș în spate e o gaură fără rost.
 *
 * Ridicarea plăcii NU e garanția de corectitudine — aia stă în geometrie, care refuză să sape o
 * cameră mai mică decât capul șurubului. E doar politețe: implicitul să iasă bun.
 */
export function comutaModProdus(st: StarePiesa, val: ModProdus): void {
  st.modProdus = val;
  if (val === 'perete') {
    if (st.tipAgatare === 'fara') st.tipAgatare = 'cheie';
    const necesar = Math.ceil(grosimeMinimaLocas(st.inaltimeCapSurub) / PAS_CONTUR) * PAS_CONTUR;
    if (st.contur === 'placa' && st.grosimeContur < necesar) st.grosimeContur = necesar;
  } else st.tipAgatare = 'fara';
}

/** rândurile din bara de stare care privesc PIESA — dimensiuni, bucăți, contur, placă, agățare, stabilitate */
export function stariPiesa(st: StarePiesa, d: DiagnosticCuvant, placa: { w: number; d: number }): StatusItem[] {
  const status: StatusItem[] = [
    { key: 'dim', text: tr('piesa.statusDim', { w: f(d.dim[0]), h: f(d.dim[1]), g: f(d.dim[2]),
      material: f(d.materialCM3) }) },
  ];
  // O SINGURĂ COMPONENTĂ CONEXĂ — verificarea care contează cel mai mult. Se raportează pe
  // solidul final, nu pe intenție: dacă punțile n-au ajuns, piesa iese în bucăți și se SPUNE.
  if (d.bucati > 1) {
    status.push({ key: 'bucati', text: tr(st.punti ? 'piesa.statusBucatiRamase' : 'piesa.statusBucatiFaraPunti', {
      n: d.bucati, mic: f(d.ariiBucatiMM2[d.ariiBucatiMM2.length - 1], 0),
      max: f(RAZA_PUNTE * st.inaltimeLitera, 0) }), warn: true });
  } else if (d.legatDeContur) {
    status.push({ key: 'bucati', text: tr('piesa.statusLegatDeContur', { n: d.bucatiInainte }) });
  } else if (d.punti.punti.length) {
    status.push({ key: 'bucati', text: tr('piesa.statusOBucataPunti', { inainte: d.bucatiInainte,
      n: d.punti.punti.length, lung: f(d.punti.lungimeMaxMM), lat: f(st.latimePunte, 1) }) });
  } else {
    status.push({ key: 'bucati', text: tr('piesa.statusOBucata') });
  }
  // CONTURUL — aria lui și ce a astupat netezirea. Un „a" fără ochi nu mai e „a", și asta se
  // vede pe piesa printată, nu în panou.
  if (st.contur !== 'fara') {
    status.push({ key: 'contur', text: tr(st.contur === 'placa' ? 'piesa.statusConturPlaca' : 'piesa.statusConturRama', {
      lat: f(st.latimeContur), arie: f(d.ariaConturMM2, 0), gros: f(st.grosimeContur), total: f(d.dim[2]) }) });
    if (d.contraFormeInchise) {
      status.push({ key: 'ochi', text: tr('piesa.statusOchiInchisi', { n: d.contraFormeInchise,
        netezire: f(st.netezireContur) }), warn: true });
    }
  }
  // LUNGIMEA FAȚĂ DE PLACĂ — cu cifra până la care încape, verificată prin reconstrucție
  const p = d.placa;
  status.push(p.incape
    ? { key: 'placa', text: tr('piesa.statusIncape', { w: f(p.latimeMM, 0), h: f(p.adancimeMM, 0), placaW: placa.w, placaD: placa.d }) }
    : { key: 'placa', text: tr(p.inaltimeMaxMM ? 'piesa.statusPreaLung' : 'piesa.statusPreaLungDeloc', {
      w: f(p.latimeMM, 0), h: f(p.adancimeMM, 0), placaW: placa.w, placaD: placa.d,
      inaltmax: f(p.inaltimeMaxMM, 0), inaltmin: INALTIME_MIN }), warn: true });
  // AGĂȚAREA — dacă a fost cerută dar n-a încăput, se SPUNE. O piesă plecată la print fără
  // sistemul de prindere se descoperă abia cu ea în mână, în fața peretelui.
  if (st.modProdus === 'perete' && st.tipAgatare !== 'fara') {
    const a = d.agatare;
    if (!a.pozitii.length) {
      status.push({ key: 'agatare', text: tr(a.grosimeNecesaraMM ? 'piesa.statusFaraAgatareSubtire' : 'piesa.statusFaraAgatare', {
        tip: numeTip(st.tipAgatare), material: f(a.materialMM), gros: f(a.grosimeNecesaraMM),
        unde: tr(st.contur === 'placa' ? 'piesa.undePlaca' : 'piesa.undeNume') }), warn: true });
    } else {
      status.push(st.tipAgatare === 'gaura'
        ? { key: 'agatare', text: tr(a.pozitii.length > 1 ? 'piesa.statusGauraDoua' : 'piesa.statusGaura', {
          tija: f(st.surubTija), locas: f(a.adancime), cap: f(st.inaltimeCapSurub),
          capac: f(a.grosimeCapacMM), dist: f(a.distantaMM, 0), sus: f(-a.pozitii[0][1]) }) }
        : { key: 'agatare', text: tr(a.pozitii.length > 1 ? 'piesa.statusAgatareDoua' : 'piesa.statusAgatare', {
          tip: numeTip(st.tipAgatare), adanc: f(a.adancime), standoff: f(a.standoff),
          camera: f(a.adancime - a.standoff), dist: f(a.distantaMM, 0), sus: f(-a.pozitii[0][1]) }) });
      if (st.tipAgatare === 'gaura' && !a.grosimeCapacMM) {
        status.push({ key: 'capac', text: tr('piesa.statusFaraCapac'), warn: true });
      }
      status.push(Math.abs(a.inclinare) < 0.5
        ? { key: 'drept', text: tr(a.pozitii.length > 1 ? 'piesa.statusDreaptaDoua' : 'piesa.statusDreapta') }
        : { key: 'drept', text: tr('piesa.statusStramb', { unghi: f(Math.abs(a.inclinare)) }), warn: true });
      // UN SINGUR PUNCT pe o piesă lată: se poate răsuci în jurul lui. Nu e un defect — sistemul
      // funcționează — dar e o diferență pe care omul o simte pe perete, nu în panou.
      if (a.pozitii.length === 1) status.push({ key: 'unPunct', text: tr('piesa.statusUnPunct', { w: f(d.dim[0], 0) }) });
    }
  }
  // STABILITATEA — nu e informativă, BLOCHEAZĂ exportul. O piesă care cade nu se livrează, iar
  // defectul nu se vede în viewport: arată la fel și în picioare, și pe jos.
  // Pe PERETE nu se măsoară deloc: piesa atârnă, nu stă.
  const s = d.stabilitate;
  if (st.modProdus !== 'perete') {
    status.push(s.staSingura
      ? { key: 'stabil', text: tr('piesa.statusStaSingura', { unghi: f(s.unghiMinGrade, 0), arie: f(s.ariaMM2, 0), marja: f(s.marjaMM) }) }
      : { key: 'stabil', text: tr(s.marjaMM < 0 ? 'piesa.statusCade' : 'piesa.statusCadeUsor', {
        marja: f(Math.abs(s.marjaMM)), unghi: f(s.unghiMinGrade, 0), min: UNGHI_MIN,
        h: f(s.inaltimeCentruMM), remediu: textRemediu(s.remediu) }), warn: true });
  }
  return status;
}

/** rândurile de final, aceleași la orice piesă */
export function stariFinale(d: DiagnosticCuvant, ms: number): StatusItem[] {
  return [
    { key: 'triunghiuri', text: tr('piesa.statusTriunghiuri', { n: f(d.triunghiuri, 0) }) },
    { key: 'time', text: tr('piesa.statusTimp', { ms: f(ms, 0) }) },
  ];
}

function textRemediu(r: DiagnosticCuvant['stabilitate']['remediu']): string {
  return r.fel === 'contur' ? tr('piesa.remediuContur', { lat: f(r.latimeMM) })
    : r.fel === 'latime' ? tr('piesa.remediuLatime', { lat: f(r.latimeMM) })
      : tr('piesa.remediuFont', { max: f(CONTUR_MAX, 0) });
}

/**
 * CE BLOCHEAZĂ EXPORTUL, ca mesaj gata scris — sau null dacă nu blochează nimic.
 * Aici verificarea nu mai e informativă, ca la Litere Decor unde piesa are 4.5 mm și stă pe un
 * postament: la 35 mm și 200 mm lățime, piesa E obiectul.
 */
export function blocajPiesa(st: StarePiesa, d: DiagnosticCuvant): string | null {
  if (st.modProdus === 'masa' && !d.stabilitate.staSingura) {
    return tr('piesa.blocatCade', { unghi: d.stabilitate.unghiMinGrade.toFixed(0), min: UNGHI_MIN,
      remediu: textRemediu(d.stabilitate.remediu) });
  }
  if (d.bucati > 1) return tr('piesa.blocatBucati', { n: d.bucati });
  return null;
}

/**
 * Corpurile care pleacă la print. Numele și conturul poartă ACELAȘI `grup`: sunt o singură piesă
 * fizică, în două culori. Fără el, așezarea pe placă le-ar despărți. Capacul NU are grup — e
 * piesă separată, care se montează după.
 */
export function corpuriExport(st: StarePiesa, r: RezultatCuvant, grup: string): ExportBody[] {
  return [
    { name: grup, manifold: pentruPrint(r.corp), culoare: st.culoare, orientare: tr('piesa.orientarePrint'), grup },
    ...(r.contur ? [{ name: `${grup}_contur`, manifold: pentruPrint(r.contur),
      culoare: st.culoareContur, orientare: tr('piesa.orientarePrint'), grup }] : []),
    ...(r.capac ? [{ name: `${grup}_capac`, manifold: pentruPrint(r.capac),
      culoare: st.culoareCapac, orientare: tr('piesa.orientareCapac') }] : []),
  ];
}

/** rândurile din fișa de producție care privesc piesa */
export function notePiesa(st: StarePiesa, d: DiagnosticCuvant): string[] {
  const n = [tr('piesa.notaPrint', { g: st.grosime, h: st.inaltimeLitera })];
  if (st.contur !== 'fara') {
    n.push(tr(st.contur === 'placa' ? 'piesa.notaConturPlaca' : 'piesa.notaConturRama',
      { lat: st.latimeContur, gros: st.grosimeContur, total: d.dim[2] }));
  }
  if (st.modProdus === 'masa') {
    n.push(tr('piesa.notaStabil', { unghi: d.stabilitate.unghiMinGrade.toFixed(0), arie: d.stabilitate.ariaMM2.toFixed(0) }));
  } else {
    const a = d.agatare;
    n.push(a.pozitii.length
      ? tr(st.tipAgatare === 'gaura' ? 'piesa.notaGaura'
        : a.pozitii.length > 1 ? 'piesa.notaAgatareDoua' : 'piesa.notaAgatare', {
        tip: numeTip(st.tipAgatare), adanc: a.adancime.toFixed(1), standoff: a.standoff.toFixed(1),
        dist: a.distantaMM.toFixed(0), surub: st.surubTija })
      : tr('piesa.notaFaraAgatare'));
    // PUNTEA — consecința orientării de print: locașul se deschide spre placă, deci tavanul
    // camerei capului se printează peste gol. Ține de fișa de producție, nu de panou.
    if (a.pozitii.length && st.tipAgatare !== 'gaura') n.push(tr('piesa.notaPunte', { adanc: a.adancime.toFixed(1) }));
    if (a.pozitii.length && a.grosimeCapacMM) {
      n.push(tr('piesa.notaCapac', { n: a.pozitii.length, gros: a.grosimeCapacMM.toFixed(1),
        diam: (st.surubCap - 0.3).toFixed(1) }));
    }
  }
  if (d.punti.punti.length) n.push(tr('piesa.notaPunti', { n: d.punti.punti.length, lat: st.latimePunte }));
  if (d.bucati > 1) n.push(tr('piesa.notaBucati', { n: d.bucati }));
  return n;
}
