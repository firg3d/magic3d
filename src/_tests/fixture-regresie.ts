/**
 * SETUL FIX DE PARAMETRI pentru referințele de regresie ale celor 12 generatoare existente.
 *
 * DE CE EXISTĂ. DECIZIA 1 din `docs/design/semnatura-huse-iphone.md`: cele 12 generatoare
 * existente rămân bit cu bit ce sunt azi — gratuite, fără filigran, fără semnătură. Valul SEM.1
 * introduce `aplicaMarcaj` în nucleu, iar nucleul e comun. Fără o măsurătoare luată ÎNAINTE,
 * „n-am stricat nimic" ar fi o părere.
 *
 * Fișierul ăsta e SURSA UNICĂ a parametrilor. Referințele (`referinte-regresie.json`) se
 * generează din el, iar testul de regresie tot din el reconstruiește. Dacă cineva schimbă o
 * valoare aici, referințele nu mai corespund și testul o spune — ceea ce e corect: setul fix
 * trebuie să rămână fix.
 *
 * Valorile vin din configurațiile deja fixate de suitele existente (unde există) sau din starea
 * implicită a aplicației (Litere Decor, care n-avea una). Nu sunt inventate.
 *
 * CE SE COMPARĂ: volum, număr de triunghiuri, număr de componente conexe — NU octeții fișierului
 * 3MF. Măsurat în Faza 0: două exporturi ale aceluiași corp, la o secundă distanță, diferă prin
 * 10 octeți, primul la offsetul 10, exact unde ZIP-ul scrie ora de modificare. Serializarea nu e
 * deterministă, deci o comparație byte-cu-byte ar pica din motive care n-au legătură cu geometria.
 */
export const FONT_LITERA = 'Baloo2-Regular.ttf';
export const FONT_SCRIS = 'Pacifico-Regular.ttf';
export const FONT_CURSIV = 'GreatVibes-Regular.ttf';
export const PLACA = { w: 256, d: 256 };

/** un caz = un generator, cu numele lui și parametrii care nu se mai schimbă */
export interface CazRegresie {
  /** id-ul generatorului, ca în `src/apps/` */
  app: string;
  /** ce fonturi trebuie încărcate înainte (cheile se rezolvă în test) */
  fonturi: string[];
  /** parametrii, fără fonturile care se injectează la rulare */
  cfg: Record<string, unknown>;
}

export const CAZURI: CazRegresie[] = [
  { app: 'litere', fonturi: [FONT_LITERA, FONT_SCRIS], cfg: {
    litera: 'A', inaltimeLitera: 120, grosimeLitera: 25, culoareLitera: '#889EC8',
    chenarActiv: true, latimeChenar: 3, adancimeChenar: 3, razaMuchie: 1.2, taiereBaza: 2,
    scris: 'Andrei', inaltimeScris: 40, reliefScris: 2.5, culoareScris: '#FFFFFF',
    scrisOffX: 0.84, scrisOffY: -35.2, rotatieScris: 0, scrisRotX: 0, scrisRotY: 0,
    scrisPozitieZ: -1.04, modScris: 'locas', grosimeScris: 4.5, jocInsertie: 0.2, tematici: [] } },

  { app: 'nume', fonturi: [FONT_CURSIV], cfg: {
    text: 'Maria', inaltimeLitera: 60, grosime: 35, punti: true, latimePunte: 1.2,
    contur: 'rama', latimeContur: 5, netezireContur: 4, grosimeContur: 6,
    modProdus: 'masa', tipAgatare: 'fara', surubCap: 5, surubTija: 2.5,
    inaltimeCapSurub: 3, latimeGrila: 20, capac: true, grosimeCapac: 2, placa: PLACA } },

  { app: 'brelocuri', fonturi: [FONT_LITERA], cfg: {
    text: 'A', inaltimeLitera: 40, reliefLitera: 1.8, latimePlacuta: 7, netezire: 2,
    grosimePlacuta: 3, diametruGaura: 3.5, tipPrindere: 'gaura', grosimePrindere: 0,
    pozitiePrindere: null, latura: 'sus' } },

  { app: 'fagure', fonturi: [FONT_LITERA], cfg: {
    litera: 'A', inaltimeLitera: 120, grosime: 14, model: 'fagure',
    pasCelula: 8, grosimePerete: 1.2, latimeRama: 2.5, unghiModel: 0, variantaModel: 1,
    taiereBaza: 0, modModel: 'strapuns', adancimeGravare: 2, talpaPlina: 6,
    tipAgatare: 'fara', capacel: true, surubCap: 5, surubTija: 2.5,
    inaltimeCapSurub: 3, grosimeCapac: 2, latimeGrila: 20 } },

  { app: 'cutii', fonturi: [FONT_LITERA], cfg: {
    litera: 'A', inaltimeLitera: 120, adancime: 60, grosimePerete: 2.5, grosimeFund: 2,
    tipAgatare: 'fara', surubCap: 5, surubTija: 2.5, latimeGrila: 20, inaltimeCapSurub: 3,
    modelFund: 'fara', pasFund: 8, pereteFund: 1.6, unghiFund: 0, variantaFund: 1, ramaFund: 2,
    traforPereti: false, formaGol: 'hexagon', deschidere: 14, nervura: 2.5, bandaJos: 10, buzaSus: 6 } },

  { app: 'cuvinte', fonturi: [FONT_CURSIV], cfg: {
    text: 'Ana', inaltime: 55, grosime: 35, punti: true, latimePunte: 1.2, factorMaxPunte: 3.2,
    contur: 'rama', latimeContur: 5, netezireContur: 4, grosimeContur: 6,
    modProdus: 'masa', tipAgatare: 'fara', surubCap: 5, surubTija: 2.5,
    inaltimeCapSurub: 3, latimeGrila: 20, capac: true, grosimeCapac: 2, placa: PLACA } },

  { app: 'led', fonturi: [FONT_LITERA], cfg: {
    litera: 'A', inaltimeLitera: 150, adancimeCorp: 25, ingrosare: 0, grosimePerete: 2,
    grosimeSpate: 2, latimeBanda: 10, tipBanda: 60, latimePrag: 1.2, adancimePrag: 2,
    grosimeFata: 1.6, jocFata: 0.2, diametruCanal: 4, pozitieCanal: 'spate', locCanal: 'jos',
    tipAgatare: 'cheie', surubCap: 5, surubTija: 2.5, inaltimeCapSurub: 3, latimeGrila: 20 } },

  { app: 'articulat', fonturi: [FONT_LITERA], cfg: {
    text: 'Ava', inaltimeLitera: 8, alturaLitera: 1, alto: 6, ancho: 12, largo: 15,
    linkPrim: true, linkUltim: false, culoareBaza: '#1D7400', culoareLitera: '#ffffff' } },

  { app: 'placute', fonturi: [FONT_LITERA], cfg: {
    text: 'Ana', inaltimeText: 30, reliefText: 1.8, latimePlacuta: 7, netezire: 2,
    grosimePlacuta: 3, prindere: 'gaura', diametruGaura: 4, lungimeTerus: 40,
    culoarePlacuta: '#5b4dd1', culoareText: '#fff' } },

  { app: 'rame', fonturi: [FONT_CURSIV], cfg: {
    text: 'Ana',
    // parametrii panzei stau intr-un obiect al lor, `rama`, nu la nivelul de sus
    rama: { tip: 'panza', raza: 90, grosimeFir: 3, colturi: 12, inele: 4, lasare: 0.18 },
    grosimeRama: 6, inaltimeText: 22, grosimeText: 5, latimeAura: 2.5, netezireAura: 2,
    adancimeGravura: 0.8, jocGravura: 0.3, latimePicior: 25, inaltimePicior: 3,
    lungimeBaza: 120, latimeBaza: 30, inaltimeBaza: 12, adancimeInfigere: 6, jocInfigere: 0.2,
    placa: PLACA } },

  // Brelocuri Decor are DOUA fonturi: initiala de fundal si numele scris peste ea
  { app: 'breloc-decor', fonturi: [FONT_LITERA, FONT_CURSIV], cfg: {
    initiala: 'A', nume: 'Ana', inaltimeBaza: 45, latimeRama: 2, grosimeBaza: 5, adancimeRama: 1.5,
    marimeNume: 1, offsetNume: 2, umpleGauri: true, unghi: 10, offX: 0, offY: 2,
    grosimeNume: 3.5, iesireMiez: 0.7, adancimeInlay: 1.5, joc: 0.25, bazaUrmeazaNumele: true,
    inel: true, pozitieInel: 'centru', inelX: 0, inelY: 0,
    diametruInel: 7, gauraInel: 3.8, grosimeInel: 3.5 } },

  { app: 'nume-led', fonturi: [FONT_CURSIV], cfg: {
    text: 'Maria', inaltimeLitera: 80, adancimeCorp: 25, ingrosare: 3, grosimePerete: 2,
    grosimeSpate: 2, latimeBanda: 10, tipBanda: 60, latimePrag: 1.2, adancimePrag: 2,
    grosimeFata: 1.6, jocFata: 0.2, diametruCanal: 4, pozitieCanal: 'spate', locCanal: 'jos',
    tipAgatare: 'cheie', surubCap: 5, surubTija: 2.5, inaltimeCapSurub: 3, latimeGrila: 20,
    modProdus: 'perete', placa: PLACA } },
];
