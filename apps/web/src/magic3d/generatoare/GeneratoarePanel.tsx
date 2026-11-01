"use client";

import { ArrowLeft, Download, Printer, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import type { MeshData } from "@/lib/editorMeshCore";
import { getLanguage } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { foloseste, t as tm } from "@/magic3d/core/i18n/index";
import { GENERATOARE, generatorDupaId, parametriCompleti } from "@/magic3d/generatoare/catalog";
import { genereaza } from "@/magic3d/generatoare/client";
import { grupuriFonturi, incarcaManifestFonturi, type FontItem } from "@/magic3d/generatoare/fonturi";
import type { GeneratorDef, Magic3dGenerat, ParamDef, Parametri, RezultatGenerare } from "@/magic3d/generatoare/tipuri";
import { tg } from "@/magic3d/generatoare/texte";
import { Biblioteca, type Colectie } from "@/magic3d/generatoare/Biblioteca";
import { CampImagine } from "@/magic3d/generatoare/CampImagine";
import { CampModel } from "@/magic3d/generatoare/CampModel";
import { DESCHIDE_LOGO } from "@/magic3d/logo/asset";
import { deschideOferta } from "@/magic3d/oferta/OfertaButton";
import { deschideTermo } from "@/magic3d/termo/preset";
import { arhivaGenerat, contextGenerat, numeFisier, proiectGenerat } from "@/magic3d/generatoare/export";
import { tl } from "@/magic3d/logo/texte";

/** Ce face editorul cu o constructie: o pune pe placa (tinta null) sau inlocuieste pachetul `tinta`. Intoarce id-ul pachetului. */
export type AplicaGenerare = (rezultat: RezultatGenerare, def: GeneratorDef, meta: Magic3dGenerat, tinta: string | null) => string;

const valoare = <T,>(v: T | ((p: Parametri) => T), p: Parametri): T => (typeof v === "function" ? (v as (p: Parametri) => T)(p) : v);

function descarca(bytes: Uint8Array, nume: string, tip: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tip }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nume;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const ASTEPTARE_MS = 350;

/**
 * Panoul generatoarelor Magic3D. Fara selectie: lista generatoarelor, apoi parametrii si "Adauga pe
 * placa". Cu un pachet generat selectat: parametrii lui, iar fiecare schimbare il reconstruieste pe loc.
 */
export function GeneratoarePanel({ onClose, editat, initial, aplica, selectie }: {
  onClose: () => void;
  /** Pachetul generat selectat la deschidere, de editat. */
  editat: { id: string; meta: Magic3dGenerat } | null;
  /** Generatorul pe care se deschide panoul, cand nu se editeaza nimic (cardurile de pe pagina de start). */
  initial?: string;
  aplica: AplicaGenerare;
  /** Plasa obiectului selectat in editor, pentru campurile "model" (vezi CampModel). */
  selectie?: () => { nume: string; plasa: MeshData } | null;
}) {
  useLanguage();
  foloseste(getLanguage() === "ro" ? "ro" : "en");
  const [def, setDef] = useState<GeneratorDef | null>(() => (editat ? generatorDupaId(editat.meta.generator) ?? null : initial ? generatorDupaId(initial) ?? null : null));
  const [parametri, setParametri] = useState<Parametri>(() => (def ? parametriCompleti(def, editat?.meta.parametri) : {}));
  const [tinta, setTinta] = useState<string | null>(editat?.id ?? null);
  const [lucreaza, setLucreaza] = useState(false);
  const [eroare, setEroare] = useState("");
  const [rezultat, setRezultat] = useState<RezultatGenerare | null>(null);
  const [fonturi, setFonturi] = useState<FontItem[]>([]);
  const [colectie, setColectie] = useState<Colectie | null>(null);
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
    const testid = `gen-param-${param.cheie}`;
    switch (param.tip) {
      case "text":
        return <label key={param.cheie}><span>{eticheta}</span><input data-testid={testid} value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)} /></label>;
      case "culoare":
        return <label key={param.cheie} className="gen-culoare"><span>{eticheta}</span><input type="color" data-testid={testid} value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)} /></label>;
      case "bifa":
        return <label key={param.cheie} className="gen-bifa"><input type="checkbox" data-testid={testid} checked={Boolean(v)} onChange={(e) => schimba(param.cheie, e.target.checked)} /><span>{eticheta}</span></label>;
      case "alegere":
        return (
          <label key={param.cheie}><span>{eticheta}</span>
            <select data-testid={testid} value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)}>
              {/* Cheile i18n au puncte ("placute.prindGaura"); o eticheta fara punct (litera "A") se arata ca atare. */}
              {param.optiuni.map((o) => <option key={o.valoare} value={o.valoare}>{o.eticheta.includes(".") ? tm(o.eticheta) : o.eticheta}</option>)}
            </select>
          </label>
        );
      case "font":
        return (
          <label key={param.cheie}><span>{eticheta}</span>
            <select data-testid={testid} value={String(v)} onChange={(e) => schimba(param.cheie, e.target.value)}>
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
      case "imagine":
        return (
          <CampImagine
            key={param.cheie}
            eticheta={eticheta}
            valoare={String(v ?? "")}
            onChange={(next) => schimba(param.cheie, next)}
            testid={testid}
            harta={param.harta ? { latura: param.laturaHarta ?? 128, onChange: (next) => schimba(param.harta as string, next) } : undefined}
          />
        );
      case "model":
        return <CampModel key={param.cheie} eticheta={eticheta} valoare={String(v ?? "")} maxTriunghiuri={param.maxTriunghiuri} onChange={(next) => schimba(param.cheie, next)} testid={testid} selectie={selectie} />;
      case "numar": {
        const min = valoare(param.min, parametri);
        const max = valoare(param.max, parametri);
        const numar = Number(v);
        return (
          <label key={param.cheie} className="gen-numar"><span>{eticheta}</span>
            <span className="gen-numar-rand">
              <input type="range" data-testid={testid} min={min} max={max} step={param.pas} value={numar} onChange={(e) => schimba(param.cheie, Number(e.target.value))} />
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
            {(def && !editat) || colectie ? (
              <button type="button" className="gen-inapoi" aria-label={tg("inapoi")} onClick={() => { setDef(null); setColectie(null); }}><ArrowLeft size={16} /></button>
            ) : null}
            <strong>{def ? tm(def.titlu) : colectie ? tg(colectie === "base" ? "baze" : "tematici") : tg("titlu")}</strong>
          </div>
          <div className="panel-header-actions">
            <button type="button" aria-label={tg("inchide")} onClick={onClose}><X size={18} /></button>
          </div>
        </header>
        <div className="top-action-body" onKeyDown={(event) => event.key === "Escape" && onClose()}>
          {!def && colectie ? (
            <Biblioteca colectie={colectie} />
          ) : !def ? (
            <>
              <p>{tg("alege")}</p>
              <div className="gen-lista">
                {GENERATOARE.filter((g) => !g.categorie).map((g) => (
                  <button key={g.id} type="button" className="gen-card" onClick={() => alege(g)}>{tm(g.titlu)}</button>
                ))}
              </div>
              <section className="gen-sectiune" data-testid="gen-personalizate">
                <h3>{tg("personalizate")}</h3>
                <div className="gen-lista">
                  {GENERATOARE.filter((g) => g.categorie === "personalizate").map((g) => (
                    <button key={g.id} type="button" className="gen-card" data-testid={`gen-${g.id}`} onClick={() => alege(g)}>{tm(g.titlu)}</button>
                  ))}
                  <button type="button" className="gen-card" data-testid="gen-glob-plasa" onClick={() => { onClose(); deschideTermo({ forma: "cerc", mod: "cutie", latime: 80 }); }}>
                    {tg("globPlasa")}
                  </button>
                </div>
              </section>
              <section className="gen-sectiune" data-testid="gen-matrite">
                <h3>{tg("matrite")}</h3>
                <div className="gen-lista">
                  {GENERATOARE.filter((g) => g.categorie === "matrite").map((g) => (
                    <button key={g.id} type="button" className="gen-card" data-testid={`gen-${g.id}`} onClick={() => alege(g)}>{tm(g.titlu)}</button>
                  ))}
                  <button type="button" className="gen-card" data-testid="gen-termoformare" onClick={() => { onClose(); deschideTermo({}); }}>
                    {tg("termoformare")}
                  </button>
                </div>
              </section>
              <section className="gen-sectiune">
                <h3>{tl("titlu")}</h3>
                <div className="gen-lista">
                  <button
                    type="button"
                    className="gen-card"
                    data-testid="gen-logo"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new Event(DESCHIDE_LOGO));
                    }}
                  >
                    {tl("cardText")}
                  </button>
                </div>
              </section>
              <section className="gen-sectiune">
                <h3>{tg("modele")}</h3>
                <div className="gen-lista">
                  <button type="button" className="gen-card" onClick={() => setColectie("tematici")}>{tg("tematici")}</button>
                  <button type="button" className="gen-card" onClick={() => setColectie("base")}>{tg("baze")}</button>
                </div>
              </section>
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
              {tinta && rezultat && !lucreaza ? (
                <div className="gen-iesire" data-testid="gen-iesire">
                  <button type="button" className="gen-card" data-testid="gen-3mf" onClick={() => descarca(proiectGenerat(rezultat.piese, def, parametri), `${numeFisier(tm(def.titlu))}.3mf`, "model/3mf")}>
                    <Download size={15} aria-hidden /> {tg("descarca3mf")}
                  </button>
                  <button type="button" className="gen-card" data-testid="gen-stl" onClick={() => descarca(arhivaGenerat(rezultat.piese, def, parametri), `${numeFisier(tm(def.titlu))}-stl.zip`, "application/zip")}>
                    <Download size={15} aria-hidden /> {tg("descarcaStl")}
                  </button>
                  <button type="button" className="gen-card" data-testid="gen-printeaza" onClick={() => deschideOferta(contextGenerat(rezultat.piese, def, parametri))}>
                    <Printer size={15} aria-hidden /> {tg("printeaza")}
                  </button>
                </div>
              ) : null}
              {def.instructiuni ? (
                <section className="gen-sectiune">
                  <h3>{tg("instructiuni")}</h3>
                  <pre className="gen-instructiuni" data-testid="gen-instructiuni">{def.instructiuni(parametri)}</pre>
                </section>
              ) : null}
            </>
          )}
        </div>
      </>)}
    </MovableToolPanel>
  );
}
