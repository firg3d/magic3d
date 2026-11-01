"use client";

import { FolderOpen, Search, Upload } from "lucide-react";
import { Fragment, type ChangeEvent } from "react";
import { preload } from "react-dom";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { t } from "@/lib/i18n";
import { LANGUAGE_INFO } from "@/lib/languages";
import { useLanguage } from "@/lib/useLanguage";
import { DESCHIDE_GENERATOARE, deschideGenerator } from "@/magic3d/generatoare/GeneratoareButton";
import { START, tx } from "@/magic3d/start/config";
import { noteazaDeschidePictura, noteazaFisierPictura, noteazaFormaInitiala } from "@/magic3d/start/formaInitiala";
import { PanouImprimanta } from "@/magic3d/start/PanouImprimanta";
import { tst } from "@/magic3d/start/texte";
import { VERSIUNE_MAGIC3D } from "@/magic3d/versiune";
import { inSezonCraciun } from "@/magic3d/apps/craciun/config";
import { tl } from "@/magic3d/logo/texte";

/*
 * Butonul de creare si cardul de import iau textul din catalogul interfetei (dashboard.*), pe care il citeste si ghidul.
 *
 * Sectiunile paginii de start Magic3D (macheta "Pagina de start v2 — atelier"). Nu tin stare proprie:
 * cautarea, crearea, continuarea si importul sunt functiile existente ale paginii, primite ca props.
 * Culorile si fonturile sunt in tema.css; asezarea in start.css.
 */

const ghid = (limba: string) => `/${LANGUAGE_INFO[limba as keyof typeof LANGUAGE_INFO]?.guideDir ?? "guide"}/index.html`;

/** Designul nou se deschide, apoi panoul generatoarelor (pe un generator anume, cand e dat). */
const deschidePanou = (onCreate: () => void, generator?: string) => {
  onCreate();
  window.setTimeout(() => (generator ? deschideGenerator(generator) : window.dispatchEvent(new Event(DESCHIDE_GENERATOARE))), 1200);
};

/** Header: logo, versiunea, navigare, cautare in proiecte, tema, limba, "Proiectele mele", "Deschide editorul". */
export function StartHeader({ query, onQueryChange, onOpenEditor, searchLabel, searchPlaceholder, versiune }: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenEditor: () => void;
  searchLabel: string;
  searchPlaceholder: string;
  versiune: string;
}) {
  const limba = useLanguage();
  // Fonturile paginii (latin, cele mai folosite) pornesc odata cu ea; editorul nu le cere.
  for (const font of ["Archivo-latin", "JetBrainsMono-latin"]) preload(`/magic3d/start/fonts/${font}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <header className="m3d-header">
      <a className="m3d-brand" href="./" aria-label="Magic3D">
        <img src="/assets/magic3d/magic3d-logo.svg" alt="" width={34} height={34} />
        <span className="m3d-brand-nume">Magic3D</span>
        <span className="m3d-versiune-logo" data-testid="start-versiune-magic3d">{VERSIUNE_MAGIC3D}</span>
      </a>
      <span className="m3d-eticheta-versiune" data-testid="start-versiune">v{versiune} · {tst("dePraktik")}</span>
      <nav className="m3d-nav" aria-label="Magic3D">
        {START.navigare.map((item) => (
          <a
            key={item.href}
            href={item.href === "ghid" ? ghid(limba) : item.href}
            {...("extern" in item && item.extern ? { target: "_blank", rel: "noopener" } : {})}
          >
            {tx(item.text, limba)}
          </a>
        ))}
      </nav>
      <div className="m3d-header-actiuni">
        <label className="m3d-cautare">
          <Search size={16} strokeWidth={2.2} aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} placeholder={searchPlaceholder} aria-label={searchLabel} />
        </label>
        <ThemeSwitch />
        <LanguageSwitch />
        <a className="m3d-link-proiecte" href="#proiecte">{tst("proiectele")}</a>
        <button className="m3d-buton m3d-buton-negru" type="button" onClick={onOpenEditor} data-testid="start-deschide-editorul">
          {tst("deschideEditorul")} <span className="m3d-sageata-mono" aria-hidden="true">→</span>
        </button>
      </div>
    </header>
  );
}

/** Hero: titlul, cele doua butoane, cifrele atelierului, continuarea ultimei planse si importul; in dreapta, imprimanta. */
export function StartHero({ onCreate, onContinue, onImport, ultima }: {
  onCreate: () => void;
  onContinue: () => void;
  onImport: () => void;
  ultima: { nume: string; cand: string; poza: string | null } | null;
}) {
  const limba = useLanguage();
  return (
    <section className="m3d-hero">
      <div className="m3d-hero-text m3d-rise">
        <span className="m3d-linie-hero"><span aria-hidden="true" className="m3d-linie-hero-bara" />{tst("linieHero")}</span>
        <h1>
          {tst("titluA")}
          <br />
          {tst("titluB")}
          <br />
          <span className="m3d-contur">{tst("titluContur")}</span> {tst("titluC")}
        </h1>
        <p className="m3d-intro">{tst("intro")}</p>
        <div className="m3d-hero-butoane">
          <button className="m3d-buton m3d-buton-verde m3d-buton-mare" type="button" onClick={onCreate} data-testid="start-incepe">{t("dashboard.createDesign")}</button>
          <a className="m3d-buton m3d-buton-contur m3d-buton-mare" href="#generatoare">{tst("alegeGenerator")}</a>
        </div>
        <dl className="m3d-cifre" aria-label={tst("cifreEticheta")}>
          {START.cifre.map((cifra) => (
            <div key={cifra.valoare}>
              <dt>{tx(cifra.eticheta, limba)}</dt>
              <dd>{cifra.valoare}</dd>
            </div>
          ))}
        </dl>
        <div className="m3d-hero-carduri">
          {ultima ? (
            <button className="m3d-card-actiune" type="button" onClick={onContinue} data-testid="start-continua">
              <span className="m3d-card-actiune-poza">
                {ultima.poza ? <img src={ultima.poza} alt="" /> : <FolderOpen size={20} aria-hidden="true" />}
              </span>
              <span className="m3d-card-actiune-text">
                <strong>{tst("continua")}</strong>
                <span>{ultima.nume} · {ultima.cand}</span>
              </span>
            </button>
          ) : null}
          <button className="m3d-card-actiune m3d-card-import" type="button" onClick={onImport} data-testid="start-importa">
            <span className="m3d-card-actiune-icon"><Upload size={20} aria-hidden="true" /></span>
            <span className="m3d-card-actiune-text">
              <strong>{t("dashboard.importGeometry")}</strong>
              <span>{tst("formate")}</span>
            </span>
          </button>
        </div>
      </div>
      <PanouImprimanta />
    </section>
  );
}

/** Banda neagra care deruleaza: comenzi G-code intre numele generatoarelor (decor, deci ascunsa cititoarelor). */
export function StartBanda() {
  const limba = useLanguage();
  const nume = [...START.generatoare, ...START.craciun.carduri, ...START.personalizate.carduri, ...START.matrite.carduri].map((g) => tx(g.titlu, limba).toUpperCase());
  const elemente = nume.flatMap((n, i) => [{ text: START.gcode[i % START.gcode.length], cod: true }, { text: n, cod: false }]);
  return (
    <div className="m3d-banda-gcode" aria-hidden="true" data-testid="start-banda">
      <div className="m3d-banda-pista">
        {[...elemente, ...elemente].map((e, i) => <span key={i} className={e.cod ? "m3d-cod" : undefined}>{e.text}</span>)}
      </div>
    </div>
  );
}

/** Un rand din catalog: numarul, numele si descrierea, parametrul tehnic, sageata. */
function RandCatalog({ numar, titlu, text, param, testid, onClick }: { numar: number; titlu: string; text: string; param: string; testid: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="m3d-rand" data-testid={testid} onClick={onClick}>
        <span className="m3d-rand-numar">{String(numar).padStart(2, "0")}</span>
        <span className="m3d-rand-nume"><strong>{titlu}</strong><span>{text}</span></span>
        <span className="m3d-rand-param">{param}</span>
        <span className="m3d-rand-sageata" aria-hidden="true">→</span>
      </button>
    </li>
  );
}

/** "01 / Generatoare": catalogul numerotat; fiecare rand deschide editorul cu generatorul lui. */
export function StartGeneratoare({ onCreate }: { onCreate: () => void }) {
  const limba = useLanguage();
  const deschideForma = (forma: string) => {
    noteazaFormaInitiala(forma);
    onCreate();
  };
  let numar = 0;
  return (
    <section className="m3d-sectiune m3d-generatoare" id="generatoare">
      <div className="m3d-sectiune-stanga">
        <span className="m3d-eticheta">{tst("genEticheta")}</span>
        <h2>{tst("genTitlu1")}<br />{tst("genTitlu2")}</h2>
        <p>{tst("genText")}</p>
        <button className="m3d-link-sageata" type="button" data-testid="start-generatoare-magic3d" onClick={() => deschidePanou(onCreate)}>
          {tst("genMagic3d")} <span aria-hidden="true">→</span>
        </button>
      </div>
      <ol className="m3d-catalog">
        {START.generatoare.map((g) => (
          <RandCatalog key={g.forma} numar={++numar} titlu={tx(g.titlu, limba)} text={tx(g.text, limba)} param={g.param} testid={`start-generator-${g.forma}`} onClick={() => deschideForma(g.forma)} />
        ))}
        <RandCatalog numar={++numar} titlu={tl("cardTitlu")} text={tl("cardText")} param="PNG · JPG · SVG" testid="start-logo" onClick={() => deschideForma("magic3dLogo")} />
        {([["craciun", START.craciun], ["personalizat", START.personalizate], ["matrita", START.matrite]] as const).map(([prefix, sectiune]) => (
          <Fragment key={prefix}>
            <li className="m3d-catalog-grup" aria-hidden="true">{tx(sectiune.titlu, limba)}</li>
            {sectiune.carduri.map((card) => (
              <RandCatalog key={card.generator} numar={++numar} titlu={tx(card.titlu, limba)} text={tx(card.text, limba)} param={card.param} testid={`start-${prefix}-${card.generator}`} onClick={() => deschidePanou(onCreate, card.generator)} />
            ))}
          </Fragment>
        ))}
      </ol>
    </section>
  );
}

/** Cardul sezonier "Craciun": doar in perioada din SEZON_CRACIUN, cu generatoarele colectiei. */
export function StartCraciun({ onCreate, azi = new Date() }: { onCreate: () => void; azi?: Date }) {
  const limba = useLanguage();
  if (!inSezonCraciun(azi)) return null;
  return (
    <section className="m3d-sectiune m3d-noutati m3d-craciun" id="craciun" aria-labelledby="m3d-craciun-titlu" data-testid="start-craciun">
      <div className="m3d-noutati-cap">
        <span className="m3d-eticheta">{tst("craciunEticheta")}</span>
        <h2 id="m3d-craciun-titlu">{tst("craciunTitlu")}<span className="m3d-noutati-sub"> · {tst("craciunText")}</span></h2>
      </div>
      <ul className="m3d-noutati-lista">
        {START.craciun.carduri.map((card, i) => (
          <li key={card.generator}>
            <button type="button" data-testid={`start-craciun-card-${card.generator}`} onClick={() => deschidePanou(onCreate, card.generator)}>
              <span className="m3d-noutati-numar">{card.icon} {String(i + 1).padStart(2, "0")}</span>
              <span className="m3d-noutati-titlu">{tx(card.titlu, limba)} <span aria-hidden="true">→</span></span>
              <span className="m3d-noutati-text">{tx(card.text, limba)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Magic3D 2.0 - ce e nou": noutatile versiunii, fiecare cu un link spre locul ei de pe pagina sau din ghid. */
export function StartNoutati() {
  const limba = useLanguage();
  const noutati = [
    { numar: "01", titlu: tst("nouPictura"), text: tst("nouPicturaText"), href: "#pictura", testid: "start-nou-pictura" },
    { numar: "02", titlu: tst("nouGeneratoare"), text: tst("nouGeneratoareText"), href: "#generatoare", testid: "start-nou-generatoare" },
    { numar: "03", titlu: tst("nouOferta"), text: tst("nouOfertaText"), href: "#printare-la-noi", testid: "start-nou-oferta" },
    { numar: "04", titlu: tst("nouGhid"), text: tst("nouGhidText"), href: ghid(limba).replace("index.html", "painting.html"), testid: "start-nou-ghid" },
  ];
  return (
    <section className="m3d-sectiune m3d-noutati" id="noutati" aria-labelledby="m3d-noutati-titlu">
      <div className="m3d-noutati-cap">
        <span className="m3d-eticheta">{tst("nouEticheta")}</span>
        <h2 id="m3d-noutati-titlu">Magic3D {VERSIUNE_MAGIC3D}<span className="m3d-noutati-sub"> · {tst("nouTitlu")}</span></h2>
      </div>
      <ul className="m3d-noutati-lista">
        {noutati.map((n) => (
          <li key={n.testid}>
            <a href={n.href} data-testid={n.testid}>
              <span className="m3d-noutati-numar">{n.numar}</span>
              <span className="m3d-noutati-titlu">{n.titlu} <span aria-hidden="true">→</span></span>
              <span className="m3d-noutati-text">{n.text}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Prezentarea modului Pictura: vaza pictata (randata in Magic3D) si un design nou deschis direct in mod. */
export function StartPictura({ onCreate }: { onCreate: () => void }) {
  const incearca = () => {
    noteazaFormaInitiala("vase");
    noteazaDeschidePictura();
    onCreate();
  };
  // "Coloreaza un model": fisierul ales se importa in designul nou, care se deschide in modul Pictura.
  const coloreaza = (event: ChangeEvent<HTMLInputElement>) => {
    const fisier = event.target.files?.[0];
    event.target.value = "";
    if (!fisier) return;
    noteazaFisierPictura(fisier);
    noteazaDeschidePictura();
    onCreate();
  };
  return (
    <section className="m3d-sectiune m3d-pictura-start" id="pictura">
      <div className="m3d-pictura-start-text">
        <span className="m3d-eticheta">{tst("picturaEticheta")}</span>
        <h2>{tst("picturaTitlu1")}<br />{tst("picturaTitlu2")}</h2>
        <p>{tst("picturaText")}</p>
        <ul className="m3d-pictura-start-puncte">
          <li>{tst("picturaPunct1")}</li>
          <li>{tst("picturaPunct2")}</li>
          <li>{tst("picturaPunct3")}</li>
        </ul>
        <button className="m3d-buton m3d-buton-verde m3d-buton-mare" type="button" data-testid="start-pictura" onClick={incearca}>
          {tst("picturaIncearca")} <span aria-hidden="true">→</span>
        </button>
        <label className="m3d-pictura-start-card" data-testid="start-coloreaza">
          <span className="m3d-pictura-start-card-titlu">{tst("coloreazaTitlu")} <span aria-hidden="true">→</span></span>
          <span className="m3d-pictura-start-card-text">{tst("coloreazaText")}</span>
          <span className="m3d-pictura-start-card-param">STL · 3MF · OBJ</span>
          <input type="file" accept=".stl,.3mf,.obj,model/stl,model/3mf" data-testid="start-coloreaza-fisier" onChange={coloreaza} />
        </label>
      </div>
      <figure className="m3d-pictura-start-imagine">
        <picture>
          <source srcSet="/magic3d/start/pictura-vaza.webp" type="image/webp" />
          <img src="/magic3d/start/pictura-vaza.png" width={337} height={720} alt={tst("picturaImagine")} loading="lazy" decoding="async" />
        </picture>
        <figcaption>{tst("picturaLegenda")}</figcaption>
      </figure>
    </section>
  );
}

/** "02 / N-ai imprimantă?": blocul verde cu cererea de oferta, cei trei pasi si reducerea pentru studenti. */
export function StartPasi() {
  const limba = useLanguage();
  const whatsapp = `https://wa.me/${START.whatsapp}?text=${encodeURIComponent(tx(START.mesajWhatsApp, limba))}`;
  const pasi = [[tst("pas1"), tst("pas1Text")], [tst("pas2"), tst("pas2Text")], [tst("pas3"), tst("pas3Text")]];
  return (
    <section className="m3d-sectiune" id="printare-la-noi">
      <div className="m3d-bloc-verde">
        <div className="m3d-bloc-verde-cap">
          <div>
            <span className="m3d-eticheta">{tst("pasiEticheta")}</span>
            <h2>{tst("pasiTitlu1")}<br />{tst("pasiTitlu2")}</h2>
          </div>
          <a className="m3d-buton m3d-buton-hartie m3d-buton-mare" href={whatsapp} target="_blank" rel="noopener" data-testid="start-whatsapp">{tst("cereOferta")}</a>
        </div>
        <ol className="m3d-pasi">
          {pasi.map(([titlu, text], index) => (
            <li key={titlu}>
              <span className="m3d-pas-eticheta">[{index + 1}] {titlu.toUpperCase()}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
        <p className="m3d-studenti"><strong>{tst("studenti")}</strong> {tst("studentiText")}</p>
      </div>
    </section>
  );
}

/** Lucrari reale din atelier, ca banda de poze cu legenda mono; nu apare deloc pana nu exista macar o poza in config. */
export function StartLucrari() {
  const limba = useLanguage();
  const cuPoza = START.lucrari.filter((lucrare) => lucrare.poza);
  if (cuPoza.length === 0) return null;
  return (
    <section className="m3d-sectiune m3d-lucrari">
      <div className="m3d-sectiune-cap">
        <span className="m3d-eticheta">{tst("lucrariEticheta")}</span>
        <h2>{tst("lucrariTitlu")}</h2>
        <p>{tst("lucrariText")}</p>
      </div>
      <div className="m3d-banda-poze">
        {cuPoza.map((lucrare) => (
          <figure key={lucrare.poza}>
            <img src={lucrare.poza} alt={tx(lucrare.titlu, limba)} loading="lazy" />
            <figcaption><span>{tx(lucrare.eticheta, limba)}</span> {tx(lucrare.titlu, limba)}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Cele doua carduri: scoli (Layerkids Academy) si firme (Praktik3D). */
export function StartCarduri() {
  return (
    <section className="m3d-sectiune m3d-grila-doua">
      <article className="m3d-card-info">
        <span className="m3d-eticheta">{tst("scoliSus")}</span>
        <strong>{tst("scoliTitlu")}</strong>
        <p>{tst("scoliText")}</p>
        <a href={START.scoli.href} target="_blank" rel="noopener">{tst("scoliLink")} <span aria-hidden="true">→</span></a>
      </article>
      <article className="m3d-card-info">
        <span className="m3d-eticheta">{tst("firmeSus")}</span>
        <strong>{tst("firmeTitlu")}</strong>
        <p>{tst("firmeText")}</p>
        <a href={START.firme.href} target="_blank" rel="noopener">{tst("firmeLink")} <span aria-hidden="true">→</span></a>
      </article>
    </section>
  );
}

/** "03 / Proiectele mele": ancora din header si nota despre backup, deasupra listei de proiecte. */
export function StartProiecteCap() {
  return (
    <div id="proiecte" className="m3d-proiecte-cap">
      <span className="m3d-eticheta">{tst("proiecteEticheta")}</span>
      <span className="m3d-nota-mono">{tst("proiecteNota")}</span>
    </div>
  );
}

/** Stratul care apare cand tragi fisiere peste pagina. */
export function StartStratImport() {
  return (
    <div className="m3d-strat-import" aria-hidden="true">
      <div><Upload size={32} /> {tst("elibereaza")}</div>
    </div>
  );
}
