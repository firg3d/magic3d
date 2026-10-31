"use client";

import { useEffect, useState } from "react";
import { tg } from "@/magic3d/generatoare/texte";

/*
 * Biblioteca de modele Magic3D (CC BY-NC-SA 4.0, vezi public/magic3d/LICENTA-MODELE.md): tematici
 * de pus pe litere si baze (postamente). Un clic pune modelul in scena prin importul editorului,
 * ca piesa obisnuita, multicolora, pe care o asezi cu uneltele lui.
 */

/** Evenimentul pe care editorul il asculta: importa fisierul de la `url`, cu numele `nume`. */
export const IMPORTA_MODEL = "magic3d:import-model";
export type CerereImport = { url: string; nume: string };

type Model = { fisier: string; nume: string; thumb?: string; dimensiuniTotale?: { x: number; y: number; z: number } };
export type Colectie = "tematici" | "base";
const MANIFESTE: Record<Colectie, string> = { tematici: "tematici/manifest.json", base: "base/base-manifest.json" };

export function Biblioteca({ colectie }: { colectie: Colectie }) {
  const [modele, setModele] = useState<Model[] | null>(null);
  useEffect(() => {
    let viu = true;
    fetch(`/magic3d/${MANIFESTE[colectie]}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((lista: Model[]) => viu && setModele(lista))
      .catch(() => viu && setModele([]));
    return () => {
      viu = false;
    };
  }, [colectie]);

  if (!modele) return <p className="gen-nota">{tg("lucreaza")}</p>;
  return (
    <>
      <div className="gen-biblioteca">
        {modele.map((model) => (
          <button
            key={model.fisier}
            type="button"
            className="gen-model"
            title={model.dimensiuniTotale ? `${model.nume} · ${Math.round(model.dimensiuniTotale.x)} × ${Math.round(model.dimensiuniTotale.y)} mm` : model.nume}
            onClick={() => window.dispatchEvent(new CustomEvent<CerereImport>(IMPORTA_MODEL, {
              detail: { url: `/magic3d/${colectie}/${encodeURIComponent(model.fisier)}`, nume: model.fisier },
            }))}
          >
            {model.thumb ? <img src={`/magic3d/${colectie}/${encodeURIComponent(model.thumb)}`} alt="" loading="lazy" /> : null}
            <span>{model.nume}</span>
          </button>
        ))}
      </div>
      <p className="gen-nota">{tg("licentaModele")} <a href="/magic3d/LICENTA-MODELE.md" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a></p>
    </>
  );
}
