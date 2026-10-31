"use client";

import { ImageUp, Printer, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { parseMeasurementInput } from "@/lib/measurementUnits";
import { RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";
import { useLanguage } from "@/lib/useLanguage";
import { deschideOferta } from "@/magic3d/oferta/OfertaButton";
import { pixeliDinSvg, traseaza } from "@/magic3d/logo/client";
import { IESIRI, LIMITE, LOGO, SETARI_IMPLICITE, type SetariIesire, type TipIesire } from "@/magic3d/logo/config";
import { caleSvg } from "@/magic3d/logo/profil";
import { OPTIUNI_IMPLICITE, type OptiuniTrasare, type TrasareLogo } from "@/magic3d/logo/trasare";
import { tl, type CheieLogo } from "@/magic3d/logo/texte";

/*
 * Panoul "Din poză sau logo": 1. imaginea si conturul (in workerul logo.worker.ts, cu
 * previzualizare 2D), 2. ce obiect se face din el. "Pune pe placa" pune un grup editabil; apasat din
 * nou, il inlocuieste pe cel pus de panou. Imaginea ramane in pagina: nu intra in proiect si nu
 * pleaca nicaieri - la oferta pleaca doar modelul 3D, ca la orice alta piesa.
 */

export type CreeazaLogo = (trasare: TrasareLogo, setari: SetariIesire, inlocuieste: string | null) => Promise<{ id: string; nume: string }>;

type Sursa = { fisier: Blob } | { pixeli: RasterPixels };

const ACCEPTA = ".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg";

/** Un camp de masura: text, citit ca in restul editorului (virgula, punct, fractii, sume), tinut in limite cand e parasit. */
function Camp({ eticheta, valoare, limite, unitate = "mm", onChange, testid }: { eticheta: string; valoare: number; limite: readonly [number, number]; unitate?: string; onChange: (v: number) => void; testid: string }) {
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

export function LogoPanel({ onClose, onCreate }: { onClose: () => void; onCreate: CreeazaLogo }) {
  useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [numeFisier, setNumeFisier] = useState("");
  const [sursa, setSursa] = useState<Sursa | null>(null);
  const [optiuni, setOptiuni] = useState<OptiuniTrasare>(OPTIUNI_IMPLICITE);
  const [trasare, setTrasare] = useState<TrasareLogo | null>(null);
  const [conturez, setConturez] = useState(false);
  const [setari, setSetari] = useState<SetariIesire>(SETARI_IMPLICITE.placuta);
  const [construiesc, setConstruiesc] = useState(false);
  const [pus, setPus] = useState<{ id: string; nume: string; tip: TipIesire } | null>(null);
  const [eroare, setEroare] = useState("");
  const [trag, setTrag] = useState(false);

  const alege = async (fisier: File) => {
    setEroare("");
    setTrasare(null);
    if (fisier.size > LOGO.maxMbFisier * 1024 * 1024) {
      setEroare(tl("prea_mare", { mb: LOGO.maxMbFisier }));
      return;
    }
    setNumeFisier(fisier.name);
    try {
      const esteSvg = fisier.type === "image/svg+xml" || /\.svg$/i.test(fisier.name);
      if (esteSvg) setSursa({ pixeli: await pixeliDinSvg(await fisier.text(), LOGO.maxLaturaPx) });
      else if (/^image\/(png|jpeg)$/.test(fisier.type) || /\.(png|jpe?g)$/i.test(fisier.name)) setSursa({ fisier });
      else throw new Error("tip");
    } catch {
      setSursa(null);
      setEroare(tl("necunoscut"));
    }
  };

  // Conturul se reface la fiecare schimbare a optiunilor, cu o mica pauza (un prag tras cu mouse-ul).
  useEffect(() => {
    if (!sursa) return;
    let anulat = false;
    setConturez(true);
    const pauza = window.setTimeout(() => {
      traseaza(sursa, optiuni)
        .then((rezultat) => {
          if (anulat || !rezultat) return;
          setTrasare(rezultat);
          setEroare("");
        })
        .catch((error: unknown) => {
          if (anulat) return;
          setTrasare(null);
          setEroare(error instanceof Error && error.message === RASTER_TRACE_EMPTY ? tl("gol") : tl("necunoscut"));
        })
        .finally(() => !anulat && setConturez(false));
    }, 200);
    return () => {
      anulat = true;
      window.clearTimeout(pauza);
    };
  }, [sursa, optiuni]);

  const alegeIesire = (tip: TipIesire) => setSetari((curente) => ({ ...SETARI_IMPLICITE[tip], marime: curente.tip === tip ? curente.marime : SETARI_IMPLICITE[tip].marime }));
  const schimba = (cheie: keyof SetariIesire, valoare: number | boolean) => setSetari((curente) => ({ ...curente, [cheie]: valoare }));

  const pune = async () => {
    if (!trasare) return;
    setConstruiesc(true);
    setEroare("");
    try {
      const rezultat = await onCreate(trasare, setari, pus?.id ?? null);
      setPus({ ...rezultat, tip: setari.tip });
    } catch (error) {
      setEroare(error instanceof Error && error.message ? error.message : tl("eroareConstructie"));
    } finally {
      setConstruiesc(false);
    }
  };

  const tip = setari.tip;
  const areBaza = tip !== "prajitura";

  return (
    <MovableToolPanel className="top-action-panel import-action-panel logo-panel" ariaLabel={tl("titlu")}>
      {(handleProps) => (<>
        <header className="movable" {...handleProps}>
          <div className="top-action-heading">
            <strong>{tl("titlu")}</strong>
          </div>
          <div className="panel-header-actions">
            <button type="button" aria-label={tl("inchide")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="top-action-body" data-testid="logo-panel" onKeyDown={(event) => event.key === "Escape" && onClose()}>
          <p className="logo-descriere">{tl("descriere")}</p>

          <section className="logo-sectiune">
            <h3>{tl("pasContur")}</h3>
            <button
              type="button"
              data-testid="logo-alege"
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
                <strong>{numeFisier || tl("alegeFisier")}</strong>
                <small>{tl("formate")}</small>
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTA}
              hidden
              data-testid="logo-fisier"
              onChange={(event) => {
                const fisier = event.target.files?.[0];
                event.target.value = "";
                if (fisier) void alege(fisier);
              }}
            />

            {sursa ? (<>
              <div className="logo-optiuni">
                <label className="logo-camp">
                  <span>{tl("culori")}</span>
                  <select data-testid="logo-culori" value={optiuni.culori} onChange={(event) => setOptiuni({ ...optiuni, culori: Number(event.target.value) })}>
                    {Array.from({ length: LOGO.maxCulori }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n === 1 ? tl("monocrom") : tl("nCulori", { n })}</option>
                    ))}
                  </select>
                </label>
                {optiuni.culori === 1 ? (
                  <label className="logo-camp logo-glisor">
                    <span>{tl("prag")}</span>
                    <input type="range" data-testid="logo-prag" min={0.05} max={0.95} step={0.01} value={optiuni.prag} onChange={(event) => setOptiuni({ ...optiuni, prag: Number(event.target.value) })} />
                  </label>
                ) : null}
                <label className="logo-camp logo-glisor">
                  <span>{tl("netezire")}</span>
                  <input type="range" data-testid="logo-netezire" min={0} max={4} step={1} value={optiuni.netezire} onChange={(event) => setOptiuni({ ...optiuni, netezire: Number(event.target.value) })} />
                </label>
                <label className="logo-camp logo-glisor">
                  <span>{tl("zgomot")}</span>
                  <input type="range" data-testid="logo-zgomot" min={0} max={1} step={0.01} value={optiuni.zgomot} onChange={(event) => setOptiuni({ ...optiuni, zgomot: Number(event.target.value) })} />
                </label>
                {optiuni.culori === 1 ? (
                  <label className="logo-bifa">
                    <input type="checkbox" data-testid="logo-inversare" checked={optiuni.inversare} onChange={(event) => setOptiuni({ ...optiuni, inversare: event.target.checked })} />
                    <span>{tl("inversare")}</span>
                  </label>
                ) : null}
              </div>

              <figure className="logo-previzualizare" aria-label={tl("previzualizare")} data-testid="logo-previzualizare">
                {trasare ? (
                  <svg viewBox={`0 0 ${trasare.latime} ${trasare.inaltime}`} role="img" aria-label={tl("previzualizare")}>
                    {trasare.straturi.map((strat, i) => (
                      <path key={i} d={caleSvg(strat.inele)} fill={strat.culoare} fillRule="evenodd" stroke="#17211c" strokeWidth={Math.max(0.6, trasare.latime / 500)} />
                    ))}
                  </svg>
                ) : null}
                {conturez ? <figcaption className="logo-stare">{tl("conturez")}</figcaption> : null}
                {trasare && trasare.straturi.length > 1 ? <figcaption>{tl("straturi", { n: trasare.straturi.length })}</figcaption> : null}
              </figure>
            </>) : null}
          </section>

          {trasare ? (
            <section className="logo-sectiune">
              <h3>{tl("pasObiect")}</h3>
              <div className="logo-iesiri" role="radiogroup" aria-label={tl("iesire")}>
                {IESIRI.map((iesire) => (
                  <button key={iesire} type="button" role="radio" aria-checked={tip === iesire} data-testid={`logo-iesire-${iesire}`} className={tip === iesire ? "activ" : ""} onClick={() => alegeIesire(iesire)}>
                    {tl(`iesire_${iesire}` as CheieLogo)}
                  </button>
                ))}
              </div>
              <div className="logo-optiuni">
                <Camp eticheta={tl("marime")} valoare={setari.marime} limite={LIMITE.marime} onChange={(v) => schimba("marime", v)} testid="logo-marime" />
                {areBaza ? (<>
                  <Camp eticheta={tl("baza")} valoare={setari.baza} limite={LIMITE.baza} onChange={(v) => schimba("baza", v)} testid="logo-baza" />
                  <Camp eticheta={tip === "placuta" && setari.gravat ? tl("adancime") : tl("relief")} valoare={setari.relief} limite={LIMITE.relief} onChange={(v) => schimba("relief", v)} testid="logo-relief" />
                  {tip === "placuta" ? (
                    <label className="logo-bifa">
                      <input type="checkbox" data-testid="logo-gravat" checked={setari.gravat} onChange={(event) => schimba("gravat", event.target.checked)} />
                      <span>{tl("gravat")}</span>
                    </label>
                  ) : null}
                  {tip !== "stampila" ? <Camp eticheta={tl("rama")} valoare={setari.rama} limite={LIMITE.rama} onChange={(v) => schimba("rama", v)} testid="logo-rama" /> : null}
                  {tip !== "breloc" ? <Camp eticheta={tl("colturi")} valoare={setari.colturi} limite={LIMITE.colturi} onChange={(v) => schimba("colturi", v)} testid="logo-colturi" /> : null}
                  {tip === "placuta" || tip === "breloc" ? (
                    <Camp eticheta={tip === "breloc" ? tl("gauraInel") : tl("gauraPrindere")} valoare={setari.gaura} limite={LIMITE.gaura} onChange={(v) => schimba("gaura", v)} testid="logo-gaura" />
                  ) : null}
                </>) : null}
              </div>
              {tip === "stampila" ? <p className="logo-nota">{tl("notaStampila")}</p> : null}
              {tip === "prajitura" ? <p className="logo-nota">{tl("notaPrajitura")}</p> : null}
              {tip === "semn" ? <p className="logo-nota">{tl("notaSemn")}</p> : null}

              <div className="logo-actiuni">
                <button type="button" className="logo-buton logo-buton-plin" data-testid="logo-adauga" disabled={construiesc || conturez} onClick={() => void pune()}>
                  {construiesc ? tl("construiesc") : tl("adauga")}
                </button>
                {pus ? (
                  <button
                    type="button"
                    className="logo-buton"
                    data-testid="logo-printeaza"
                    onClick={() => deschideOferta({ generator: `${tl("titlu")} → ${tl(`iesire_${pus.tip}` as CheieLogo)}`, firma: true })}
                  >
                    <Printer size={16} aria-hidden="true" /> {tl("printeaza")}
                  </button>
                ) : null}
              </div>
              {pus ? <p className="logo-gata" role="status">{tl("adaugat", { nume: pus.nume })}</p> : null}
            </section>
          ) : null}

          {eroare ? <p className="logo-eroare" role="alert">{eroare}</p> : null}
        </div>
      </>)}
    </MovableToolPanel>
  );
}
