"use client";

import { useEffect, useRef, useState } from "react";
import { parseMeasurementInput } from "@/lib/measurementUnits";

/** Un camp de masura: text, citit ca in restul editorului (virgula, punct, fractii, sume), tinut in limite cand e parasit. */
export function Camp({ eticheta, valoare, limite, unitate = "mm", onChange, testid }: { eticheta: string; valoare: number; limite: readonly [number, number]; unitate?: string; onChange: (v: number) => void; testid: string }) {
  const [text, setText] = useState(String(valoare));
  const editez = useRef(false);
  // Cat timp se scrie in camp, textul e al omului ("5," ramane "5,"); altfel urmeaza valoarea (alta iesire aleasa).
  useEffect(() => {
    if (!editez.current) setText(String(valoare));
  }, [valoare]);
  const aplica = (scris: string) => {
    const numar = parseMeasurementInput(scris);
    if (Number.isFinite(numar)) onChange(Math.round(Math.min(limite[1], Math.max(limite[0], numar)) * 100) / 100);
  };
  return (
    <label className="logo-camp">
      <span>{eticheta}</span>
      <span className="logo-camp-valoare">
        <input
          type="text"
          inputMode="decimal"
          data-testid={testid}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            aplica(event.target.value);
          }}
          onFocus={() => {
            editez.current = true;
          }}
          onBlur={() => {
            editez.current = false;
            setText(String(valoare));
          }}
        />
        <small>{unitate}</small>
      </span>
    </label>
  );
}

