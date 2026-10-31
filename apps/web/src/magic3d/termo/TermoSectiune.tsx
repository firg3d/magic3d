"use client";

import { Download, ImageUp, Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";
import { useLanguage } from "@/lib/useLanguage";
import type { Magic3dGenerat, PiesaGenerata } from "@/magic3d/generatoare/tipuri";
import { Camp } from "@/magic3d/logo/Camp";
import { pixeliDinSvg } from "@/magic3d/logo/client";
import { deschideOferta } from "@/magic3d/oferta/OfertaButton";
import { proiectBambu } from "@/magic3d/termo/bambu3mf";
import { construieste, silueta as cereSilueta } from "@/magic3d/termo/client";
import { LIMITE, latimeMaxima, MATERIALE, SETARI_IMPLICITE, TERMO, type Material, type ModelPlasa, type SetariTermo } from "@/magic3d/termo/config";
import { arhivaStl, instructiuni, pieseScena, proiectTermo, type PieseTermo } from "@/magic3d/termo/export";
import { caleSvgInele, FORME, formaExemplu, type FormaExemplu } from "@/magic3d/termo/forme";
import type { Inele, InfoTermo, VedereTermo } from "@/magic3d/termo/geometrie";
import { ineleCuYSus, OPTIUNI_SILUETA, type OptiuniSilueta } from "@/magic3d/termo/silueta";
import { tt, type CheieTermo } from "@/magic3d/termo/texte";
import { Vizualizare3D } from "@/magic3d/termo/Vizualizare3D";

/*
 * "Termoformare din poză", ca expert in patru pasi: 1. imaginea (sau o forma proprie) si silueta ei,
 * 2. marimea si adancimea, 3. plasa, 4. piesele - pe placa, ca 3MF Bambu / Orca, ca STL-uri, cu
 * instructiunile de formare. Silueta si piesele se fac in termo.worker.ts; imaginea nu pleaca nicaieri.
 */

export type CreeazaTermo = (piese: PiesaGenerata[], nume: string, meta: Magic3dGenerat, inlocuieste: string | null) => Promise<{ id: string; nume: string }>;

type Construit = { piese: PieseTermo; vedere: VedereTermo | null; contur: Inele; zone: Inele; gura: Inele; info: InfoTermo };
type Sursa = { tip: "forma"; forma: FormaExemplu } | { tip: "imagine"; id: number; date: { fisier: Blob } | { pixeli: RasterPixels } };

const ACCEPTA = ".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg";
const MAX_MB = 15;
const PASI = [1, 2, 3, 4] as const;

let urmatoareaSursa = 1;

function descarca(bytes: Uint8Array, nume: string, tip: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: tip }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nume;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Numele unui fisier, fara diacritice si spatii. */
const numeFisier = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "magic3d";

function Contur({ inele, zone, gura, testid }: { inele: Inele; zone?: Inele; gura?: Inele; testid: string }) {
  const toate = [...inele, ...(zone ?? []), ...(gura ?? [])];
  const xs = toate.flat().map((p) => p[0]);
  const ys = toate.flat().map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const latura = Math.max(maxX - minX, maxY - minY, 1e-6);
  const m = latura * 0.04;
  const cale = (r: Inele) => r.map((inel) => inel.map(([x, y], i) => `${i ? "L" : "M"}${(x - minX + m).toFixed(2)} ${(maxY - y + m).toFixed(2)}`).join("") + "Z").join("");
  const linie = latura / 220;
  return (
    <svg viewBox={`0 0 ${(maxX - minX + 2 * m).toFixed(2)} ${(maxY - minY + 2 * m).toFixed(2)}`} role="img" aria-label={tt("previzualizare")} data-testid={testid}>
      <path d={cale(inele)} fill={TERMO.culoarePlasa} fillOpacity={0.55} fillRule="evenodd" stroke="#17211c" strokeWidth={linie * 1.4} />
      {gura?.length ? <path d={cale(gura)} fill="none" stroke="#17211c" strokeWidth={linie} strokeDasharray={`${linie * 4} ${linie * 3}`} /> : null}
      {zone?.length ? <path d={cale(zone)} fill="#d7263d" fillOpacity={0.75} stroke="#d7263d" strokeWidth={linie} data-testid="termo-zone" /> : null}
    </svg>
  );
}

export function TermoSectiune({ onCreate }: { onCreate: CreeazaTermo }) {
  useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pas, setPas] = useState<1 | 2 | 3 | 4>(1);
  const [sursa, setSursa] = useState<Sursa | null>(null);
  const [numeSursa, setNumeSursa] = useState("");
  const [optiuni, setOptiuni] = useState<OptiuniSilueta>(OPTIUNI_SILUETA);
  const [inele, setInele] = useState<Inele | null>(null);
  const [conturez, setConturez] = useState(false);
  const [setari, setSetari] = useState<SetariTermo>(SETARI_IMPLICITE);
  const [adancimeAtinsa, setAdancimeAtinsa] = useState(false);
  const [construit, setConstruit] = useState<Construit | null>(null);
  const [construiesc, setConstruiesc] = useState(false);
  const [pus, setPus] = useState<{ id: string; nume: string } | null>(null);
  const [eroare, setEroare] = useState("");
  const [trag, setTrag] = useState(false);
  const [vedere, setVedere] = useState<"rezultat" | "presare">("rezultat");
  const trimisa = useRef(0);

  const alegeFisier = async (fisier: File) => {
    setEroare("");
    if (fisier.size > MAX_MB * 1024 * 1024) {
      setEroare(tt("prea_mare", { mb: MAX_MB }));
      return;
    }
    try {
      const esteSvg = fisier.type === "image/svg+xml" || /\.svg$/i.test(fisier.name);
      const date = esteSvg ? { pixeli: await pixeliDinSvg(await fisier.text(), 1000) } : /^image\/(png|jpeg)$/.test(fisier.type) || /\.(png|jpe?g)$/i.test(fisier.name) ? { fisier } : null;
      if (!date) throw new Error("tip");
      setNumeSursa(fisier.name.replace(/\.[^.]+$/, ""));
      setInele(null);
      setSursa({ tip: "imagine", id: urmatoareaSursa++, date });
    } catch {
      setEroare(tt("necunoscut"));
    }
  };

  const alegeForma = (forma: FormaExemplu) => {
    setEroare("");
    setNumeSursa(tt(`forma_${forma}` as CheieTermo));
    setSursa({ tip: "forma", forma });
  };

  // Silueta: formele proprii direct, imaginile in worker (cu o mica pauza cand se trage un cursor).
  useEffect(() => {
    if (!sursa) return;
    if (sursa.tip === "forma") {
      setInele(formaExemplu(sursa.forma));
      return;
    }
    let anulat = false;
    setConturez(true);
    const pauza = window.setTimeout(() => {
      const date = trimisa.current === sursa.id ? undefined : sursa.date;
      trimisa.current = sursa.id;
      cereSilueta(sursa.id, date, optiuni)
        .then((s) => {
          if (anulat || !s) return;
          setInele(ineleCuYSus(s.inele));
          setEroare("");
        })
        .catch((error: unknown) => {
          if (anulat) return;
          setInele(null);
          setEroare(error instanceof Error && error.message === RASTER_TRACE_EMPTY ? tt("gol") : tt("necunoscut"));
        })
        .finally(() => !anulat && setConturez(false));
    }, 200);
    return () => {
      anulat = true;
      window.clearTimeout(pauza);
    };
  }, [sursa, optiuni]);

  // Piesele se reconstruiesc la orice schimbare, de la pasul 2 incolo (cotele si avertizarile se vad pe loc).
  useEffect(() => {
    if (!inele || pas < 2) return;
    let anulat = false;
    setConstruiesc(true);
    const pauza = window.setTimeout(() => {
      construieste(inele, setari)
        .then((r) => {
          if (anulat || !r) return;
          setConstruit({ piese: r.piese, vedere: r.vedere, contur: r.contur, zone: r.zone, gura: r.gura, info: r.info });
          setEroare("");
        })
        .catch((error: unknown) => {
          if (anulat) return;
          setConstruit(null);
          const cod = error instanceof Error ? error.message : "";
          setEroare(cod === "termo-gol" ? tt("termo_gol") : cod === "termo-ingust" ? tt("termo_ingust") : tt("eroare"));
        })
        .finally(() => !anulat && setConstruiesc(false));
    }, 350);
    return () => {
      anulat = true;
      window.clearTimeout(pauza);
    };
  }, [inele, setari, pas]);

  const schimba = <K extends keyof SetariTermo>(cheie: K, valoare: SetariTermo[K]) => setSetari((s) => ({ ...s, [cheie]: valoare }));
  const schimbaLatime = (latime: number) => setSetari((s) => ({ ...s, latime, adancime: adancimeAtinsa ? s.adancime : Math.round(latime * TERMO.adancimeDinLatime) }));

  const nume = numeSursa || tt("titlu");
  const info = construit?.info ?? null;
  const text = useMemo(() => (info ? instructiuni(info, setari, nume) : ""), [info, setari, nume]);
  const gata = Boolean(construit && !construiesc);

  const pune = async () => {
    if (!construit) return;
    try {
      const parametri = { latime: setari.latime, adancime: setari.adancime, material: setari.material, model: setari.model, densitate: setari.densitate };
      const r = await onCreate(pieseScena(construit.piese), tt("numeProiect", { forma: nume }), { generator: "termoformare", versiune: 1, parametri }, pus?.id ?? null);
      setPus(r);
    } catch (error) {
      setEroare(error instanceof Error && error.message ? error.message : tt("eroare"));
    }
  };

  const miniatura = (forma: FormaExemplu) => caleSvgInele(formaExemplu(forma), 40, 3);

  return (
    <div data-testid="termo-panel">
      <p className="logo-descriere">{tt("descriere")}</p>
      <ol className="termo-pasi" aria-label={tt("titlu")}>
        {PASI.map((p) => (
          <li key={p}>
            <button type="button" data-testid={`termo-pas-${p}`} aria-current={pas === p ? "step" : undefined} className={pas === p ? "activ" : ""} disabled={p > 1 && !inele} onClick={() => setPas(p)}>
              {tt(`pas${p}` as CheieTermo)}
            </button>
          </li>
        ))}
      </ol>

      {pas === 1 ? (
        <section className="logo-sectiune" data-testid="termo-pasul-1">
          <button
            type="button"
            data-testid="termo-alege"
            className={`logo-fisier${trag ? " logo-fisier-trage" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setTrag(true); }}
            onDragLeave={() => setTrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setTrag(false);
              const fisier = event.dataTransfer.files[0];
              if (fisier) void alegeFisier(fisier);
            }}
          >
            <ImageUp size={22} aria-hidden="true" />
            <span>
              <strong>{sursa?.tip === "imagine" ? numeSursa : tt("alegeFisier")}</strong>
              <small>{tt("formate")}</small>
            </span>
          </button>
          <p className="termo-drepturi" data-testid="termo-drepturi">{tt("drepturi")}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTA}
            hidden
            data-testid="termo-fisier"
            onChange={(event) => {
              const fisier = event.target.files?.[0];
              event.target.value = "";
              if (fisier) void alegeFisier(fisier);
            }}
          />
          <p className="termo-eticheta">{tt("sauForma")}</p>
          <div className="termo-forme">
            {FORME.map((forma) => {
              const m = miniatura(forma);
              return (
                <button key={forma} type="button" data-testid={`termo-forma-${forma}`} aria-pressed={sursa?.tip === "forma" && sursa.forma === forma} className={sursa?.tip === "forma" && sursa.forma === forma ? "activ" : ""} onClick={() => alegeForma(forma)}>
                  <svg viewBox={`0 0 ${m.latime.toFixed(1)} ${m.inaltime.toFixed(1)}`} aria-hidden="true"><path d={m.d} /></svg>
                  <span>{tt(`forma_${forma}` as CheieTermo)}</span>
                </button>
              );
            })}
          </div>
          {sursa?.tip === "imagine" ? (
            <div className="logo-optiuni">
              <label className="logo-camp logo-glisor">
                <span>{tt("detaliu")}</span>
                <input type="range" data-testid="termo-detaliu" min={1} max={5} step={1} value={optiuni.detaliu} onChange={(event) => setOptiuni({ ...optiuni, detaliu: Number(event.target.value) })} />
              </label>
              <label className="logo-bifa">
                <input type="checkbox" data-testid="termo-inversare" checked={optiuni.inversare} onChange={(event) => setOptiuni({ ...optiuni, inversare: event.target.checked })} />
                <span>{tt("inversare")}</span>
              </label>
            </div>
          ) : null}
          {inele ? (
            <figure className="logo-previzualizare termo-previzualizare">
              <Contur inele={inele} testid="termo-silueta" />
              {conturez ? <figcaption className="logo-stare">{tt("conturez")}</figcaption> : null}
            </figure>
          ) : conturez ? <p className="logo-stare">{tt("conturez")}</p> : null}
        </section>
      ) : null}

      {pas === 2 ? (
        <section className="logo-sectiune" data-testid="termo-pasul-2">
          <div className="logo-iesiri" role="radiogroup" aria-label={tt("latime")}>
            {TERMO.latimiSugerate.map((l) => (
              <button key={l} type="button" role="radio" aria-checked={setari.latime === l} data-testid={`termo-latime-${l}`} className={setari.latime === l ? "activ" : ""} onClick={() => schimbaLatime(l)}>
                {l} mm
              </button>
            ))}
          </div>
          <div className="logo-optiuni">
            <Camp eticheta={tt("latime")} valoare={setari.latime} limite={[TERMO.latimeMin, latimeMaxima()]} onChange={schimbaLatime} testid="termo-latime" />
            <Camp eticheta={tt("adancime")} valoare={setari.adancime} limite={[TERMO.adancimeMin, Math.round(latimeMaxima() * 0.5)]} onChange={(v) => { setAdancimeAtinsa(true); schimba("adancime", v); }} testid="termo-adancime" />
          </div>
          {info ? <p className="logo-nota" data-testid="termo-sigura">{tt("sigura", { mm: info.adancimeSigura, ingust: info.ingust })}</p> : null}
          <div className="logo-iesiri" role="radiogroup" aria-label={tt("mod")}>
            {(["bol", "cutie"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={setari.mod === m} data-testid={`termo-mod-${m}`} className={setari.mod === m ? "activ" : ""} onClick={() => schimba("mod", m)}>
                {tt(m === "bol" ? "modBol" : "modCutie")}
              </button>
            ))}
          </div>
          {setari.mod === "cutie" ? <p className="logo-nota">{tt("notaCutie")}</p> : null}
          <label className="logo-camp">
            <span>{tt("material")}</span>
            <select data-testid="termo-material" value={setari.material} onChange={(event) => schimba("material", event.target.value as Material)}>
              {MATERIALE.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </section>
      ) : null}

      {pas === 3 ? (
        <section className="logo-sectiune" data-testid="termo-pasul-3">
          <div className="logo-iesiri" role="radiogroup" aria-label={tt("modelPlasa")}>
            {(["gyroid", "fagure"] as ModelPlasa[]).map((model) => (
              <button key={model} type="button" role="radio" aria-checked={setari.model === model} data-testid={`termo-model-${model}`} className={setari.model === model ? "activ" : ""} onClick={() => schimba("model", model)}>
                {tt(`model_${model}` as CheieTermo)}
              </button>
            ))}
          </div>
          <div className="logo-optiuni">
            <Camp eticheta={tt("densitate")} unitate="%" valoare={setari.densitate} limite={LIMITE.densitate} onChange={(v) => schimba("densitate", Math.round(v))} testid="termo-densitate" />
          </div>
        </section>
      ) : null}

      {pas >= 2 ? (
        <figure className="logo-previzualizare termo-previzualizare" data-testid="termo-previzualizare">
          {construit ? <Contur inele={construit.contur} zone={construit.zone} gura={construit.gura} testid="termo-contur" /> : null}
          {construiesc ? <figcaption className="logo-stare">{tt("construiesc")}</figcaption> : null}
          {construit && construit.info.zoneIngrosate ? <figcaption>{tt("zoneIngrosate", { n: construit.info.zoneIngrosate })}</figcaption> : null}
        </figure>
      ) : null}

      {pas === 4 && construit ? (
        <section className="logo-sectiune" data-testid="termo-pasul-4">
          <p className="termo-info" data-testid="termo-info">
            {tt("piese", { l: construit.info.latime, a: construit.info.inaltime, b1: construit.info.bloc[0], b2: construit.info.bloc[1], b3: construit.info.bloc[2], s: construit.info.inaltimeSus })}
            <br />
            {tt("joc", { joc: construit.info.joc.toFixed(1), v: construit.info.aerisiri, p: construit.info.stifturi })}
            {setari.mod === "cutie" ? (<><br />{tt("cutieInfo", { n: construit.info.cleme, seturi: tt(construit.info.seturi === 2 ? "douaSeturi" : "unSet") })}</>) : null}
          </p>
          {construit.vedere ? (
            <figure className="termo-vedere" data-testid="termo-vedere">
              <div className="logo-iesiri" role="radiogroup" aria-label={tt("vedereTitlu")}>
                {(["rezultat", "presare"] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={vedere === v} data-testid={`termo-vedere-${v}`} className={vedere === v ? "activ" : ""} onClick={() => setVedere(v)}>
                    {tt(v === "rezultat" ? "vedereRezultat" : "vederePresare")}
                  </button>
                ))}
              </div>
              <Vizualizare3D key={vedere} piese={construit.vedere[vedere]} testid="termo-vedere-3d" />
              <figcaption>{tt("vedereAjutor")}</figcaption>
            </figure>
          ) : null}
          <div className="logo-actiuni">
            <button type="button" className="logo-buton logo-buton-plin" data-testid="termo-pune" disabled={!gata} onClick={() => void pune()}>
              {pus ? tt("inlocuieste") : tt("pune")}
            </button>
            <button type="button" className="logo-buton" data-testid="termo-3mf" disabled={!gata} onClick={() => descarca(proiectBambu(proiectTermo(construit.piese, setari, undefined, nume, construit.info)), `termoformare-${numeFisier(nume)}.3mf`, "model/3mf")}>
              <Download size={16} aria-hidden="true" /> {tt("descarca3mf")}
            </button>
            <button type="button" className="logo-buton" data-testid="termo-stl" disabled={!gata} onClick={() => descarca(arhivaStl(construit.piese, text), `termoformare-${numeFisier(nume)}-stl.zip`, "application/zip")}>
              <Download size={16} aria-hidden="true" /> {tt("descarcaStl")}
            </button>
            {pus ? (
              <button type="button" className="logo-buton" data-testid="termo-oferta" onClick={() => deschideOferta({ generator: tt("titlu"), firma: true })}>
                <Printer size={16} aria-hidden="true" /> {tt("oferta")}
              </button>
            ) : null}
          </div>
          {pus ? <p className="logo-gata" role="status">{tt("adaugat", { nume: pus.nume })}</p> : null}
          <h4>{tt("instructiuniTitlu")}</h4>
          <pre className="termo-instructiuni" data-testid="termo-instructiuni">{text}</pre>
        </section>
      ) : null}

      {construit && pas >= 2 && construit.info.avertizari.length ? (
        <ul className="termo-avertizari" data-testid="termo-avertizari">
          {construit.info.avertizari.map((cheie) => <li key={cheie}>{tt(cheie as CheieTermo)}</li>)}
        </ul>
      ) : null}

      {eroare ? <p className="logo-eroare" role="alert">{eroare}</p> : null}

      <div className="termo-navigare">
        <button type="button" className="logo-buton" data-testid="termo-inapoi" disabled={pas === 1} onClick={() => setPas((p) => Math.max(1, p - 1) as 1 | 2 | 3 | 4)}>{tt("inapoi")}</button>
        {pas < 4 ? (
          <button type="button" className="logo-buton logo-buton-plin" data-testid="termo-inainte" disabled={!inele || conturez} onClick={() => setPas((p) => Math.min(4, p + 1) as 1 | 2 | 3 | 4)}>{tt("inainte")}</button>
        ) : null}
      </div>
    </div>
  );
}
