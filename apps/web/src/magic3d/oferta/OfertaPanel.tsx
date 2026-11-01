"use client";

import { Check, ExternalLink, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MovableToolPanel } from "@/components/workplane/MovableToolPanel";
import { DEFAULT_INFILL_PERCENT, DEFAULT_WALLS, printEstimateWithInfill, type PrintMaterial } from "@/lib/printEstimate";
import { qrMatrix, qrPreviewSvg, qrTextFits } from "@/lib/qrCode";
import { getLanguage, LANGUAGE_INFO } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import {
  estePeTelefon,
  formatDimensiuni,
  incarcaConfigOferta,
  LINK_FIRME,
  linkWhatsApp,
  mesajOferta,
  OFERTA_IMPLICIT,
  PRAG_AVERTIZARE_SUBTIRE,
  seIncadreaza,
  telefonValid,
  type DimensiuniMm,
  type OfertaConfig,
  type PeretiSubtiri,
  zileText,
} from "@/magic3d/oferta/oferta";
import { to } from "@/magic3d/oferta/texte";

/** Un serviciu pe care generatorul il ofera in plus (de pilda formarea in atelier): bifa din formular si randul din mesaj. */
export type ServiciuOferta = { id: string; eticheta: string; nota?: string; mesaj: string; bifat?: boolean };

/**
 * De unde vine cererea: generatorul care a facut piesa (scris in mesaj), daca se ofera optiunea
 * pentru firme, detaliile piesei, serviciile in plus si, cand generatorul are un 3MF mai bun decat
 * exportul scenei (placi, setari de print), acel 3MF.
 */
export type ContextOferta = {
  generator?: string;
  firma?: boolean;
  detalii?: string;
  servicii?: ServiciuOferta[];
  threeMf?: Uint8Array;
  /** Cea mai mare piesa, cand piesele se printeaza separat (fiecare pe placa ei): pe ea se verifica incadrarea. */
  piesaMaxima?: DimensiuniMm;
};

/** Ce pregateste editorul pentru o oferta: fisierele si masuratorile piesei. */
export type PachetOferta = {
  threeMf: Uint8Array;
  stl: Uint8Array;
  png: Blob | null;
  dimensiuni: DimensiuniMm;
  volumMm3: number;
  suprafete: { sideMm2: number; flatMm2: number };
  muchiiDeschise: number;
  /** Masoara peretii subtiri sub un prag (mm); pragul vine din configuratie. */
  subtiri: (pragMm: number) => PeretiSubtiri;
  obiecte: number;
  selectie: boolean;
};

const MATERIAL_ESTIMARE: Record<string, PrintMaterial> = { PLA: "pla", PETG: "petg", TPU: "tpu", "ABS/ASA": "abs", ABS: "abs", ASA: "asa" };
const ALTUL = "__altul__";

/** Numerele in felul limbii alese: "2,9" in romana, "2.9" in engleza. */
const numar = (value: number, digits = 1) =>
  value.toLocaleString(LANGUAGE_INFO[getLanguage()].numberLocale, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/**
 * Panoul "Printeaza in Romania - cere oferta" (Praktik3D). Pregateste 3MF + STL + o captura,
 * arata o estimare si verificarile, apoi urca fisierele pe magic3d.ro si deschide WhatsApp cu
 * mesajul gata scris. Datele din formular nu ajung pe server.
 */
export function OfertaPanel({ onClose, pregateste, context }: { onClose: () => void; pregateste: () => Promise<PachetOferta>; context?: ContextOferta | null }) {
  useLanguage();
  const [config, setConfig] = useState<OfertaConfig>(OFERTA_IMPLICIT);
  const [pachet, setPachet] = useState<PachetOferta | null>(null);
  const [eroarePregatire, setEroarePregatire] = useState("");
  const [nume, setNume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [oras, setOras] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [materialAltul, setMaterialAltul] = useState("");
  const [culoare, setCuloare] = useState("");
  const [cantitate, setCantitate] = useState("1");
  const [observatii, setObservatii] = useState("");
  const [student, setStudent] = useState(false);
  const [firma, setFirma] = useState(false);
  const [servicii, setServicii] = useState<Record<string, boolean>>(() => Object.fromEntries((context?.servicii ?? []).map((s) => [s.id, Boolean(s.bifat)])));
  const [trimit, setTrimit] = useState(false);
  const [eroare, setEroare] = useState("");
  const [gata, setGata] = useState<{ url: string; mesaj: string; link: string; zile: number } | null>(null);
  const [copiat, setCopiat] = useState(false);

  // Modelul se pregateste o data, la deschidere: ce era selectat atunci e ce se trimite.
  const pregatesteLaDeschidere = useRef(pregateste);
  useEffect(() => {
    let viu = true;
    void incarcaConfigOferta().then((next) => viu && setConfig(next));
    pregatesteLaDeschidere.current()
      .then((next) => viu && setPachet(next))
      .catch((reason) => viu && setEroarePregatire(to("esecPregatire", { motiv: reason instanceof Error ? reason.message : String(reason) })));
    return () => {
      viu = false;
    };
  }, []);

  const telefonMobil = typeof navigator !== "undefined" && estePeTelefon(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  const materialAles = material === ALTUL ? materialAltul.trim() : material;
  const estimare = useMemo(() => {
    if (!pachet || pachet.volumMm3 <= 0) return null;
    return printEstimateWithInfill(pachet.volumMm3, pachet.suprafete, MATERIAL_ESTIMARE[material] ?? "pla", DEFAULT_INFILL_PERCENT, DEFAULT_WALLS).printed;
  }, [material, pachet]);
  const volumText = formatDimensiuni(config.volumMaxMm, (value) => numar(value, 0));
  const inchis = pachet ? pachet.muchiiDeschise === 0 : false;
  const incape = pachet ? seIncadreaza(context?.piesaMaxima ?? pachet.dimensiuni, config.volumMaxMm) : false;
  const subtiri = useMemo(() => (pachet ? pachet.subtiri(config.peretiMinimMm) : null), [config.peretiMinimMm, pachet]);
  const subtire = subtiri ? subtiri.suprafataSubtire > PRAG_AVERTIZARE_SUBTIRE : false;
  const cantitateNumar = Math.max(1, Math.round(Number(cantitate) || 1));
  const formularOk = nume.trim().length > 1 && telefonValid(telefon) && oras.trim().length > 1 && materialAles.length > 0;
  const poateTrimite = Boolean(pachet) && inchis && incape && formularOk && !trimit;

  const trimite = async () => {
    if (!pachet) return;
    if (!formularOk) {
      setEroare(to("campObligatoriu"));
      return;
    }
    const threeMf = context?.threeMf ?? pachet.threeMf;
    const totalMb = (threeMf.length + pachet.stl.length + (pachet.png?.size ?? 0)) / 1024 / 1024;
    if (Math.max(threeMf.length, pachet.stl.length) / 1024 / 1024 > config.maxMbFisier) {
      setEroare(to("prea_mare", { mb: config.maxMbFisier }));
      return;
    }
    setTrimit(true);
    setEroare("");
    try {
      const form = new FormData();
      form.append("fisiere[]", new Blob([threeMf as BlobPart], { type: "model/3mf" }), "model.3mf");
      form.append("fisiere[]", new Blob([pachet.stl as BlobPart], { type: "model/stl" }), "model.stl");
      if (pachet.png) form.append("fisiere[]", pachet.png, "captura.png");
      const response = await fetch(config.uploadUrl, { method: "POST", body: form });
      const answer = (await response.json().catch(() => null)) as { ok?: boolean; link?: string; expiraZile?: number; error?: string } | null;
      if (!response.ok || !answer?.ok || !answer.link) {
        throw new Error(answer?.error === "prea-mare" ? to("prea_mare", { mb: config.maxMbFisier }) : answer?.error ?? `HTTP ${response.status} · ${numar(totalMb)} MB`);
      }
      const zile = answer.expiraZile ?? config.expirareZile;
      const mesaj = mesajOferta(config.mesaj, {
        nume,
        telefon,
        oras,
        material: materialAles,
        culoare,
        cantitate: cantitateNumar,
        student,
        observatii,
        generator: context?.generator,
        firma: Boolean(context?.firma) && firma,
        detalii: context?.detalii,
        servicii: (context?.servicii ?? []).filter((s) => servicii[s.id]).map((s) => s.mesaj),
        dimensiuni: formatDimensiuni(pachet.dimensiuni, (value) => numar(value)),
        volum: estimare ? `${numar(estimare.volumeCm3)} cm³` : "",
        greutate: estimare ? `≈ ${numar(estimare.grams, 0)} g (${materialAles})` : "",
        link: answer.link,
        zile,
      });
      const url = linkWhatsApp(config.whatsapp, mesaj);
      setGata({ url, mesaj, link: answer.link, zile });
      // Pe telefon WhatsApp se deschide direct; pe calculator arata QR-ul si linkul.
      if (telefonMobil) window.location.href = url;
    } catch (reason) {
      setEroare(to("esecUpload", { motiv: reason instanceof Error ? reason.message : String(reason) }));
    } finally {
      setTrimit(false);
    }
  };

  const qr = useMemo(() => {
    if (!gata || !qrTextFits(gata.url, "L")) return null;
    try {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrPreviewSvg(qrMatrix(gata.url, "L"), true))}`;
    } catch {
      return null;
    }
  }, [gata]);

  const copiaza = async () => {
    if (!gata) return;
    try {
      await navigator.clipboard.writeText(gata.mesaj);
      setCopiat(true);
    } catch {
      setCopiat(false);
    }
  };

  const verificare = (ok: boolean, textOk: string, textNu: string, blocant = true) => (
    <li className={ok ? "oferta-ok" : blocant ? "oferta-nu" : "oferta-atentie"}>
      {ok ? <Check size={16} aria-hidden /> : <TriangleAlert size={16} aria-hidden />}
      <span>{ok ? textOk : textNu}</span>
    </li>
  );

  return (
    <MovableToolPanel className="top-action-panel import-action-panel oferta-panel" ariaLabel={to("titlu")}>
      {(handleProps) => (<>
        <header className="movable" {...handleProps}>
          <div className="top-action-heading">
            <strong>{to("titlu")}</strong>
          </div>
          <div className="panel-header-actions">
            <button type="button" aria-label={to("inchide")} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="top-action-body" onKeyDown={(event) => event.key === "Escape" && onClose()}>
          {!pachet && !eroarePregatire ? <p className="oferta-stare">{to("pregatire")}</p> : null}
          {eroarePregatire ? <p className="oferta-eroare" role="alert">{eroarePregatire}</p> : null}

          {pachet && !gata ? (<>
            <p className="oferta-stare">{pachet.selectie ? to("selectie", { count: pachet.obiecte }) : to("scena")}</p>
            <section className="oferta-sectiune">
              <h3>{to("estimareTitlu")}</h3>
              <dl className="oferta-estimare">
                <dt>{to("dimensiuni")}</dt>
                <dd>{formatDimensiuni(pachet.dimensiuni, (value) => numar(value))}</dd>
                {estimare ? (<>
                  <dt>{to("volum")}</dt>
                  <dd>{numar(estimare.volumeCm3)} cm³</dd>
                  <dt>{to("greutate")}</dt>
                  <dd>≈ {numar(estimare.grams, 0)} g</dd>
                  <dt>{to("filament")}</dt>
                  <dd>≈ {numar(estimare.filamentMeters, 1)} m</dd>
                </>) : null}
              </dl>
              <p className="oferta-nota">{to("estimareNota")}</p>
            </section>

            <section className="oferta-sectiune">
              <h3>{to("verificariTitlu")}</h3>
              <ul className="oferta-verificari">
                {verificare(inchis, to("inchisOk"), to("inchisNu", { count: pachet.muchiiDeschise }))}
                {verificare(incape, to("incapeOk", { volum: volumText }), to("incapeNu", { volum: volumText }))}
                {verificare(
                  !subtire,
                  to("subtireOk", { prag: numar(config.peretiMinimMm) }),
                  to("subtireNu", { prag: numar(config.peretiMinimMm), minim: numar(subtiri?.minimMm ?? 0, 2) }),
                  false,
                )}
              </ul>
            </section>

            <section className="oferta-sectiune">
              <h3>{to("formularTitlu")}</h3>
              <div className="oferta-formular">
                <label><span>{to("nume")}</span><input value={nume} onChange={(event) => setNume(event.target.value)} autoComplete="name" required /></label>
                <label><span>{to("telefon")}</span><input value={telefon} onChange={(event) => setTelefon(event.target.value)} type="tel" autoComplete="tel" required /></label>
                <label><span>{to("oras")}</span><input value={oras} onChange={(event) => setOras(event.target.value)} autoComplete="address-level2" required /></label>
                <label>
                  <span>{to("material")}</span>
                  <select value={material} onChange={(event) => setMaterial(event.target.value)}>
                    {config.materiale.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                    <option value={ALTUL}>{to("altul")}</option>
                  </select>
                </label>
                {material === ALTUL ? (
                  <label><span>{to("materialAltul")}</span><input value={materialAltul} onChange={(event) => setMaterialAltul(event.target.value)} /></label>
                ) : null}
                <label><span>{to("culoare")}</span><input value={culoare} onChange={(event) => setCuloare(event.target.value)} /></label>
                <label><span>{to("cantitate")}</span><input value={cantitate} onChange={(event) => setCantitate(event.target.value.replace(/\D/g, ""))} inputMode="numeric" pattern="[0-9]*" /></label>
                <label className="oferta-lat"><span>{to("observatii")}</span><textarea rows={3} value={observatii} onChange={(event) => setObservatii(event.target.value)} /></label>
                <label className="oferta-lat oferta-student">
                  <input type="checkbox" checked={student} onChange={(event) => setStudent(event.target.checked)} />
                  <span>{to("student")}</span>
                </label>
                <p className="oferta-lat oferta-nota">{to("studentNota")}</p>
                {(context?.servicii ?? []).map((s) => (
                  <div key={s.id} className="oferta-lat">
                    <label className="oferta-student">
                      <input type="checkbox" data-testid={`oferta-serviciu-${s.id}`} checked={Boolean(servicii[s.id])} onChange={(event) => setServicii((v) => ({ ...v, [s.id]: event.target.checked }))} />
                      <span>{s.eticheta}</span>
                    </label>
                    {s.nota ? <p className="oferta-nota">{s.nota}</p> : null}
                  </div>
                ))}
                {context?.firma ? (
                  <label className="oferta-lat oferta-student">
                    <input type="checkbox" data-testid="oferta-firma" checked={firma} onChange={(event) => setFirma(event.target.checked)} />
                    <span>{to("firma")} · <a href={LINK_FIRME} target="_blank" rel="noopener noreferrer" data-testid="oferta-firma-link">{to("firmaLink")}</a></span>
                  </label>
                ) : null}
              </div>
            </section>

            {eroare ? <p className="oferta-eroare" role="alert">{eroare}</p> : null}
            <button type="button" className="oferta-trimite" disabled={!poateTrimite} onClick={() => void trimite()}>
              {trimit ? to("trimitere") : to("trimite")}
            </button>
            <p className="oferta-nota oferta-gdpr">{to("gdpr", { zile: config.expirareZile, zileText: zileText(config.expirareZile) })}</p>
            <p className="oferta-atelier">
              <a href={config.atelierUrl} target="_blank" rel="noopener noreferrer">
                {to("atelier", { nume: config.atelierNume })} <ExternalLink size={13} aria-hidden />
              </a>
            </p>
          </>) : null}

          {gata ? (
            <section className="oferta-sectiune oferta-gata">
              <h3>{to("gataTitlu")}</h3>
              <p>{telefonMobil ? to("gataMobil") : to("gataDesktop")}</p>
              {!telefonMobil && qr ? <img className="oferta-qr" src={qr} alt="" width={220} height={220} /> : null}
              <p className="oferta-actiuni">
                <a className="oferta-trimite" href={gata.url} target="_blank" rel="noopener noreferrer">{to("deschideWhatsApp")}</a>
                <button type="button" onClick={() => void copiaza()}>{copiat ? to("copiat") : to("copiazaMesaj")}</button>
              </p>
              <p className="oferta-nota">
                {to("linkFisiere", { zile: gata.zile, zileText: zileText(gata.zile) })}: <a href={gata.link} target="_blank" rel="noopener noreferrer">{gata.link}</a>
              </p>
              <p className="oferta-atelier">
                <a href={config.atelierUrl} target="_blank" rel="noopener noreferrer">
                  {to("atelier", { nume: config.atelierNume })} <ExternalLink size={13} aria-hidden />
                </a>
              </p>
            </section>
          ) : null}
        </div>
      </>)}
    </MovableToolPanel>
  );
}
