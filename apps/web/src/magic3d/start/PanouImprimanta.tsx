"use client";

import { useEffect, useRef } from "react";
import { tst } from "@/magic3d/start/texte";

/*
 * Panoul imprimantei din hero: o simulare (nu o transmisie din atelier) - piesa creste strat cu strat,
 * duza merge stanga-dreapta in latimea piesei la inaltimea curenta si urca odata cu axa X. Ciclu de
 * 12 s de print si 3 s de pauza ("Gata"). Animatia scrie direct in DOM din requestAnimationFrame,
 * se opreste cand panoul nu se vede sau tab-ul e ascuns; cu prefers-reduced-motion ramane un cadru
 * static, piesa la 70%.
 */

export const IMPRIMANTA = {
  /** Secunde de print si de pauza intr-un ciclu. */
  print: 12,
  pauza: 3,
  /** Piesa: latimea si inaltimea pe scena (px), straturile, timpul ramas la inceput (s). */
  latime: 200,
  inaltime: 230,
  straturi: 230,
  durata: 38 * 60,
  /** Inaltimea patului si cat sta axa X deasupra varfului duzei (px). */
  pat: 40,
  axa: 38,
  /** Silueta piesei (fractiunea din latime la fractiunea din inaltime), ca polygon-ul din CSS. */
  profil: [[0, 0.4], [0.4, 0.8], [0.85, 0.3], [1, 0.44]] as const,
  /** Cadrul static pentru prefers-reduced-motion. */
  progresStatic: 0.7,
};

export type Cadru = { inaltime: number; duzaX: number; duzaY: number; axaY: number; strat: number; ramas: string; procent: number; gata: boolean };

/** Ce arata panoul la secunda `t` din ciclu (0 .. print + pauza). */
export function cadru(t: number, progres?: number): Cadru {
  const I = IMPRIMANTA;
  const p = progres ?? Math.min(t / I.print, 1);
  const inaltime = Math.round(p * I.inaltime);
  let fractie = I.profil[0][1];
  for (let i = 0; i < I.profil.length - 1; i += 1) {
    const [y0, f0] = I.profil[i], [y1, f1] = I.profil[i + 1];
    if (p >= y0 && p <= y1) fractie = f0 + ((f1 - f0) * (p - y0)) / (y1 - y0);
  }
  const jumatate = (fractie * I.latime) / 2 - 6;
  const gata = p >= 1;
  const duzaY = I.pat + inaltime + (gata ? 30 : 0);
  const ramas = Math.round((1 - p) * I.durata);
  return {
    inaltime,
    duzaX: gata ? 140 : Math.round(Math.sin(t * 9) * jumatate),
    duzaY,
    axaY: duzaY + I.axa,
    strat: Math.round(p * I.straturi),
    ramas: `${String(Math.floor(ramas / 60)).padStart(2, "0")}:${String(ramas % 60).padStart(2, "0")}`,
    procent: Math.round(p * 100),
    gata,
  };
}

const faraMiscare = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PanouImprimanta() {
  const panou = useRef<HTMLElement>(null);
  const el = {
    obiect: useRef<HTMLDivElement>(null),
    duza: useRef<HTMLDivElement>(null),
    axa: useRef<HTMLDivElement>(null),
    strat: useRef<HTMLSpanElement>(null),
    ramas: useRef<HTMLSpanElement>(null),
    progres: useRef<HTMLDivElement>(null),
    stare: useRef<HTMLSpanElement>(null),
    pleaca: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const radacina = panou.current;
    if (!radacina) return;
    const deseneaza = (c: Cadru) => {
      el.obiect.current!.style.height = `${c.inaltime}px`;
      el.duza.current!.style.bottom = `${c.duzaY}px`;
      el.duza.current!.style.transform = `translateX(${c.duzaX}px)`;
      el.axa.current!.style.bottom = `${c.axaY}px`;
      el.strat.current!.textContent = `${c.strat}/${IMPRIMANTA.straturi}`;
      el.ramas.current!.textContent = c.ramas;
      el.progres.current!.style.width = `${c.procent}%`;
      el.stare.current!.textContent = c.gata ? tst("panouGata") : tst("panouPrinteaza");
      radacina.dataset.stare = c.gata ? "gata" : "printeaza";
      el.pleaca.current!.hidden = !c.gata;
    };

    if (faraMiscare()) {
      radacina.dataset.animat = "nu";
      deseneaza(cadru(0, IMPRIMANTA.progresStatic));
      return;
    }
    radacina.dataset.animat = "da";
    const ciclu = IMPRIMANTA.print + IMPRIMANTA.pauza;
    let t = 0;
    let ultim: number | null = null;
    let id = 0;
    let vizibil = true;
    const pas = (acum: number) => {
      if (ultim !== null) t = (t + Math.min(0.1, (acum - ultim) / 1000)) % ciclu;
      ultim = acum;
      deseneaza(cadru(t));
      id = requestAnimationFrame(pas);
    };
    const porneste = () => {
      if (id || !vizibil || document.visibilityState === "hidden") return;
      ultim = null;
      id = requestAnimationFrame(pas);
    };
    const opreste = () => {
      cancelAnimationFrame(id);
      id = 0;
    };
    deseneaza(cadru(0));
    const observator = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([intrare]) => {
        vizibil = intrare.isIntersecting;
        if (vizibil) porneste(); else opreste();
      })
      : null;
    observator?.observe(radacina);
    const laVizibilitate = () => (document.visibilityState === "hidden" ? opreste() : porneste());
    document.addEventListener("visibilitychange", laVizibilitate);
    porneste();
    return () => {
      opreste();
      observator?.disconnect();
      document.removeEventListener("visibilitychange", laVizibilitate);
    };
    // Referintele nu se schimba intre randari.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <figure ref={panou} className="m3d-imprimanta" id="printare" role="img" aria-label={tst("panouAria")} data-testid="start-imprimanta">
      <figcaption className="m3d-imprimanta-bara" aria-hidden="true">
        <span className="m3d-imprimanta-punct" />
        <span ref={el.stare}>{tst("panouPrinteaza")}</span>
        <span className="m3d-imprimanta-fisier">{tst("panouFisier")}</span>
      </figcaption>
      <div className="m3d-imprimanta-scena" aria-hidden="true">
        <div ref={el.obiect} className="m3d-imprimanta-obiect">
          <div className="m3d-imprimanta-piesa" />
        </div>
        <div ref={el.duza} className="m3d-imprimanta-duza">
          <span className="m3d-duza-cap" />
          <span className="m3d-duza-varf" />
          <span className="m3d-duza-jar" />
        </div>
        <div ref={el.axa} className="m3d-imprimanta-axa" />
        <div className="m3d-imprimanta-pat" />
        <div ref={el.pleaca} className="m3d-imprimanta-gata" hidden>{tst("panouPleaca")}</div>
      </div>
      <dl className="m3d-imprimanta-telemetrie" aria-hidden="true">
        <div><dt>{tst("panouDuza")}</dt><dd>215°C</dd></div>
        <div><dt>{tst("panouPat")}</dt><dd>60°C</dd></div>
        <div><dt>{tst("panouStrat")}</dt><dd><span ref={el.strat}>0/{IMPRIMANTA.straturi}</span></dd></div>
        <div><dt>{tst("panouRamas")}</dt><dd><span ref={el.ramas}>38:00</span></dd></div>
      </dl>
      <div className="m3d-imprimanta-progres" aria-hidden="true"><div ref={el.progres} /></div>
      <p className="m3d-imprimanta-simulare" aria-hidden="true">{tst("panouSimulare")}</p>
    </figure>
  );
}
