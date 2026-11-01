"use client";

import { Box, MousePointerClick, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { meshForShape, type MeshData } from "@/lib/editorMeshCore";
import { layerlingToZUp } from "@/lib/meshCoordinates";
import { importedShapeFromObj } from "@/lib/objImport";
import { importedShapeFromStl } from "@/lib/stlImport";
import { parseaza3mf } from "@/magic3d/core/assets/threemf";
import { codeazaModel, decodeazaModel } from "@/magic3d/core/geometry/codare";
import { tg } from "@/magic3d/generatoare/texte";

/*
 * Campul "model" al unui generator: un STL, OBJ sau 3MF citit in browser, sau obiectul selectat in
 * editor. STL-ul si OBJ-ul trec prin importul editorului (aceeasi orientare ca la "Importa"), 3MF-ul
 * prin cititorul Magic3D. In parametri ajunge plasa sudata si cuantizata (core/geometry/codare.ts),
 * cu Z in sus; peste `maxTriunghiuri` modelul nu se primeste, parametrii stau in proiect.
 */

const MAX_MB = 30;

/** O plasa a editorului (Y in sus) ca triunghiuri neindexate cu Z in sus. */
function triunghiuriEditor(plasa: MeshData): Float32Array {
  const out = new Float32Array(plasa.faces.length * 9);
  plasa.faces.forEach((fata, i) => fata.forEach((v, k) => out.set(layerlingToZUp(plasa.vertices[v]), i * 9 + k * 3)));
  return out;
}

async function triunghiuriFisier(fisier: File): Promise<Float32Array> {
  if (/\.stl$/i.test(fisier.name)) return triunghiuriEditor(meshForShape(importedShapeFromStl(fisier.name, await fisier.arrayBuffer())));
  if (/\.obj$/i.test(fisier.name)) return triunghiuriEditor(meshForShape(importedShapeFromObj(fisier.name, await fisier.text())));
  if (/\.3mf$/i.test(fisier.name)) {
    const corpuri = parseaza3mf(new Uint8Array(await fisier.arrayBuffer()));
    const n = corpuri.reduce((s, c) => s + c.tris.length, 0);
    const out = new Float32Array(n * 3);
    let i = 0;
    for (const c of corpuri) for (const v of c.tris) { out.set(c.verts.subarray(v * 3, v * 3 + 3), i); i += 3; }
    return out;
  }
  throw new Error("tip");
}

export function CampModel({ eticheta, valoare, maxTriunghiuri, onChange, testid, selectie }: {
  eticheta: string;
  valoare: string;
  maxTriunghiuri: number;
  onChange: (v: string) => void;
  testid: string;
  /** Plasa obiectului selectat in editor (unul singur), cand panoul e deschis din editor. */
  selectie?: () => { nume: string; plasa: MeshData } | null;
}) {
  const intrare = useRef<HTMLInputElement>(null);
  const [nume, setNume] = useState("");
  const [eroare, setEroare] = useState("");
  const plasa = useMemo(() => decodeazaModel(valoare), [valoare]);

  const primeste = (pozitii: Float32Array, denumire: string) => {
    const n = Math.floor(pozitii.length / 9);
    if (n === 0) throw new Error("gol");
    const cod = codeazaModel(pozitii, maxTriunghiuri);
    if (!cod) {
      setEroare(tg("modelPreaMare", { n, max: maxTriunghiuri }));
      return;
    }
    setNume(denumire);
    onChange(cod);
  };

  const alege = async (fisier: File) => {
    setEroare("");
    try {
      if (fisier.size > MAX_MB * 1024 * 1024) throw new Error("mare");
      primeste(await triunghiuriFisier(fisier), fisier.name);
    } catch {
      setEroare(tg("modelNecunoscut"));
    }
  };

  const dinEditor = () => {
    setEroare("");
    const ales = selectie?.();
    if (!ales) {
      setEroare(tg("modelFaraSelectie"));
      return;
    }
    try {
      primeste(triunghiuriEditor(ales.plasa), ales.nume || tg("modelDinEditor"));
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
      {selectie ? (
        <button type="button" className="gen-card" data-testid={`${testid}-editor`} onClick={dinEditor}>
          <MousePointerClick size={16} aria-hidden /> {tg("modelDinEditor")}
        </button>
      ) : null}
      <input
        ref={intrare}
        type="file"
        accept=".stl,.obj,.3mf,model/stl,model/obj,model/3mf"
        hidden
        data-testid={`${testid}-fisier`}
        onChange={(event) => {
          const fisier = event.target.files?.[0];
          event.target.value = "";
          if (fisier) void alege(fisier);
        }}
      />
      {plasa ? <small className="gen-nota" data-testid={`${testid}-info`}>{tg("modelInfo", { nume: nume || "model", n: plasa.triunghiuri.length / 3 })}</small> : null}
      {eroare ? <small className="gen-eroare" role="alert">{eroare}</small> : null}
      <small className="gen-nota">{tg("modelDrepturi")}</small>
    </div>
  );
}
