"use client";

import type { ReactNode } from "react";
import type { TipPiesa } from "@/magic3d/logo/piese";

/*
 * Desenul care arata ce inseamna fiecare cota (A, B, C...): o sectiune sau o vedere simpla a piesei,
 * cu liniile de cota. Cota la care se scrie in panou e aprinsa in verde.
 */

type Cota = { litera: string; x1: number; y1: number; x2: number; y2: number; tx: number; ty: number };

function Linie({ cota, activa }: { cota: Cota; activa: boolean }) {
  return (
    <g className={`desen-cota${activa ? " activa" : ""}`}>
      <line x1={cota.x1} y1={cota.y1} x2={cota.x2} y2={cota.y2} markerStart="url(#sageata)" markerEnd="url(#sageata)" />
      <text x={cota.tx} y={cota.ty} textAnchor="middle" dominantBaseline="middle">{cota.litera}</text>
    </g>
  );
}

const FORME: Record<TipPiesa, { corp: ReactNode; cote: Cota[] }> = {
  // Bucsa in sectiune: doi pereti, gaura intre ei.
  bucsa: {
    corp: <><rect x="60" y="25" width="25" height="80" /><rect x="115" y="25" width="25" height="80" /><line className="desen-ax" x1="100" y1="15" x2="100" y2="115" /></>,
    cote: [
      { litera: "A", x1: 85, y1: 65, x2: 115, y2: 65, tx: 100, ty: 56 },
      { litera: "B", x1: 60, y1: 120, x2: 140, y2: 120, tx: 100, ty: 131 },
      { litera: "C", x1: 155, y1: 25, x2: 155, y2: 105, tx: 166, ty: 65 },
    ],
  },
  // Capacul in sectiune, cu fundul jos (asa se printeaza), peste capatul tubului.
  capac: {
    corp: <><path d="M55 30 V105 H145 V30 H133 V93 H67 V30 Z" /><rect className="desen-tub" x="70" y="12" width="60" height="78" /></>,
    cote: [
      { litera: "A", x1: 70, y1: 20, x2: 130, y2: 20, tx: 100, ty: 11 },
      { litera: "B", x1: 160, y1: 30, x2: 160, y2: 93, tx: 170, ty: 62 },
      { litera: "C", x1: 133, y1: 118, x2: 145, y2: 118, tx: 139, ty: 129 },
      { litera: "D", x1: 40, y1: 93, x2: 40, y2: 105, tx: 30, ty: 99 },
    ],
  },
  // Dopul: gulerul jos, corpul care intra in tub deasupra.
  dop: {
    corp: <><rect x="50" y="90" width="100" height="15" /><rect x="70" y="35" width="60" height="55" /><path className="desen-tub" d="M62 20 V90 M138 20 V90" /></>,
    cote: [
      { litera: "A", x1: 70, y1: 28, x2: 130, y2: 28, tx: 100, ty: 19 },
      { litera: "B", x1: 165, y1: 35, x2: 165, y2: 90, tx: 175, ty: 62 },
      { litera: "C", x1: 130, y1: 118, x2: 150, y2: 118, tx: 140, ty: 129 },
      { litera: "D", x1: 35, y1: 90, x2: 35, y2: 105, tx: 25, ty: 97 },
    ],
  },
  // Suportul in L din lateral, cu gaurile.
  suportL: {
    corp: <><path d="M45 25 H60 V95 H155 V110 H45 Z" /><circle className="desen-gaura" cx="52" cy="55" r="4" /><circle className="desen-gaura" cx="110" cy="102" r="4" /></>,
    cote: [
      { litera: "B", x1: 45, y1: 122, x2: 155, y2: 122, tx: 100, ty: 132 },
      { litera: "C", x1: 30, y1: 25, x2: 30, y2: 110, tx: 20, ty: 68 },
      { litera: "D", x1: 165, y1: 95, x2: 165, y2: 110, tx: 175, ty: 102 },
      { litera: "E", x1: 104, y1: 85, x2: 116, y2: 85, tx: 110, ty: 76 },
      { litera: "A", x1: 70, y1: 40, x2: 70, y2: 40, tx: 100, ty: 45 },
    ],
  },
  // Clema vazuta de sus: inelul deschis in fata, placa cu urechi in spate.
  clema: {
    corp: <><path d="M74 104 A36 36 0 1 1 126 104 L118 96 A26 26 0 1 0 82 96 Z" /><rect x="40" y="20" width="120" height="10" /><circle className="desen-gaura" cx="52" cy="25" r="3.5" /><circle className="desen-gaura" cx="148" cy="25" r="3.5" /></>,
    cote: [
      { litera: "A", x1: 74, y1: 70, x2: 126, y2: 70, tx: 100, ty: 61 },
      { litera: "C", x1: 136, y1: 70, x2: 126, y2: 70, tx: 145, ty: 82 },
      { litera: "D", x1: 141, y1: 12, x2: 155, y2: 12, tx: 148, ty: 5 },
      { litera: "B", x1: 175, y1: 20, x2: 175, y2: 20, tx: 178, ty: 50 },
    ],
  },
  // Adaptorul din lateral: doua capete si trecerea conica, canalul punctat.
  adaptor: {
    corp: <><path d="M75 110 V75 L60 62 V25 H140 V62 L125 75 V110 Z" /><path className="desen-ax" d="M90 110 V20 M110 110 V20" /></>,
    cote: [
      { litera: "A", x1: 75, y1: 122, x2: 125, y2: 122, tx: 100, ty: 132 },
      { litera: "B", x1: 60, y1: 14, x2: 140, y2: 14, tx: 100, ty: 6 },
      { litera: "C", x1: 155, y1: 75, x2: 155, y2: 110, tx: 165, ty: 92 },
      { litera: "D", x1: 125, y1: 95, x2: 110, y2: 95, tx: 140, ty: 95 },
    ],
  },
};

export function DesenPiesa({ tip, activa }: { tip: TipPiesa; activa: string | null }) {
  const desen = FORME[tip];
  return (
    <svg className="desen-piesa" viewBox="0 0 200 140" role="img" aria-hidden="true" data-testid={`desen-${tip}`}>
      <defs>
        <marker id="sageata" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" />
        </marker>
      </defs>
      <g className="desen-corp">{desen.corp}</g>
      {desen.cote.map((cota) => <Linie key={cota.litera} cota={cota} activa={activa === cota.litera} />)}
    </svg>
  );
}
