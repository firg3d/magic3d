"use client";

import { Heart, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/useLanguage";
import { EXPORT_REUSIT, FORMATE_NOTA, linkSustinere, numaraExport, nuMaiArata, ts, type LocSustinere, type Pastrare } from "@/magic3d/sustine/config";

/**
 * Butonul "Sustine Magic3D": discret, secundar, intr-un tab nou. `varianta` "subsol" e un link in
 * randul de jos; "meniu" e o pictograma in grupul de ajutor al editorului, cu textul in indiciu.
 * Fara NEXT_PUBLIC_SUPPORT_URL nu randeaza nimic.
 */
export function SustineButon({ loc, varianta, baza }: { loc: LocSustinere; varianta: "subsol" | "meniu"; baza?: string }) {
  useLanguage();
  const href = linkSustinere(loc, baza);
  if (!href) return null;
  const titlu = `${ts("titlu")} — ${ts("subtitlu")}`;
  if (varianta === "meniu") {
    return (
      <a className="action-icon-button magic3d-sustine-meniu" data-testid={`sustine-${loc}`} href={href} target="_blank" rel="noopener" title={titlu} aria-label={titlu}>
        <Heart size={18} aria-hidden="true" />
      </a>
    );
  }
  return (
    <a className="magic3d-sustine-subsol" data-testid={`sustine-${loc}`} href={href} target="_blank" rel="noopener" title={ts("subtitlu")}>
      <Heart size={13} aria-hidden="true" />
      {ts("titlu")}
    </a>
  );
}

/**
 * Nota de dupa un export reusit: "Ti-a fost util? Sustine Magic3D", cel mult o data la 10 exporturi,
 * se inchide cu X, iar "Nu mai arata" o opreste definitiv. Nu blocheaza nimic: sta intr-un colt.
 */
export function SustineNota({ baza, store }: { baza?: string; /** Doar pentru teste: alt loc decat localStorage. */ store?: Pastrare }) {
  useLanguage();
  const [vizibila, setVizibila] = useState(false);
  const href = linkSustinere("support-after-export", baza);
  useEffect(() => {
    if (!href) return;
    const laExport = (event: Event) => {
      const format = String((event as CustomEvent<{ format?: string }>).detail?.format ?? "");
      if (FORMATE_NOTA.includes(format) && numaraExport(store)) setVizibila(true);
    };
    window.addEventListener(EXPORT_REUSIT, laExport);
    return () => window.removeEventListener(EXPORT_REUSIT, laExport);
  }, [href, store]);
  if (!href || !vizibila) return null;
  return (
    <aside className="magic3d-sustine-nota" data-testid="sustine-nota" role="status">
      <button type="button" className="magic3d-sustine-inchide" data-testid="sustine-nota-inchide" aria-label={ts("inchide")} onClick={() => setVizibila(false)}>
        <X size={14} aria-hidden="true" />
      </button>
      <a href={href} target="_blank" rel="noopener" data-testid="sustine-support-after-export" onClick={() => setVizibila(false)}>
        <Heart size={14} aria-hidden="true" />
        <strong>{ts("notaTitlu")}</strong>
      </a>
      <p>{ts("subtitlu")}</p>
      <button
        type="button"
        className="magic3d-sustine-nu-mai"
        data-testid="sustine-nota-nu-mai"
        onClick={() => {
          nuMaiArata(store);
          setVizibila(false);
        }}
      >
        {ts("nuMaiArata")}
      </button>
    </aside>
  );
}
