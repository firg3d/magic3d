"use client";

import { ArrowLeft, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { getLanguage } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { foloseste, t as tm } from "@/magic3d/core/i18n/index";
import { GENERATOARE, generatorDupaId, parametriCompleti } from "@/magic3d/generatoare/catalog";
import { genereaza } from "@/magic3d/generatoare/client";
import { grupuriFonturi, incarcaManifestFonturi, type FontItem } from "@/magic3d/generatoare/fonturi";
import type { GeneratorDef, Magic3dGenerat, ParamDef, Parametri, RezultatGenerare } from "@/magic3d/generatoare/tipuri";
import { tg } from "@/magic3d/generatoare/texte";

/** Ce face editorul cu o constructie: o pune pe placa (tinta null) sau inlocuieste pachetul `tinta`. Intoarce id-ul pachetului. */
export type AplicaGenerare = (rezultat: RezultatGenerare, def: GeneratorDef, meta: Magic3dGenerat, tinta: string | null) => string;

const valoare = <T,>(v: T | ((p: Parametri) => T), p: Parametri): T => (typeof v === "function" ? (v as (p: Parametri) => T)(p) : v);
const ASTEPTARE_MS = 350;

/**
 * Panoul generatoarelor Magic3D. Fara selectie: lista generatoarelor, apoi parametrii si "Adauga pe
 * placa". Cu un pachet generat selectat: parametrii lui, iar fiecare schimbare il reconstruieste pe loc.
 */
export function GeneratoarePanel({ onClose, editat, aplica }: {
  onClose: () => void;
  /** Pachetul generat selectat la deschidere, de editat. */
  editat: { id: string; meta: Magic3dGenerat } | null;
  aplica: AplicaGenerare;
}) {
  useLanguage();
  foloseste(getLanguage() === "ro" ? "ro" : "en");
  const [def, setDef] = useState<GeneratorDef | null>(() => (editat ? generatorDupaId(editat.meta.generator) ?? null : null));
  const [parametri, setParametri] = useState<Parametri>(() => (def ? parametriCompleti(def, editat?.meta.parametri) : {}));
  const [tinta, setTinta] = useState<string | null>(editat?.id ?? null);
  const [lucreaza, setLucreaza] = useState(false);
  const [eroare, setEroare] = useState("");
  const [rezultat, setRezultat] = useState<RezultatGenerare | null>(null);
  const [fonturi, setFonturi] = useState<FontItem[]>([]);
  const versiune = useRef(0);

  useEffect(() => {
    void incarcaManifestFonturi().then(setFonturi);
  }, []);
  const grupuri = useMemo(() => grupuriFonturi(fonturi), [fonturi]);

  const construieste = async (deConstruit: GeneratorDef, p: Parametri, catre: string | null) => {
    const eu = ++versiune.current;
    setLucreaza(true);
    setEroare("");
    try {
      const r = await genereaza(deConstruit.id, p);
      if (eu !== versiune.current) return;
      setRezultat(r);
      const id = aplica(r, deConstruit, { generator: deConstruit.id, versiune: deConstruit.versiune, parametri: p }, catre);
      setTinta(id);
    } catch (reason) {
      if (eu === versiune.current) setEroare(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (eu === versiune.current) setLucreaza(false);
    }
  };

  // Cand pachetul e deja pe placa, orice schimbare il reconstruieste (dupa o mica pauza, nu la fiecare tasta).
  const prima = useRef(true);
  useEffect(() => {
    if (prima.current) {
      prima.current = false;
      return;
    }
    if (!def || !tinta) return;
    const timer = setTimeout(() => void construieste(def, parametri, tinta), ASTEPTARE_MS);
    return () => clearTimeout(timer);
    // `tinta` se schimba chiar din construieste; reconstructia urmeaza doar parametrii.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametri]);

  const alege = (next: GeneratorDef) => {
    setDef(next);
    setParametri({ ...next.implicit });
    setTinta(null);
    setRezultat(null);
    setEroare("");
  };
  const schimba = (cheie: string, v: string | number | boolean) => setParametri((p) => ({ ...p, [cheie]: v }));

  const fontAles = fonturi.find((f) => f.fisier === parametri.font);
  const camp = (param: ParamDef) => {
    if (param.vizibil && !param.vizibil(parametri)) return null;
    const eticheta = tm(valoare(param.eticheta, parametri));
    const v = parametri[param.cheie];
    switch (param.tip) {
      case "text":
        return <label key={param.cheie}><span>{eticheta}</span><input value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)} /></label>;
      case "culoare":
        return <label key={param.cheie} className="gen-culoare"><span>{eticheta}</span><input type="color" value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)} /></label>;
      case "bifa":
        return <label key={param.cheie} className="gen-bifa"><input type="checkbox" checked={Boolean(v)} onChange={(e) => schimba(param.cheie, e.target.checked)} /><span>{eticheta}</span></label>;
      case "alegere":
        return (
          <label key={param.cheie}><span>{eticheta}</span>
            <select value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)}>
              {param.optiuni.map((o) => <option key={o.valoare} value={o.valoare}>{tm(o.eticheta)}</option>)}
            </select>
          </label>
        );
      case "font":
        return (
          <label key={param.cheie}><span>{eticheta}</span>
            <select value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)}>
              {grupuri.length === 0 ? <option value={String(v)}>{String(v)}</option> : null}
              {grupuri.map((g) => (
                <optgroup key={g.categorie} label={g.categorie}>
                  {g.items.map((f) => <option key={f.fisier} value={f.fisier}>{f.familie}{f.lipsaDiacritice.length ? " *" : ""}</option>)}
                </optgroup>
              ))}
            </select>
            {fontAles?.lipsaDiacritice.length ? <small className="gen-nota">{tg("faraDiacritice", { litere: fontAles.lipsaDiacritice.join(" ") })}</small> : null}
          </label>
        );
      case "numar": {
        const min = valoare(param.min, parametri);
        const max = valoare(param.max, parametri);
        const numar = Number(v);
        return (
          <label key={param.cheie} className="gen-numar"><span>{eticheta}</span>
            <span className="gen-numar-rand">
              <input type="range" min={min} max={max} step={param.pas} value={numar} onChange={(e) => schimba(param.cheie, Number(e.target.value))} />
              <input
                className="gen-numar-valoare"
                inputMode="decimal"
                value={String(numar)}
                onChange={(e) => {
                  const next = Number(e.target.value.replace(",", "."));
                  if (Number.isFinite(next)) schimba(param.cheie, Math.min(max, Math.max(min, next)));
                }}
              />
            </span>
          </label>
        );
      }
    }
  };

  // Campurile, cu titlurile grupurilor in ordinea in care apar.
  const sectiuni: { grup: string; campuri: ParamDef[] }[] = [];
  for (const param of def?.parametri ?? []) {
    const grup = param.grup ?? "";
    const ultima = sectiuni[sectiuni.length - 1];
    if (ultima && ultima.grup === grup) ultima.campuri.push(param);
    else sectiuni.push({ grup, campuri: [param] });
  }

  return (
    <MovableToolPanel className="top-action-panel import-action-panel generatoare-panel" ariaLabel={tg("titlu")}>
      {(handleProps) => (<>
        <header className="movable" {...handleProps}>
          <div className="top-action-heading">
            {def && !editat ? (
              <button type="button" className="gen-inapoi" aria-label={tg("inapoi")} onClick={() => setDef(null)}><ArrowLeft size={16} /></button>
            ) : null}
            <strong>{def ? tm(def.titlu) : tg("titlu")}</strong>
          </div>
          <div className="panel-header-actions">
            <button type="button" aria-label={tg("inchide")} onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        <div className="top-action-body" onKeyDown={(event) => event.key === "Escape" && onClose()}>
          {!def ? (
            <>
              <p>{tg("alege")}</p>
              <div className="gen-lista">
                {GENERATOARE.map((g) => (
                  <button key={g.id} type="button" className="gen-card" onClick={() => alege(g)}>{tm(g.titlu)}</button>
                ))}
              </div>
              <p className="gen-nota">{tg("inCurand")}</p>
            </>
          ) : (
            <>
              {sectiuni.map((s) => (
                <section key={s.grup} className="gen-sectiune">
                  {s.grup ? <h3>{tm(s.grup)}</h3> : null}
                  <div className="gen-campuri">{s.campuri.map(camp)}</div>
                </section>
              ))}
              {rezultat?.avertizari.length ? (
                <ul className="gen-avertizari">
                  {rezultat.avertizari.map((a) => <li key={a}><TriangleAlert size={15} aria-hidden /> {a}</li>)}
                </ul>
              ) : null}
              {eroare ? <p className="gen-eroare" role="alert">{tg("eroare", { motiv: eroare })}</p> : null}
              {!tinta ? (
                <button type="button" className="gen-adauga" disabled={lucreaza} onClick={() => void construieste(def, parametri, null)}>
                  {lucreaza ? tg("lucreaza") : tg("adauga")}
                </button>
              ) : (
                <p className="gen-nota">{lucreaza ? tg("lucreaza") : tg("viu", { ms: rezultat?.ms ?? 0 })}</p>
              )}
            </>
          )}
        </div>
      </>)}
    </MovableToolPanel>
  );
}
