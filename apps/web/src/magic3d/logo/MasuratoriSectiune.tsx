"use client";

import { Camera, Printer, ScanLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkplaneShape } from "@/types/layerling";
import { deschideOferta } from "@/magic3d/oferta/OfertaButton";
import { estePeTelefon, incarcaConfigOferta, linkWhatsApp, OFERTA_IMPLICIT, telefonValid, zileText, type OfertaConfig } from "@/magic3d/oferta/oferta";
import { to } from "@/magic3d/oferta/texte";
import { Camp } from "@/magic3d/logo/Camp";
import { DesenPiesa } from "@/magic3d/logo/DesenPiesa";
import { calculeazaPiesa, COTE, MATERIALE, TIPURI_PIESE, valoriImplicite, type Material, type TipPiesa, type ValoriCote } from "@/magic3d/logo/piese";
import { construiestePiesa } from "@/magic3d/logo/pieseConstructie";
import { tl, type CheieLogo } from "@/magic3d/logo/texte";

/*
 * Fila "Din măsurători": tipul piesei, cotele (cu desenul care arata ce inseamna fiecare), materialul.
 * Panoul arata ce iese pe piesa dupa joc, inainte de a o pune pe placa. Pentru o piesa care nu se
 * poate masura, "Nu pot masura" trimite pozele ei pe WhatsApp, ca cerere de scanare 3D: pozele se
 * strang intr-un colaj PNG in browser si urca pe aceeasi cale ca fisierele unei oferte.
 */

export type CreeazaPiesa = (forma: WorkplaneShape, inlocuieste: string | null) => Promise<{ id: string; nume: string }>;

const numar = (valoare: number) => valoare.toLocaleString(undefined, { maximumFractionDigits: 2 });
const MAX_POZE = 4;

/** Pozele intr-un singur PNG, in grila, latura mare a colajului cel mult 2000 px. */
async function colaj(poze: File[]): Promise<Blob> {
  const imagini = await Promise.all(poze.map((poza) => createImageBitmap(poza)));
  const coloane = imagini.length === 1 ? 1 : 2;
  const randuri = Math.ceil(imagini.length / coloane);
  const celula = Math.floor(2000 / Math.max(coloane, randuri));
  const panza = document.createElement("canvas");
  panza.width = celula * coloane;
  panza.height = celula * randuri;
  const context = panza.getContext("2d");
  if (!context) throw new Error("canvas");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, panza.width, panza.height);
  imagini.forEach((imagine, i) => {
    const factor = Math.min(celula / imagine.width, celula / imagine.height);
    const latime = imagine.width * factor;
    const inaltime = imagine.height * factor;
    context.drawImage(imagine, (i % coloane) * celula + (celula - latime) / 2, Math.floor(i / coloane) * celula + (celula - inaltime) / 2, latime, inaltime);
    imagine.close();
  });
  return new Promise((resolve, reject) => panza.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png"));
}

function CerereScanare({ onInapoi }: { onInapoi: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<OfertaConfig>(OFERTA_IMPLICIT);
  const [poze, setPoze] = useState<File[]>([]);
  const [nume, setNume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [oras, setOras] = useState("");
  const [observatii, setObservatii] = useState("");
  const [trimit, setTrimit] = useState(false);
  const [gata, setGata] = useState<{ url: string; link: string; zile: number } | null>(null);
  const [eroare, setEroare] = useState("");
  useEffect(() => {
    void incarcaConfigOferta().then(setConfig);
  }, []);
  const poateTrimite = poze.length > 0 && nume.trim() !== "" && telefonValid(telefon) && !trimit;

  const trimite = async () => {
    setTrimit(true);
    setEroare("");
    try {
      const form = new FormData();
      form.append("fisiere[]", await colaj(poze), "poze.png");
      const raspuns = await fetch(config.uploadUrl, { method: "POST", body: form });
      const answer = (await raspuns.json().catch(() => null)) as { ok?: boolean; link?: string; expiraZile?: number; error?: string } | null;
      if (!raspuns.ok || !answer?.ok || !answer.link) throw new Error(answer?.error === "prea-mare" ? to("prea_mare", { mb: config.maxMbFisier }) : answer?.error ?? `HTTP ${raspuns.status}`);
      const zile = answer.expiraZile ?? config.expirareZile;
      // Mesajul pleaca la atelier, deci e in romana, ca mesajul unei oferte de print.
      const mesaj = [
        `Bună ziua! ${tl("scanareMesaj")}.`,
        "",
        `Nume: ${nume.trim()}`,
        `Telefon: ${telefon.trim()}`,
        oras.trim() ? `Oraș: ${oras.trim()}` : "",
        observatii.trim() ? `Observații: ${observatii.trim()}` : "",
        "",
        `Poze: ${answer.link}`,
        `Linkul expiră în ${zileText(zile)}.`,
      ].filter((rand, i, toate) => rand !== "" || (i > 0 && toate[i - 1] !== "")).join("\n");
      const url = linkWhatsApp(config.whatsapp, mesaj);
      setGata({ url, link: answer.link, zile });
      if (estePeTelefon(navigator.userAgent, navigator.maxTouchPoints)) window.location.href = url;
    } catch (error) {
      setEroare(error instanceof Error ? error.message : String(error));
    } finally {
      setTrimit(false);
    }
  };

  return (
    <section className="logo-sectiune" data-testid="scanare">
      <h3>{tl("scanareTitlu")}</h3>
      <p className="logo-descriere">{tl("scanareText")}</p>
      {gata ? (<>
        <p className="logo-gata" role="status">{tl("scanareGata")}</p>
        <div className="logo-actiuni">
          <a className="logo-buton logo-buton-plin" href={gata.url} target="_blank" rel="noopener noreferrer" data-testid="scanare-whatsapp">{tl("deschideWhatsApp")}</a>
        </div>
        <p className="logo-nota">{to("linkFisiere", { zile: gata.zile })}: {gata.link}</p>
      </>) : (<>
        <button type="button" className="logo-fisier" data-testid="scanare-alege" onClick={() => inputRef.current?.click()}>
          <Camera size={22} aria-hidden="true" />
          <span>
            <strong>{poze.length ? poze.map((poza) => poza.name).join(", ") : tl("scanareAlege")}</strong>
            <small>{tl("scanarePoze")}</small>
          </span>
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-testid="scanare-fisiere" onChange={(event) => {
          const alese = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, MAX_POZE);
          event.target.value = "";
          setPoze(alese);
        }} />
        <div className="logo-optiuni">
          <label className="logo-camp"><span>{to("nume")}</span><input type="text" value={nume} onChange={(e) => setNume(e.target.value)} autoComplete="name" data-testid="scanare-nume" /></label>
          <label className="logo-camp"><span>{to("telefon")}</span><input type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel" data-testid="scanare-telefon" /></label>
          <label className="logo-camp"><span>{to("oras")}</span><input type="text" value={oras} onChange={(e) => setOras(e.target.value)} autoComplete="address-level2" /></label>
          <label className="logo-camp logo-lat"><span>{to("observatii")}</span><textarea rows={2} value={observatii} onChange={(e) => setObservatii(e.target.value)} /></label>
        </div>
        <p className="logo-nota">{to("gdpr", { zile: config.expirareZile, zileText: zileText(config.expirareZile) })}</p>
        <div className="logo-actiuni">
          <button type="button" className="logo-buton logo-buton-plin" data-testid="scanare-trimite" disabled={!poateTrimite} onClick={() => void trimite()}>
            {trimit ? tl("scanareTrimit") : tl("scanareTrimite")}
          </button>
        </div>
      </>)}
      <div className="logo-actiuni">
        <button type="button" className="logo-buton" onClick={onInapoi}>{tl("scanareInapoi")}</button>
      </div>
      {eroare ? <p className="logo-eroare" role="alert">{eroare}</p> : null}
    </section>
  );
}

export function MasuratoriSectiune({ onCreate }: { onCreate: CreeazaPiesa }) {
  const [tip, setTip] = useState<TipPiesa>("bucsa");
  const [valori, setValori] = useState<ValoriCote>(() => valoriImplicite("bucsa"));
  const [material, setMaterial] = useState<Material>("PLA");
  const [inGaura, setInGaura] = useState(false);
  const [activa, setActiva] = useState<string | null>(null);
  const [pus, setPus] = useState<{ id: string; nume: string; tip: TipPiesa } | null>(null);
  const [scanare, setScanare] = useState(false);
  const [eroare, setEroare] = useState("");

  const piesa = useMemo(() => calculeazaPiesa(tip, valori, material, { inGaura }), [tip, valori, material, inGaura]);
  const alegeTip = (nou: TipPiesa) => {
    setTip(nou);
    setValori(valoriImplicite(nou));
    setActiva(null);
  };
  const literaCotei = (cheie: string) => COTE[tip].find((cota) => cota.cheie === cheie)?.litera ?? "";

  const pune = async () => {
    setEroare("");
    try {
      const nume = tl(`piesa_${tip}` as CheieLogo);
      const rezultat = await onCreate(construiestePiesa(piesa, nume), pus?.id ?? null);
      setPus({ ...rezultat, tip });
    } catch (error) {
      setEroare(error instanceof Error && error.message ? error.message : tl("eroareConstructie"));
    }
  };

  if (scanare) return <CerereScanare onInapoi={() => setScanare(false)} />;

  return (
    <>
      <p className="logo-descriere">{tl("masuratoriDescriere")}</p>
      <section className="logo-sectiune">
        <div className="logo-iesiri" role="radiogroup" aria-label={tl("tipPiesa")}>
          {TIPURI_PIESE.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tip === t} data-testid={`piesa-${t}`} className={tip === t ? "activ" : ""} onClick={() => alegeTip(t)}>
              {tl(`piesa_${t}` as CheieLogo)}
            </button>
          ))}
        </div>

        <div className="piese-desen">
          <DesenPiesa tip={tip} activa={activa} />
        </div>

        <div className="logo-optiuni">
          {COTE[tip].map((cota) => (
            <Camp
              key={`${tip}-${cota.cheie}`}
              eticheta={`${cota.litera} · ${tl(`cota_${cota.cheie}` as CheieLogo)}`}
              valoare={valori[cota.cheie] ?? cota.implicit}
              limite={[cota.min, cota.max]}
              onChange={(v) => setValori((curente) => ({ ...curente, [cota.cheie]: v }))}
              onActiv={(activ) => setActiva(activ ? cota.litera : null)}
              testid={`piesa-cota-${cota.cheie}`}
            />
          ))}
          <label className="logo-camp">
            <span>{tl("material")}</span>
            <select data-testid="piesa-material" value={material} onChange={(event) => setMaterial(event.target.value as Material)}>
              {MATERIALE.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          {tip === "bucsa" ? (
            <label className="logo-bifa">
              <input type="checkbox" checked={inGaura} onChange={(event) => setInGaura(event.target.checked)} data-testid="piesa-in-gaura" />
              <span>{tl("inGaura")}</span>
            </label>
          ) : null}
        </div>

        {piesa.masuri.length ? (
          <div className="piese-masuri" data-testid="piesa-masuri">
            <strong>{tl("masuriFinale")}</strong>
            <ul>
              {piesa.masuri.map((m) => (
                <li key={m.cheie}>
                  {tl("masuraLinie", { litera: literaCotei(m.cheie), nume: tl(`cota_${m.cheie}` as CheieLogo), masurat: numar(m.masurat), final: numar(m.final) })}
                  {m.joc !== 0 ? <small> {tl("jocLinie", { joc: `${m.joc > 0 ? "+" : ""}${numar(m.joc)}`, material })}</small> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {piesa.avertizari.map((a) => <p key={a} className="logo-nota relief-avertisment">{tl(`avert_${a}` as CheieLogo)}</p>)}

        <div className="logo-actiuni">
          <button type="button" className="logo-buton logo-buton-plin" data-testid="piesa-adauga" onClick={() => void pune()}>{tl("adauga")}</button>
          {pus ? (
            <button type="button" className="logo-buton" data-testid="piesa-printeaza" onClick={() => deschideOferta({ generator: `${tl("filaMasuratori")} → ${tl(`piesa_${pus.tip}` as CheieLogo)} (${material})`, firma: true })}>
              <Printer size={16} aria-hidden="true" /> {tl("printeaza")}
            </button>
          ) : null}
        </div>
        {pus ? <p className="logo-gata" role="status">{tl("adaugat", { nume: pus.nume })}</p> : null}
        {eroare ? <p className="logo-eroare" role="alert">{eroare}</p> : null}

        <button type="button" className="logo-buton piese-scanare" data-testid="piesa-nu-pot" onClick={() => setScanare(true)}>
          <ScanLine size={16} aria-hidden="true" /> {tl("nuPotMasura")}
        </button>
      </section>
    </>
  );
}
