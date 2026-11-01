"use client";

import { Box, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { codeazaModel, decodeazaModel } from "@/magic3d/core/geometry/codare";
import { tg } from "@/magic3d/generatoare/texte";

/*
 * Campul "model" al unui generator: un STL citit in browser (cu STLLoader, ca importul editorului),
 * pastrat in parametri ca plasa sudata si cuantizata (core/geometry/codare.ts). Peste
 * `maxTriunghiuri` modelul nu se primeste: parametrii stau in proiect si trebuie sa ramana mici.
 */

const MAX_MB = 30;

export function CampModel({ eticheta, valoare, maxTriunghiuri, onChange, testid }: { eticheta: string; valoare: string; maxTriunghiuri: number; onChange: (v: string) => void; testid: string }) {
  const intrare = useRef<HTMLInputElement>(null);
  const [nume, setNume] = useState("");
  const [eroare, setEroare] = useState("");
  const plasa = useMemo(() => decodeazaModel(valoare), [valoare]);

  const alege = async (fisier: File) => {
    setEroare("");
    try {
      if (fisier.size > MAX_MB * 1024 * 1024 || !/\.stl$/i.test(fisier.name)) throw new Error("tip");
      const geometrie = new STLLoader().parse(await fisier.arrayBuffer());
      const pozitii = geometrie.getAttribute("position");
      if (!pozitii || pozitii.count < 3) throw new Error("gol");
      const n = Math.floor(pozitii.count / 3);
      const cod = codeazaModel(pozitii.array as Float32Array, maxTriunghiuri);
      geometrie.dispose();
      if (!cod) {
        setEroare(tg("modelPreaMare", { n, max: maxTriunghiuri }));
        return;
      }
      setNume(fisier.name);
      onChange(cod);
    } catch {
      setEroare(tg("modelNecunoscut"));
    }
  };

  return (
    <div className="gen-imagine" data-testid={testid}>
      <span>{eticheta}</span>
      <div className="gen-imagine-rand">
        <button type="button" className="gen-card" data-testid={`${testid}-alege`} onClick={() => intrare.current?.click()}>
          <Box size={16} aria-hidden /> {plasa ? tg("schimbaModel") : tg("alegeModel")}
        </button>
        {plasa ? (
          <button type="button" className="gen-imagine-scoate" data-testid={`${testid}-scoate`} aria-label={tg("stergeModel")} onClick={() => { setNume(""); onChange(""); }}>
            <X size={15} aria-hidden />
          </button>
        ) : null}
      </div>
      <input
        ref={intrare}
        type="file"
        accept=".stl,model/stl"
        hidden
        data-testid={`${testid}-fisier`}
        onChange={(event) => {
          const fisier = event.target.files?.[0];
          event.target.value = "";
          if (fisier) void alege(fisier);
        }}
      />
      {plasa ? <small className="gen-nota" data-testid={`${testid}-info`}>{tg("modelInfo", { nume: nume || "STL", n: plasa.triunghiuri.length / 3 })}</small> : null}
      {eroare ? <small className="gen-eroare" role="alert">{eroare}</small> : null}
      <small className="gen-nota">{tg("modelDrepturi")}</small>
    </div>
  );
}
