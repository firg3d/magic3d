"use client";

import { ImageUp, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RasterPixels } from "@/lib/rasterTrace";
import type { Magic3dGenerat } from "@/magic3d/generatoare/tipuri";
import { deschideOferta } from "@/magic3d/oferta/OfertaButton";
import { Camp } from "@/magic3d/logo/Camp";
import { pixeliDinSvg } from "@/magic3d/logo/client";
import { LOGO } from "@/magic3d/logo/config";
import { AVERTISMENT_TRIUNGHIURI, LIMITE_RELIEF, SETARI_RELIEF_IMPLICITE, type FormaRelief, type ModRelief, type SetariRelief } from "@/magic3d/logo/relief";
import { construiesteRelief, previzualizeazaRelief, type PrevizualizareRelief } from "@/magic3d/logo/reliefClient";
import { tl, type CheieLogo } from "@/magic3d/logo/texte";

/*
 * Fila "Poza -> relief / litofanie" din panoul "Din poza sau logo". Previzualizarea se reface la
 * fiecare setare (in relief.worker.ts, la rezolutie mica); obiectul intreg se construieste doar la
 * "Pune pe placa". Poza nu intra in proiect: pe obiect raman setarile (eticheta magic3d), nu poza.
 */

export type CreeazaRelief = (positions: Float32Array, nume: string, culoare: string, meta: Magic3dGenerat, inlocuieste: string | null) => Promise<{ id: string; nume: string }>;

type Date = { fisier: Blob } | { pixeli: RasterPixels };

const ACCEPTA = ".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml";
const FORME: Record<ModRelief, FormaRelief[]> = { litofanie: ["plata", "curbata", "cilindru", "inima"], relief: ["plata", "inima"] };
const CULOARE: Record<ModRelief, string> = { litofanie: "#f4f2ec", relief: "#d9ded9" };
const numar = (valoare: number, zecimale = 1) => valoare.toLocaleString(undefined, { maximumFractionDigits: zecimale });

let urmatoareaSursa = 1;

export function ReliefSectiune({ onCreate }: { onCreate: CreeazaRelief }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panzaRef = useRef<HTMLCanvasElement>(null);
  const [numeFisier, setNumeFisier] = useState("");
  const [sursa, setSursa] = useState<{ id: number; date: Date } | null>(null);
  const [setari, setSetari] = useState<SetariRelief>(SETARI_RELIEF_IMPLICITE.litofanie);
  const [prev, setPrev] = useState<PrevizualizareRelief | null>(null);
  const [construiesc, setConstruiesc] = useState(false);
  const [pus, setPus] = useState<{ id: string; nume: string; mod: ModRelief } | null>(null);
  const [eroare, setEroare] = useState("");
  const [trag, setTrag] = useState(false);

  const alege = async (fisier: File) => {
    setEroare("");
    setPrev(null);
    if (fisier.size > LOGO.maxMbFisier * 1024 * 1024) {
      setEroare(tl("prea_mare", { mb: LOGO.maxMbFisier }));
      return;
    }
    setNumeFisier(fisier.name);
    try {
      const esteSvg = fisier.type === "image/svg+xml" || /\.svg$/i.test(fisier.name);
      const date: Date = esteSvg ? { pixeli: await pixeliDinSvg(await fisier.text(), 1600) } : { fisier };
      if (!esteSvg && !(/^image\/(png|jpeg)$/.test(fisier.type) || /\.(png|jpe?g)$/i.test(fisier.name))) throw new Error("tip");
      setSursa({ id: urmatoareaSursa++, date });
    } catch {
      setSursa(null);
      setEroare(tl("necunoscut"));
    }
  };

  useEffect(() => {
    if (!sursa) return;
    let anulat = false;
    const pauza = window.setTimeout(() => {
      previzualizeazaRelief(sursa.id, sursa.date, setari)
        .then((rezultat) => {
          if (!anulat && rezultat) setPrev(rezultat);
        })
        .catch(() => !anulat && setEroare(tl("necunoscut")));
    }, 150);
    return () => {
      anulat = true;
      window.clearTimeout(pauza);
    };
  }, [sursa, setari]);

  // Previzualizarea desenata pe panza: un pixel pe celula, intinsa de browser.
  useEffect(() => {
    const panza = panzaRef.current;
    if (!panza || !prev) return;
    panza.width = prev.imagine.width;
    panza.height = prev.imagine.height;
    const context = panza.getContext("2d");
    context?.putImageData(new ImageData(new Uint8ClampedArray(prev.imagine.data), prev.imagine.width, prev.imagine.height), 0, 0);
  }, [prev]);

  const schimba = (cheie: keyof SetariRelief, valoare: number | boolean | string) => setSetari((curente) => ({ ...curente, [cheie]: valoare }));
  const alegeMod = (mod: ModRelief) => setSetari((curente) => ({ ...SETARI_RELIEF_IMPLICITE[mod], latime: curente.latime, forma: FORME[mod].includes(curente.forma) ? curente.forma : "plata" }));

  const pune = async () => {
    if (!sursa) return;
    setConstruiesc(true);
    setEroare("");
    try {
      const { positions } = await construiesteRelief(sursa.id, sursa.date, setari);
      const nume = setari.mod === "litofanie" ? `${tl("numeLitofanie")} · ${tl(`forma_${setari.forma}` as CheieLogo)}` : tl("numeRelief");
      const parametri: Magic3dGenerat["parametri"] = Object.fromEntries(Object.entries(setari).map(([k, v]) => [k, v as string | number | boolean]));
      const rezultat = await onCreate(positions, nume, CULOARE[setari.mod], { generator: `poza-${setari.mod}`, versiune: 1, parametri }, pus?.id ?? null);
      setPus({ ...rezultat, mod: setari.mod });
    } catch (error) {
      setEroare(error instanceof Error && error.message ? error.message : tl("eroareConstructie"));
    } finally {
      setConstruiesc(false);
    }
  };

  const litofanie = setari.mod === "litofanie";
  const mare = prev && prev.info.triunghiuri >= AVERTISMENT_TRIUNGHIURI;

  return (
    <>
      <p className="logo-descriere">{tl("reliefDescriere")}</p>
      <section className="logo-sectiune">
        <button
          type="button"
          data-testid="relief-alege"
          className={`logo-fisier${trag ? " logo-fisier-trage" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setTrag(true); }}
          onDragLeave={() => setTrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            setTrag(false);
            const fisier = event.dataTransfer.files[0];
            if (fisier) void alege(fisier);
          }}
        >
          <ImageUp size={22} aria-hidden="true" />
          <span>
            <strong>{numeFisier || tl("alegePoza")}</strong>
            <small>{tl("formatePoza")}</small>
          </span>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPTA} hidden data-testid="relief-fisier" onChange={(event) => {
          const fisier = event.target.files?.[0];
          event.target.value = "";
          if (fisier) void alege(fisier);
        }} />

        <div className="logo-iesiri" role="radiogroup" aria-label={tl("filaRelief")}>
          {(["litofanie", "relief"] as ModRelief[]).map((mod) => (
            <button key={mod} type="button" role="radio" aria-checked={setari.mod === mod} data-testid={`relief-mod-${mod}`} className={setari.mod === mod ? "activ" : ""} onClick={() => alegeMod(mod)}>
              {mod === "litofanie" ? tl("modLitofanie") : tl("modRelief")}
            </button>
          ))}
        </div>

        <div className="logo-optiuni">
          <label className="logo-camp">
            <span>{tl("forma")}</span>
            <select data-testid="relief-forma" value={setari.forma} onChange={(event) => schimba("forma", event.target.value)}>
              {FORME[setari.mod].map((forma) => <option key={forma} value={forma}>{tl(`forma_${forma}` as CheieLogo)}</option>)}
            </select>
          </label>
          <Camp eticheta={setari.forma === "cilindru" ? tl("circumferinta") : tl("latimePoza")} valoare={setari.latime} limite={LIMITE_RELIEF.latime} onChange={(v) => schimba("latime", v)} testid="relief-latime" />
          {litofanie ? (<>
            <Camp eticheta={tl("grosimeMin")} valoare={setari.grosimeMin} limite={LIMITE_RELIEF.grosimeMin} onChange={(v) => schimba("grosimeMin", Math.min(v, setari.grosimeMax - 0.2))} testid="relief-grosime-min" />
            <Camp eticheta={tl("grosimeMax")} valoare={setari.grosimeMax} limite={LIMITE_RELIEF.grosimeMax} onChange={(v) => schimba("grosimeMax", Math.max(v, setari.grosimeMin + 0.2))} testid="relief-grosime-max" />
          </>) : (<>
            <Camp eticheta={tl("reliefBaza")} valoare={setari.baza} limite={LIMITE_RELIEF.baza} onChange={(v) => schimba("baza", v)} testid="relief-baza" />
            <Camp eticheta={tl("reliefInaltime")} valoare={setari.inaltime} limite={LIMITE_RELIEF.inaltime} onChange={(v) => schimba("inaltime", v)} testid="relief-inaltime" />
          </>)}
          <Camp eticheta={tl("bordura")} valoare={setari.bordura} limite={LIMITE_RELIEF.bordura} onChange={(v) => schimba("bordura", v)} testid="relief-bordura" />
          <Camp eticheta={tl("rezolutie")} valoare={setari.rezolutie} limite={LIMITE_RELIEF.rezolutie} onChange={(v) => schimba("rezolutie", v)} testid="relief-rezolutie" />
          {setari.forma === "curbata" ? <Camp eticheta={tl("arc")} valoare={setari.arc} limite={LIMITE_RELIEF.arc} unitate="°" onChange={(v) => schimba("arc", v)} testid="relief-arc" /> : null}
          <label className="logo-camp logo-glisor">
            <span>{tl("netezirePoza")}</span>
            <input type="range" data-testid="relief-netezire" min={0} max={4} step={1} value={setari.netezire} onChange={(event) => schimba("netezire", Number(event.target.value))} />
          </label>
          {!litofanie ? (
            <label className="logo-bifa">
              <input type="checkbox" data-testid="relief-inalt-deschis" checked={setari.inaltDeschis} onChange={(event) => schimba("inaltDeschis", event.target.checked)} />
              <span>{tl("inaltDeschis")}</span>
            </label>
          ) : null}
        </div>

        {sursa ? (
          <figure className={`logo-previzualizare relief-previzualizare${litofanie ? " relief-lumina" : ""}`} data-testid="relief-previzualizare">
            <canvas ref={panzaRef} aria-label={litofanie ? tl("previzLumina") : tl("previzRelief")} />
            <figcaption>{litofanie ? tl("previzLumina") : tl("previzRelief")}</figcaption>
            {prev ? (
              <figcaption data-testid="relief-info">
                {tl("dimensiuniInfo", { l: numar(prev.info.latime), a: numar(prev.info.adancime), t: numar(prev.info.triunghiuri, 0), p: numar(prev.info.pas, 2) })}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
        {prev?.info.simplificata ? <p className="logo-nota" data-testid="relief-simplificat">{tl("simplificat", { p: numar(prev.info.pas, 2) })}</p> : null}
        {mare ? <p className="logo-nota relief-avertisment" data-testid="relief-avertisment">{tl("avertMare")}</p> : null}
        {litofanie ? <p className="logo-nota">{tl("notaLitofanie")}</p> : null}

        {sursa ? (
          <div className="logo-actiuni">
            <button type="button" className="logo-buton logo-buton-plin" data-testid="relief-adauga" disabled={construiesc || !prev} onClick={() => void pune()}>
              {construiesc ? tl("construiesc") : tl("adauga")}
            </button>
            {pus ? (
              <button type="button" className="logo-buton" data-testid="relief-printeaza" onClick={() => deschideOferta({ generator: `${tl("titlu")} → ${pus.mod === "litofanie" ? tl("modLitofanie") : tl("modRelief")}`, firma: true })}>
                <Printer size={16} aria-hidden="true" /> {tl("printeaza")}
              </button>
            ) : null}
          </div>
        ) : null}
        {pus ? <p className="logo-gata" role="status">{tl("adaugat", { nume: pus.nume })}</p> : null}
        {eroare ? <p className="logo-eroare" role="alert">{eroare}</p> : null}
      </section>
    </>
  );
}
